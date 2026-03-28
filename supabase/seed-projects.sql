-- ==========================================================================
-- Seed all projects + outstanding tasks
-- Run this in Supabase SQL Editor
-- ==========================================================================

-- Insert all projects
INSERT INTO public.projects (name, emoji, summary, stage, github_repo, live_url) VALUES
  ('VetRoute', '🗺️', 'Route optimiser for ambulatory vets', 'live', NULL, 'https://vetroute-rouge.vercel.app/'),
  ('Vet Acupoints', '📍', 'Vet acupuncture reference + AI protocol builder', 'live', 'https://github.com/shaanmd/vet-acupoints', 'https://vetacupoint-reference-790720841172.us-west1.run.app/'),
  ('Aus Equine Ready', '🐴', 'Equine first aid and emergency reference app', 'live', NULL, 'https://aus-equine-ready.lovable.app/'),
  ('Equine Nutrition Tracker', '🌾', 'Equine optimal nutrition planning tracker', 'live', NULL, 'https://equinutri-plan.lovable.app/'),
  ('Hoof Harmony Plan', '🪶', '12-week kissing spine rehab programme for horse & rider', 'live', NULL, 'https://hoof-harmony-plan.lovable.app/app/videos'),
  ('SD VetStudio Landing', '🌐', 'Founders profile + project hub site for SD VetStudio', 'building', NULL, 'https://sdvetstudio.com'),
  ('SynAIpse', '🧠', 'AI education platform – core digital product', 'building', NULL, NULL),
  ('6WSD Course Platform', '🎓', '6 Week Skills Development vet course platform + landing site', 'building', NULL, NULL),
  ('HorseMate', '🐎', 'Horse health records + reminders app for AU/NZ owners', 'building', NULL, 'https://myhorsemate.com'),
  ('VetFlow PMS', '🏥', 'AI-native mobile-first PMS for house-call vets', 'exploring', NULL, NULL),
  ('VetAlign Web App', '🦷', 'iPad-optimised equine dentistry charting + ABM treatment tracking', 'exploring', NULL, NULL),
  ('SD VetStudio', '🔬', 'Small animal vet content/education studio, 50/50 with Deb', 'exploring', NULL, 'https://sdvetstudio.com'),
  ('6WSD Certification Programme', '📜', 'Certify vet nurses in rehab; license to practices; NZVA 2026', 'exploring', NULL, NULL),
  ('Jetpackers.ai', '🚀', 'AI tools/education brand', 'exploring', NULL, NULL),
  ('VetRoute v2', '🗺', 'Extended VetRoute: logbook, AI credits, mileage scan, PWA, Google Play', 'exploring', NULL, NULL),
  ('Vet Scribe', '🖊️', 'AI voice transcription + note writing automation for vets', 'exploring', NULL, NULL),
  ('VetScore', '📊', 'Vet scoring app: COAST, pain scoring, lameness scoring, and clinical metrics', 'someday', NULL, NULL),
  ('Project Prioritiser', '🧮', 'Tool to prioritise projects and ideas', 'someday', NULL, NULL),
  ('SD Vet Studio Mission Control', '🏗️', 'Internal ops/dashboard for SD VetStudio', 'building', 'https://github.com/shaanmd/sd-vet-studio-mission-control', 'https://sd-vet-studio-mission-control.vercel.app'),
  ('The Bark Run', '🐶', 'Online trail directory for active dog owners', 'someday', NULL, NULL),
  ('Bitting App', '🐴', 'Bit selection and fitting tool, with Dr Christina Sorenson (Denmark)', 'someday', NULL, NULL),
  ('IVAS Acupuncture Course', '🎓', 'Custom GPT-style companion for IVAS acupuncture course', 'someday', NULL, NULL),
  ('Manual Therapy Video Library', '🎬', 'Technique manual as video library app + spiral-bound print version', 'someday', NULL, NULL),
  ('Rehab Protocols App (Millis)', '💪', 'App based on Millis rehab protocols', 'someday', NULL, NULL),
  ('Post-op Recovery App', '🏥', 'Guide owners through post-operative recovery steps', 'someday', NULL, NULL),
  ('Neuro Exam & Interpretation Tool', '🧠', 'Clinical neuro exam guide + interpretation aid', 'someday', NULL, NULL),
  ('Medication Administration App', '💊', 'Med schedule, warnings (e.g. no NSAIDs with D+), owner notifications', 'someday', NULL, NULL),
  ('AI Body Condition Score', '📸', 'Upload photo → get BCS score for dogs and horses', 'someday', NULL, NULL),
  ('Vet Clinic Handbook', '📘', 'Drug calcs, SOPs, digital knowledge base for locums and new staff', 'someday', NULL, NULL),
  ('Supplement Comparison App', '💊', 'Price comparison (Grocer-style) + evidence/mechanism info resource', 'someday', NULL, NULL),
  ('Pet Food Marketplace', '🍖', 'Centralised dog food marketplace (all providers, Grocer-style)', 'someday', NULL, NULL),
  ('Health Coaching Platform', '🏋', 'Wellness/health coaching platform', 'someday', NULL, NULL),
  ('Equine Research Global Consolidator', '🔬', 'Aggregate and consolidate global equine research', 'someday', NULL, NULL),
  ('Guide to Home Laser Devices', '💡', 'Consumer guide to home laser therapy devices for pets', 'someday', NULL, NULL),
  ('Bodyworker Education', '🤲', 'Train bodyworkers to spot lameness and know when to refer', 'someday', NULL, NULL),
  ('Lead Magnets for Practitioners', '🧲', 'Create and sell lead magnets to other vet practitioners', 'someday', NULL, NULL),
  ('Reusable Web/App Templates', '🧩', 'Sellable web and native app templates', 'someday', NULL, NULL),
  ('How to Vibe Code', '💻', 'PDF + web app teaching GenX to build websites with AI tools', 'someday', NULL, NULL),
  ('Hydro Tracking Tool', '🧊', 'Track hydrotherapy sessions', 'someday', NULL, NULL),
  ('Star Equine Guides', '⭐', 'Equine educational guides content/app', 'someday', NULL, NULL),
  ('The Biomechanical Horse Book', '📖', 'Digital or interactive biomechanical horse book', 'someday', NULL, NULL),
  ('Pet Element', '🥋', 'Pet TCM/element-based tool', 'someday', NULL, NULL),
  ('R+ Positive Canine Training', '🐾', 'Positive reinforcement dog training app', 'someday', NULL, NULL),
  ('Canine CCL Rehab', '🦴', 'Canine CCL rehab reference tool', 'someday', NULL, NULL),
  ('Happy Hound Score', '😊', 'Dog wellness scoring tool', 'someday', NULL, NULL),
  ('Colour My Pony', '🎨', 'Colouring/interactive pony app', 'someday', NULL, NULL),
  ('Competitor Analysis', '🔍', 'Automated competitor research and monitoring', 'inbox', NULL, NULL),
  ('Social Sentiment Analysis', '💡', 'Auto-gather online discussions (e.g. Reddit equine issues)', 'inbox', NULL, NULL),
  ('Symptom Gathering from Discussions', '💬', 'Scrape symptom descriptions from online communities', 'inbox', NULL, NULL),
  ('Electricity Usage Tracker', '⚡', 'Track and analyse electricity usage', 'inbox', NULL, NULL),
  ('Autoclave App Interface', '🩺', 'Interface/app for autoclave monitoring or operation', 'inbox', NULL, NULL),
  ('Prompt Writing App', '✏️', 'Tool to help write effective AI prompts', 'inbox', NULL, NULL),
  ('Literacy App', '📚', 'Literacy-focused learning app', 'inbox', NULL, NULL);


-- ==========================================================================
-- Now insert outstanding tasks for each project
-- ==========================================================================

-- VetRoute
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Build v2 (logbook, AI credits, PWA, Google Play)', 0
FROM public.projects WHERE name = 'VetRoute';

-- Vet Acupoints
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Verify Supabase auth', 0), ('Confirm Claude API live', 1), ('Finalise Vercel deploy', 2)) AS t(title, sort_order)
WHERE p.name = 'Vet Acupoints';

-- Aus Equine Ready
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Review content', 0), ('Decide if expanding or maintaining', 1)) AS t(title, sort_order)
WHERE p.name = 'Aus Equine Ready';

-- Equine Nutrition Tracker
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Review content', 0), ('Decide if expanding or maintaining', 1)) AS t(title, sort_order)
WHERE p.name = 'Equine Nutrition Tracker';

-- Hoof Harmony Plan
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Review content', 0), ('Decide if expanding or maintaining', 1)) AS t(title, sort_order)
WHERE p.name = 'Hoof Harmony Plan';

-- SD VetStudio Landing
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Run /implement', 0), ('Get Deb''s photo + bio + LinkedIn', 1), ('Resend config', 2), ('DNS setup', 3)) AS t(title, sort_order)
WHERE p.name = 'SD VetStudio Landing';

-- SynAIpse
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Complete website', 0), ('Define product tiers', 1)) AS t(title, sort_order)
WHERE p.name = 'SynAIpse';

-- 6WSD Course Platform
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Load course content', 0), ('Launch platform', 1)) AS t(title, sort_order)
WHERE p.name = '6WSD Course Platform';

-- HorseMate
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Create GitHub repo', 0), ('Register domain', 1), ('Set up Stripe + Resend', 2)) AS t(title, sort_order)
WHERE p.name = 'HorseMate';

-- VetFlow PMS
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Create build plan from PRD', 0), ('Validate with Dr Sha + Deb', 1), ('Set IDEXX cancellation target', 2)) AS t(title, sort_order)
WHERE p.name = 'VetFlow PMS';

-- VetAlign Web App
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Clarify if mobile-vet-align or vetalign-merged is active codebase', 0), ('Approve plan', 1), ('Begin build', 2)) AS t(title, sort_order)
WHERE p.name = 'VetAlign Web App';

-- SD VetStudio
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Incorporate NZ company', 0), ('Define revenue model', 1)) AS t(title, sort_order)
WHERE p.name = 'SD VetStudio';

-- 6WSD Certification Programme
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Define curriculum', 0), ('Explore NZVA recognition', 1), ('Map SD VetStudio contribution', 2)) AS t(title, sort_order)
WHERE p.name = '6WSD Certification Programme';

-- Jetpackers.ai
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Define scope + offer', 0), ('Connect to SynAIpse strategy', 1)) AS t(title, sort_order)
WHERE p.name = 'Jetpackers.ai';

-- VetRoute v2
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Prioritise build', 0), ('Set up RevenueCat', 1), ('Register domain', 2)) AS t(title, sort_order)
WHERE p.name = 'VetRoute v2';

-- Vet Scribe
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Decide: standalone or fold into VetFlow PMS', 0), ('Evaluate local LLM option', 1)) AS t(title, sort_order)
WHERE p.name = 'Vet Scribe';

-- VetScore
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Clarify which folder is active (vetscore vs vet-score)', 0), ('Define full feature set', 1), ('Decide: build, archive, or fold into VetFlow PMS', 2)) AS t(title, sort_order)
WHERE p.name = 'VetScore';

-- Project Prioritiser
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Decide: internal tool or sellable product', 0
FROM public.projects WHERE name = 'Project Prioritiser';

-- SD Vet Studio Mission Control
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Clarify scope', 0), ('Decide: build or archive', 1)) AS t(title, sort_order)
WHERE p.name = 'SD Vet Studio Mission Control';

-- The Bark Run
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Define MVP', 0), ('Decide: directory site or app', 1)) AS t(title, sort_order)
WHERE p.name = 'The Bark Run';

-- Bitting App
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Connect with Christina', 0), ('Define scope and collaboration model', 1)) AS t(title, sort_order)
WHERE p.name = 'Bitting App';

-- IVAS Acupuncture Course
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'IVAS Acupuncture Course';

-- Manual Therapy Video Library
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Define format', 0), ('Decide: app, web, or print-first', 1)) AS t(title, sort_order)
WHERE p.name = 'Manual Therapy Video Library';

-- Rehab Protocols App (Millis)
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Rehab Protocols App (Millis)';

-- Post-op Recovery App
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Post-op Recovery App';

-- Neuro Exam & Interpretation Tool
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Neuro Exam & Interpretation Tool';

-- Medication Administration App
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Check Play Store competitors', 0), ('Evaluate & prioritise', 1)) AS t(title, sort_order)
WHERE p.name = 'Medication Administration App';

-- AI Body Condition Score
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'AI Body Condition Score';

-- Vet Clinic Handbook
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Vet Clinic Handbook';

-- Supplement Comparison App
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Supplement Comparison App';

-- Pet Food Marketplace
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Pet Food Marketplace';

-- Health Coaching Platform
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Clarify target audience', 0), ('Evaluate & prioritise', 1)) AS t(title, sort_order)
WHERE p.name = 'Health Coaching Platform';

-- Equine Research Global Consolidator
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Equine Research Global Consolidator';

-- Guide to Home Laser Devices
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Guide to Home Laser Devices';

-- Bodyworker Education
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Define curriculum', 0), ('Possible tie-in with SD VetStudio', 1)) AS t(title, sort_order)
WHERE p.name = 'Bodyworker Education';

-- Lead Magnets for Practitioners
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Define formats and distribution model', 0
FROM public.projects WHERE name = 'Lead Magnets for Practitioners';

-- Reusable Web/App Templates
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Reusable Web/App Templates';

-- How to Vibe Code
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'How to Vibe Code';

-- Hydro Tracking Tool
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Hydro Tracking Tool';

-- Star Equine Guides
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Clarify scope and format', 0
FROM public.projects WHERE name = 'Star Equine Guides';

-- The Biomechanical Horse Book
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Clarify format: ebook, web, or app', 0
FROM public.projects WHERE name = 'The Biomechanical Horse Book';

-- Pet Element
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, t.title, t.sort_order FROM public.projects p,
(VALUES ('Clarify scope', 0), ('Possible merge with Vet Acupoints', 1)) AS t(title, sort_order)
WHERE p.name = 'Pet Element';

-- R+ Positive Canine Training
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'R+ Positive Canine Training';

-- Canine CCL Rehab
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Decide: build, archive, or fold into Pet Align', 0
FROM public.projects WHERE name = 'Canine CCL Rehab';

-- Happy Hound Score
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Decide: build or fold into Pet Align', 0
FROM public.projects WHERE name = 'Happy Hound Score';

-- Colour My Pony
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Clarify scope and target audience', 0
FROM public.projects WHERE name = 'Colour My Pony';

-- Competitor Analysis
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Define scope: which markets?', 0
FROM public.projects WHERE name = 'Competitor Analysis';

-- Social Sentiment Analysis
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Define data sources and use case', 0
FROM public.projects WHERE name = 'Social Sentiment Analysis';

-- Symptom Gathering from Discussions
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Symptom Gathering from Discussions';

-- Electricity Usage Tracker
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Clarify: personal or commercial?', 0
FROM public.projects WHERE name = 'Electricity Usage Tracker';

-- Autoclave App Interface
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Clarify scope and target user', 0
FROM public.projects WHERE name = 'Autoclave App Interface';

-- Prompt Writing App
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Evaluate & prioritise', 0
FROM public.projects WHERE name = 'Prompt Writing App';

-- Literacy App
INSERT INTO public.tasks (project_id, title, sort_order)
SELECT id, 'Clarify target audience and scope', 0
FROM public.projects WHERE name = 'Literacy App';
