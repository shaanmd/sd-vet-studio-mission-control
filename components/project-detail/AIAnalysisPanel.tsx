// components/project-detail/AIAnalysisPanel.tsx
'use client'
import { useState } from 'react'
import type { ProjectAnalysis } from '@/lib/types/database'

interface Props {
  projectId: string
  analysis: ProjectAnalysis | null
  onSave: (data: { income_potential: string; build_difficulty: string; recommendation: string; raw_output: string }) => Promise<void>
}

export default function AIAnalysisPanel({ projectId, analysis, onSave }: Props) {
  const [pasting, setPasting] = useState(false)
  const [raw, setRaw] = useState('')
  const [income, setIncome] = useState(analysis?.income_potential ?? '')
  const [difficulty, setDifficulty] = useState(analysis?.build_difficulty ?? '')
  const [recommendation, setRecommendation] = useState(analysis?.recommendation ?? '')
  const [saving, setSaving] = useState(false)

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
        <a
          href="https://sooper-dooper-project-prioritizer.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 font-medium"
        >
          Run analysis ↗
        </a>
      </div>

      {analysis && !pasting ? (
        <div className="space-y-2 text-sm">
          <div><span className="font-medium text-gray-500 text-xs uppercase">Income potential</span><p className="text-gray-800">{analysis.income_potential}</p></div>
          <div><span className="font-medium text-gray-500 text-xs uppercase">Build difficulty</span><p className="text-gray-800">{analysis.build_difficulty}</p></div>
          <div><span className="font-medium text-gray-500 text-xs uppercase">Recommendation</span><p className="text-gray-800">{analysis.recommendation}</p></div>
          <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
            <span>Last analysed {new Date(analysis.analysed_at).toLocaleDateString('en-AU')}</span>
            <button onClick={() => setPasting(true)} className="text-teal-600 font-medium">Re-analyse →</button>
          </div>
        </div>
      ) : !pasting ? (
        <div className="text-sm text-gray-400 flex flex-col gap-2">
          <p>No analysis yet. Run the prioritizer and paste the results back here.</p>
          <button onClick={() => setPasting(true)} className="self-start text-teal-600 font-medium text-sm">Paste results →</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Income potential</label>
            <input value={income} onChange={e => setIncome(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. High — recurring subscription model" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Build difficulty</label>
            <input value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Medium — 4-6 weeks" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Recommendation</label>
            <input value={recommendation} onChange={e => setRecommendation(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Prioritise — high ROI" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Raw output (optional)</label>
            <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Paste full output from the tool here" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPasting(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
