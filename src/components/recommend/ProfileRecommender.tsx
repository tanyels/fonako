'use client'

import { useState, useEffect } from 'react'
import { SURVEY_QUESTIONS, matchFundsToProfile, type SurveyAnswers } from '@/lib/recommend/profiles'
import type { ProfileResult } from '@/lib/recommend/types'
import { getCachedFundDetails } from '@/lib/api/fundDetailsCache'
import { getAllFundReturns } from '@/lib/api/supabase'
import { TefasToggle } from '@/components/ui/TefasToggle'

const PROFILE_ICONS: Record<string, string> = {
  'Muhafazakar': '🛡️',
  'Dengeli': '⚖️',
  'Büyüme': '📈',
  'Enflasyon Koruması': '🔒',
  'Agresif': '🚀',
}

const PROFILE_COLORS: Record<string, string> = {
  'Muhafazakar': 'border-blue-300 bg-blue-50',
  'Dengeli': 'border-slate-300 bg-slate-50',
  'Büyüme': 'border-emerald-300 bg-emerald-50',
  'Enflasyon Koruması': 'border-amber-300 bg-amber-50',
  'Agresif': 'border-red-300 bg-red-50',
}

export function ProfileRecommender() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<SurveyAnswers>>({})
  const [result, setResult] = useState<ProfileResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const isComplete = Object.keys(answers).length === 5

  const handleAnswer = (key: string, value: 1 | 2 | 3) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    if (step < SURVEY_QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 300)
    }
  }

  const analyzeProfile = async () => {
    if (!isComplete) return
    setLoading(true)

    try {
      const [detailMap, returns] = await Promise.all([
        getCachedFundDetails(),
        getAllFundReturns(),
      ])

      const details = Array.from(detailMap.values())
      const output = matchFundsToProfile(answers as SurveyAnswers, details, returns)
      setResult(output)
      setShowResult(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(0)
    setAnswers({})
    setResult(null)
    setShowResult(false)
  }

  // Show result page
  if (showResult && result) {
    return (
      <div className="space-y-6">
        {/* Profile Card */}
        <div className={`border-2 rounded-xl p-8 text-center ${PROFILE_COLORS[result.profileName] ?? 'border-slate-300 bg-slate-50'}`}>
          <p className="text-5xl mb-3">{PROFILE_ICONS[result.profileName] ?? '📊'}</p>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{result.profileName} Profil</h2>
          <p className="text-slate-600 max-w-lg mx-auto">{result.profileDescription}</p>
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            {Object.entries(result.rules).map(([key, val]) => (
              <span key={key} className="px-3 py-1 bg-white rounded-full text-sm font-medium text-slate-700 border border-slate-200">
                {key}: {val}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-3">Toplam Puan: {result.score}/15</p>
        </div>

        {/* Recommended Funds */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Profilinize Uygun Fonlar</h3>
            <TefasToggle />
          </div>
          {result.matchedFunds.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">#</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Fon</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Kategori</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-slate-600">USD Getiri (1Y)</th>
                </tr>
              </thead>
              <tbody>
                {result.matchedFunds.map((f, i) => (
                  <tr key={f.code} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-500 font-semibold">{i + 1}</td>
                    <td className="px-4 py-2">
                      <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                      <p className="text-xs text-slate-500">{f.code}</p>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{f.category}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-sm font-semibold ${f.returnUsd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {f.returnUsd >= 0 ? '+' : ''}{f.returnUsd.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Profilinize uygun fon verisi bulunamadı. Veri tabanı güncellenince tekrar deneyin.
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition font-medium"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  // Survey UI
  const currentQ = SURVEY_QUESTIONS[step]

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-2">
        {SURVEY_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all ${
              i < step ? 'bg-emerald-500' : i === step ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      <div className="text-sm text-slate-500 text-center">
        Soru {step + 1} / {SURVEY_QUESTIONS.length}
      </div>

      {/* Question Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-6">{currentQ.question}</h2>
        <div className="grid gap-3 max-w-md mx-auto">
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentQ.key] === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => handleAnswer(currentQ.key, opt.value)}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  isSelected
                    ? 'border-slate-800 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <p className="font-semibold text-slate-800">{opt.label}</p>
                <p className="text-sm text-slate-500 mt-0.5">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-30 transition font-medium"
        >
          Geri
        </button>

        {step < SURVEY_QUESTIONS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!answers[currentQ.key]}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 transition font-medium"
          >
            İleri
          </button>
        ) : (
          <button
            onClick={analyzeProfile}
            disabled={!isComplete || loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-30 transition font-medium"
          >
            {loading ? 'Analiz Ediliyor...' : 'Profilimi Belirle'}
          </button>
        )}
      </div>
    </div>
  )
}
