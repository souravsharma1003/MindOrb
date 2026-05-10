/**
 * sentiment.diagnostics.js
 * ─────────────────────────────────────────────────────────────────
 * Drop this anywhere in your app and call checkSentimentModel()
 * after your app boots to verify everything is working.
 *
 * Usage (in your main app file or a debug panel):
 *
 *   import { checkSentimentModel } from './sentiment.diagnostics'
 *   checkSentimentModel()   // logs a full report to console
 *
 * Or in browser console after your bundle loads:
 *   window.__sentimentDiag()
 */

import {
  loadModel,
  classifyWord,
  classifyEmotion,
  getModelStatus,
  runDiagnostics,
} from './sentiment'

// ─────────────────────────────────────────────────────────────────
// Console report — pretty-prints everything
// ─────────────────────────────────────────────────────────────────

export async function checkSentimentModel() {
  console.group('🔍 MindOrb — Sentiment Model Diagnostics')

  // 1. Load
  console.log('⏳ Loading model...')
  const loadResult = await loadModel()
  console.log('✅ Model loaded:', loadResult)

  // 2. Status
  const status = getModelStatus()
  console.group('📊 Model Status')
  console.table({
    backend:   status.backend,
    loaded:    status.loaded,
    accuracy:  `${(status.accuracy * 100).toFixed(1)}%`,
    trainedOn: `${status.trainedOn} words`,
    error:     status.error ?? 'none',
  })
  console.groupEnd()

  // 3. Run full diagnostic suite
  console.log('🧪 Running test suite...')
  const report = await runDiagnostics()

  console.group(`📋 Test Results — ${report.score} (${report.status})`)
  const tableData = report.tests.reduce((acc, t) => {
    acc[t.word] = {
      '✓/✗':               t.pass ? '✅' : '❌',
      'exp sentiment':      t.expectedSentiment,
      'got sentiment':      t.gotSentiment,
      'sentiment ✓':        t.sentimentPass ? '✅' : '❌',
      'exp emotion':        t.expectedEmotion,
      'got emotion':        t.gotEmotion,
      'emotion ✓':          t.emotionPass ? '✅' : '❌',
      'score':              t.sentimentScore,
      'confidence':         `${(t.confidence * 100).toFixed(1)}%`,
    }
    return acc
  }, {})
  console.table(tableData)
  console.groupEnd()

  // 4. Memory
  console.group('💾 Memory')
  console.table({
    heapMB:    report.memoryMB,
    tensors:   report.numTensors,
  })
  console.groupEnd()

  // 5. Quick smoke test
  console.group('🚀 Live Smoke Test')
  const smokeWords = ['happy', 'sad', 'angry', 'love', 'terrible', 'xyzunknown']
  for (const w of smokeWords) {
    const r = await classifyWord(w)
    console.log(
      `  "${w}" → ${r.sentiment} (${r.sentimentScore > 0 ? '+' : ''}${r.sentimentScore}) | ${r.emotion} [${r.emotionIntensity}] | conf: ${(r.confidence*100).toFixed(1)}%`
    )
  }
  console.groupEnd()

  // 6. Final verdict
  const icon = report.status === 'PASS' ? '✅' : report.status === 'WARN' ? '⚠️' : '❌'
  console.log(`\n${icon} Overall: ${report.status} — ${report.score} tests passed, training accuracy ${report.accuracy}%, backend: ${report.backend}`)

  console.groupEnd()

  return report
}

// Expose to browser console for quick debugging
if (typeof window !== 'undefined') {
  window.__sentimentDiag = checkSentimentModel
}

// ─────────────────────────────────────────────────────────────────
// React hook — use in any component to show live status
// ─────────────────────────────────────────────────────────────────

/**
 * Usage:
 *   const { status, report, loading } = useSentimentDiagnostics()
 *
 *   if (loading) return <p>Running diagnostics...</p>
 *   return <p>{report.status} — {report.score}</p>
 */
export function useSentimentDiagnostics() {
  // This is a plain function returning a hook — import React in your component
  // Paste this into a .jsx file if you want the hook behaviour:
  /*
  import { useState, useEffect } from 'react'

  const [loading, setLoading] = useState(true)
  const [report, setReport]   = useState(null)
  const [status, setStatus]   = useState('loading')

  useEffect(() => {
    runDiagnostics()
      .then(r => {
        setReport(r)
        setStatus(r.status)
        setLoading(false)
      })
      .catch(err => {
        setStatus('ERROR')
        setLoading(false)
      })
  }, [])

  return { loading, report, status }
  */
}

// ─────────────────────────────────────────────────────────────────
// Minimal status badge helper (for your existing MindOrb header)
// ─────────────────────────────────────────────────────────────────

/**
 * Returns a simple status string for your "Model ready" indicator.
 *
 * Usage:
 *   const label = await getStatusLabel()
 *   // "Model ready · WebGL · 94.2% acc"
 *   // "Model ready · CPU · 91.0% acc"
 *   // "Model error: <message>"
 */
export async function getStatusLabel() {
  try {
    await loadModel()
    const s = getModelStatus()
    return `Model ready · ${s.backend?.toUpperCase()} · ${(s.accuracy * 100).toFixed(1)}% acc`
  } catch (err) {
    return `Model error: ${err.message}`
  }
}

// ─────────────────────────────────────────────────────────────────
// Expected console output reference
// ─────────────────────────────────────────────────────────────────
//
// 🔍 MindOrb — Sentiment Model Diagnostics
//   ⏳ Loading model...
//   ✅ Model loaded: { backend: 'webgl', accuracy: 0.94, trainedOn: 187 }
//
//   📊 Model Status
//   ┌──────────┬─────────────┐
//   │ backend  │ webgl       │
//   │ loaded   │ true        │
//   │ accuracy │ 94.2%       │
//   │ trainedOn│ 187 words   │
//   │ error    │ none        │
//   └──────────┴─────────────┘
//
//   📋 Test Results — 13/14 (PASS)
//   ┌───────────┬──────┬────────────────┬─────────────────┬──────────────┬────────────┐
//   │ (word)    │  ✓/✗ │ exp sentiment  │ got sentiment   │ exp emotion  │ got emotion│
//   ├───────────┼──────┼────────────────┼─────────────────┼──────────────┼────────────┤
//   │ happy     │  ✅  │ positive       │ positive        │ joy          │ joy        │
//   │ sad       │  ✅  │ negative       │ negative        │ sadness      │ sadness    │
//   │ neutral   │  ✅  │ neutral        │ neutral         │ neutral      │ neutral    │
//   └───────────┴──────┴────────────────┴─────────────────┴──────────────┴────────────┘
//
//   💾 Memory
//   ┌─────────┬───────┐
//   │ heapMB  │ 1.24  │
//   │ tensors │ 14    │
//   └─────────┴───────┘
//
//   🚀 Live Smoke Test
//     "happy"      → positive (+0.9123) | joy [1]      | conf: 91.2%
//     "sad"        → negative (-0.8901) | sadness [1]  | conf: 89.0%
//     "angry"      → negative (-0.8654) | anger [1]    | conf: 86.5%
//     "love"       → positive (+0.9341) | joy [1]      | conf: 93.4%
//     "terrible"   → negative (-0.8812) | disgust [1]  | conf: 88.1%
//     "xyzunknown" → neutral  (+0.0421) | neutral [0]  | conf: 74.3%
//
// ✅ Overall: PASS — 13/14 tests passed, training accuracy 94.2%, backend: webgl