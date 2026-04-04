'use client'
import { useState } from 'react'
import type { ProjectAnalysis } from '@/lib/types/database'

interface Props {
  projectId: string
  projectName: string
  projectStage: string
  projectSummary: string | null
  projectRevenueScore: string
  pendingTasks: { title: string; completed: boolean }[]
  analysis: ProjectAnalysis | null
  onSave: (data: {
    income_potential: string
    build_difficulty: string
    recommendation: string
    raw_output: string
  }) => Promise<void>
}

export default function AIAnalysisPanel({
  projectId,
  projectName,
  projectStage,
  projectSummary,
  projectRevenueScore,
  pendingTasks,
  analysis,
  onSave,
}: Props) {
  const [pasting, setPasting] = useState(false)
  const [raw, setRaw] = useState('')
  const [income, setIncome] = useState(analysis?.income_potential ?? '')
  const [difficulty, setDifficulty] = useState(analysis?.build_difficulty ?? '')
  const [recommendation, setRecommendation] = useState(analysis?.recommendation ?? '')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            name: projectName,
            stage: projectStage,
            summary: projectSummary,
            revenue_score: projectRevenueScore,
          },
          tasks: pendingTasks,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRecommendation(data.task ?? '')
      setIncome(
        projectRevenueScore === 'high'
          ? 'High — strong revenue potential'
          : projectRevenueScore === 'medium'
          ? 'Medium — moderate revenue potential'
          : 'Low — early stage',
      )
      setDifficulty(`Energy: ${data.energy ?? 'medium'}`)
      setRaw(JSON.stringify(data, null, 2))
      setPasting(true)
    } catch {
      setAiError('AI generation failed. You can still paste results manually.')
      setPasting(true)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ income_potential: income, build_difficulty: difficulty, recommendation, raw_output: raw })
    setSaving(false)
    setPasting(false)
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">🎯 AI Project Analysis</h3>
        {!pasting && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs bg-teal-700 text-white px-2.5 py-1 rounded-lg font-medium disabled:opacity-50"
            >
              {generating ? 'Generating…' : '✨ Generate with AI'}
            </button>
            <a
              href="https://sooper-dooper-project-prioritizer.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600 font-medium"
            >
              Manual ↗
            </a>
          </div>
        )}
      </div>

      {aiError && <p className="text-xs text-red-500 mb-2">{aiError}</p>}

      {analysis && !pasting ? (
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase">Income potential</span>
            <p className="text-gray-800">{analysis.income_potential}</p>
          </div>
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase">Build difficulty</span>
            <p className="text-gray-800">{analysis.build_difficulty}</p>
          </div>
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase">Recommendation</span>
            <p className="text-gray-800">{analysis.recommendation}</p>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
            <span>Last analysed {new Date(analysis.analysed_at).toLocaleDateString('en-AU')}</span>
            <button onClick={() => setPasting(true)} className="text-teal-600 font-medium">
              Re-analyse →
            </button>
          </div>
        </div>
      ) : !pasting ? (
        <div className="text-sm text-gray-400 flex flex-col gap-2">
          <p>No analysis yet. Generate with AI or run the prioritizer and paste results.</p>
          <button onClick={() => setPasting(true)} className="self-start text-teal-600 font-medium text-sm">
            Paste results →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Income potential</label>
            <input
              value={income}
              onChange={e => setIncome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. High — recurring subscription model"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Build difficulty</label>
            <input
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Medium — 4-6 weeks"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Recommendation</label>
            <input
              value={recommendation}
              onChange={e => setRecommendation(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Prioritise — high ROI"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Raw output (optional)</label>
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Paste full output from the tool here"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPasting(false)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
