# AI Quick Capture — Command Box (Home Page)

**Date:** 2026-06-14
**Status:** Approved (design)

## Summary

A free-text "Quick capture" box on the home page that turns natural language into
structured actions using Claude tool-use. Version 1 supports two actions:

1. **Create task(s)** — from free text. Claude decides project vs personal:
   if a project is named, it creates a project task on that project; otherwise a
   personal next-step task.
2. **Generate a project summary** — Claude writes a summary for a named project
   from *both* the project's existing data (tasks/notes/links/stage) and any
   extra notes the user types, then saves it to the project's `summary` field.

Interaction model: **preview-then-confirm, with undo after apply.**

This box is separate from the existing Scratchpad (Scratchpad = passive notes;
Command Box = actions).

## Non-goals (v1)

- Editing/creating leads, contacts (clients), or projects directly via the box.
  (The original ask was broader; scope was narrowed to tasks + project summary.)
- Deleting records via free text.
- Energy auto-tagging (a separate AI route already exists; not wired in here).

These can be added later — each is just another tool definition.

## Architecture

Three small API routes plus one client component, following the existing
`app/api/ai/*` pattern (direct `@anthropic-ai/sdk`, model `claude-sonnet-4-6`,
`ANTHROPIC_API_KEY`, server Supabase client for auth/RLS).

```
components/home/CommandBox.tsx      ← client UI: input, preview cards, confirm, undo
app/api/ai/command/route.ts         ← INTERPRET: text → resolved proposed actions
app/api/ai/command/apply/route.ts   ← APPLY: write actions, return undo receipt
app/api/ai/command/undo/route.ts    ← UNDO: reverse using the receipt
lib/ai.ts                            ← tool defs, prompts, pure parse/validate helpers
```

### Lifecycle

```
type text
  → POST /api/ai/command            (interpret)        → proposed actions (nothing written)
  → render preview cards
  → Confirm
  → POST /api/ai/command/apply       (write)            → results + undo receipt
  → "Done ✓ · Undo" line
  → (optional) Undo
  → POST /api/ai/command/undo        (reverse)          → refresh
```

## Phase 1 — Interpret (`POST /api/ai/command`)

Request: `{ text: string }`

1. Authenticate via server Supabase client (`getUser`); 401 if absent.
2. Load lightweight project context: `getProjects()` → `[{ id, name, stage }]`,
   injected into the prompt so Claude can resolve project references to ids.
3. Call Claude with two tools:
   - `create_task`
     - `title: string` (required)
     - `project_id: string | null` — set when a project is named, else null.
     - May be emitted multiple times for multiple tasks.
   - `generate_project_summary`
     - `project_id: string` (required, from the provided list)
     - `extra_notes: string | null` — any extra context the user typed.
4. For each `create_task` tool call → build a proposed action directly.
5. For each `generate_project_summary` tool call:
   - Fetch the project via `getProject(project_id)` (tasks, notes, links, stage).
   - Make a **second** Claude call to write the summary from project data +
     `extra_notes`.
   - Build a proposed action carrying the generated text.
6. Return `{ actions: ProposedAction[] }`. **Nothing is written.**

If Claude returns no tool call → return `{ actions: [], message: "..." }` so the
UI can show a gentle "not sure what to do — try rephrasing" with examples.

### ProposedAction shape

```ts
type ProposedAction =
  | { kind: 'create_task'; target: 'personal' | 'project';
      project_id: string | null; project_name: string | null; title: string }
  | { kind: 'update_summary'; project_id: string; project_name: string;
      summary: string }
```

`target` is derived in the route: `project_id` present → `'project'`, else
`'personal'`.

## Phase 2 — Apply (`POST /api/ai/command/apply`)

Request: `{ actions: ProposedAction[] }`

1. Authenticate.
2. For each action, re-validate then write with the **server** Supabase client
   (mirrors logic in `lib/mutations/*` but server-side for auth/RLS):
   - `create_task` + `target: 'personal'` → insert into `personal_tasks`
     (`title`, `owner_id = user.id`, `project_id = null`).
   - `create_task` + `target: 'project'` → verify `project_id` exists, insert into
     `tasks` (`project_id`, `title`).
   - `update_summary` → **read current `summary` first** (for undo), then update
     `projects.summary` (+ `updated_by = user.id`).
3. Validation: title non-empty; referenced `project_id` exists. Invalid action →
   recorded as failed, others still applied (per-action isolation).
4. Return `{ results: ApplyResult[] }` where each result carries an **undo entry**:

```ts
type UndoEntry =
  | { kind: 'delete_row'; table: 'personal_tasks' | 'tasks'; id: string }
  | { kind: 'restore_summary'; project_id: string; prev_summary: string | null }

type ApplyResult =
  | { ok: true; label: string; undo: UndoEntry }
  | { ok: false; label: string; error: string }
```

## Phase 3 — Undo (`POST /api/ai/command/undo`)

Request: `{ undo: UndoEntry[] }`

1. Authenticate.
2. For each entry:
   - `delete_row` → delete by id from the given table.
   - `restore_summary` → set `projects.summary = prev_summary`.
3. Return `{ ok: true }` (per-entry errors collected and reported).

## UI — `components/home/CommandBox.tsx`

- Client component placed near the top of the home page (above or beside the
  Scratchpad). Input/textarea + submit (Enter).
- States: `idle → interpreting → preview → applying → done(undo) | error`.
- **Preview:** one card per proposed action.
  - Task: "✅ New {personal|project} task: *{title}*" (+ project name if project).
  - Summary: "📝 Update summary for *{project}*:" with the generated text shown.
  - Buttons: **Confirm**, **Cancel** (back to idle, keep text for editing).
- **Done:** collapses to "Done ✓ · **Undo**" — persists until dismissed (no
  auto-disappear; friendlier for ADHD). Undo reverses and clears.
- **Error / no-action:** inline gentle message with example phrasings.
- On successful apply/undo, refresh affected home data (`router.refresh()`).

## lib/ai.ts additions

Pure, unit-testable helpers (no network/db), following existing `lib/ai` style:

- `COMMAND_SYSTEM` — system prompt describing the two tools and the
  project-vs-personal rule.
- `COMMAND_TOOLS` — Anthropic tool definitions for `create_task` and
  `generate_project_summary`.
- `SUMMARY_SYSTEM` / `buildSummaryPrompt(project, extraNotes)` — for the second
  (summary-writing) call.
- `toProposedActions(toolUses, projectsById)` — maps Claude tool_use blocks to
  `ProposedAction[]` (deriving `target`).
- `validateAction(action, projectIds)` — returns ok/error for the apply step.

## Error handling

- Unauthenticated → 401 on every route.
- Ambiguous text (no tool call) → empty actions + friendly message, no error.
- Apply/undo are per-action/per-entry: one failure does not block the rest;
  failures surface in the UI.
- No partial silent writes: each card reflects exactly one DB operation.

## Testing

Vitest unit tests (matching existing `lib/ai` tests), no network:

- `toProposedActions`: project named → `target: 'project'` + correct id; no
  project → `target: 'personal'`; multiple `create_task` blocks → multiple
  actions; `generate_project_summary` → `update_summary` action.
- `validateAction`: empty title rejected; unknown `project_id` rejected; valid
  actions accepted.
- Undo-entry construction: create → `delete_row`; summary update →
  `restore_summary` with captured `prev_summary`.
```
