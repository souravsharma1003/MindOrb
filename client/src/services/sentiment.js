import { pipeline, env } from "@huggingface/transformers"

// ── Transformers.js config ────────────────────────────────────
env.allowLocalModels = false
env.useBrowserCache  = true
env.backends.onnx.wasm.numThreads = crossOriginIsolated ? 4 : 1
env.remoteHeaders = {
  Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`
}

// ── Model state ───────────────────────────────────────────────
let sentimentPipeline = null
let emotionPipeline   = null
let loadingPromise    = null

export let modelStatus  = 'idle'
export let modelBackend = 'wasm-onnx'

const listeners = new Set()
export const onModelStatusChange = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function notify() {
  listeners.forEach(cb => cb({ status: modelStatus, backend: modelBackend }))
}

// ── Load both pipelines ───────────────────────────────────────
export const loadModel = async () => {
  if (sentimentPipeline && emotionPipeline) return true
  if (loadingPromise) return loadingPromise

  modelStatus = 'loading'
  notify()

  loadingPromise = (async () => {
    try {
      // ── Sentiment pipeline ──────────────────────────────
      console.log('Loading sentiment model (twitter-roberta)...')
      try {
        sentimentPipeline = await pipeline(
          'sentiment-analysis',
          'Xenova/twitter-roberta-base-sentiment-latest',
          { quantized: true }
        )
        console.log('Sentiment: twitter-roberta-base-sentiment-latest')
      } catch (e) {
        console.warn('Primary sentiment model failed, loading fallback...', e.message)
        sentimentPipeline = await pipeline(
          'sentiment-analysis',
          'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
          { quantized: true }
        )
        console.log('Sentiment: distilbert-base-uncased-finetuned-sst-2-english (fallback)')
      }

      // ── Emotion pipeline ────────────────────────────────
      console.log('Loading emotion model (roberta-go_emotions)...')
      try {
        emotionPipeline = await pipeline(
          'text-classification',
          'SamLowe/roberta-base-go_emotions-onnx',
          { quantized: true }
        )
        console.log('Emotion: roberta-base-go_emotions (28 categories)')
      } catch (e) {
        console.warn('Emotion model failed:', e.message)
        // emotionPipeline stays null — handled gracefully below
      }

      modelStatus = 'ready'
      notify()
      return true

    } catch (err) {
      console.error('Model loading failed:', err)
      loadingPromise = null  // reset so caller can retry
      modelStatus = 'error'
      notify()
      throw err
    }
  })()

  return loadingPromise
}

// ── Test model ────────────────────────────────────────────────
export const testModel = async () => {
  if (!sentimentPipeline) return null
  try {
    const [sentTest, emoTest] = await Promise.all([
      sentimentPipeline('I feel wonderful today'),
      emotionPipeline?.('I feel wonderful today'),
    ])
    console.log('Sentiment test:', sentTest)
    console.log('Emotion test:', emoTest)
    return { sentiment: sentTest, emotion: emoTest, backend: modelBackend }
  } catch (err) {
    console.error('Model test failed:', err)
    return null
  }
}

// ── No-op stubs — keep API compatible with rest of app ────────
export const initClassifier = async () => true

// Reflects actual model state instead of hardcoded true
export const classifierReady = () => modelStatus === 'ready'

// ── GoEmotions 28 → Plutchik 8 mapping ───────────────────────
const GO_EMOTIONS_MAP = {
  // Joy cluster
  joy:            'joy',
  amusement:      'joy',
  excitement:     'joy',
  gratitude:      'joy',
  love:           'joy',
  admiration:     'joy',
  approval:       'joy',
  pride:          'joy',
  relief:         'joy',

  // Anticipation cluster
  optimism:       'anticipation',
  curiosity:      'anticipation',

  // Trust cluster
  caring:         'trust',
  desire:         'trust',

  // Fear cluster
  fear:           'fear',
  nervousness:    'fear',

  // Surprise cluster
  surprise:       'surprise',
  realization:    'surprise',
  confusion:      'surprise',

  // Sadness cluster
  sadness:        'sadness',
  disappointment: 'sadness',
  grief:          'sadness',
  remorse:        'sadness',
  embarrassment:  'sadness',

  // Disgust cluster
  disgust:        'disgust',

  // Anger cluster
  anger:          'anger',
  annoyance:      'anger',
  disapproval:    'anger',

  // Neutral
  neutral:        'neutral',
}

// ── Twitter-roberta / distilbert label map ────────────────────
// twitter-roberta: LABEL_0=negative, LABEL_1=neutral, LABEL_2=positive
// distilbert SST-2: negative, positive (no neutral label)
const ROBERTA_LABEL_MAP = {
  label_0:  -1,   // twitter-roberta negative
  label_1:   0,   // twitter-roberta neutral
  label_2:   1,   // twitter-roberta positive
  negative:  -1,  // distilbert / plain label
  neutral:    0,
  positive:   1,
}

function toSentimentScore(label, confidence) {
  const normalized = label?.toLowerCase().replace(/\s/g, '_')
  const direction  = ROBERTA_LABEL_MAP[normalized] ?? 0

  if (direction ===  1) return  parseFloat(confidence.toFixed(3))
  if (direction === -1) return -parseFloat(confidence.toFixed(3))

  // Neutral returns 0
  return 0
}

function normalizeGoEmotion(label) {
  return GO_EMOTIONS_MAP[label?.toLowerCase()] || 'neutral'
}

// ── Single-word context wrapper ───────────────────────────────
// Sentiment and emotion models are trained on sentences, not isolated words.
// Wrapping single words in "I feel ..." gives the model the context it needs.
// e.g. "furious" alone → neutral(0.56), "I feel furious" → negative(0.89)
function toModelInput(text) {
  return text.includes(' ') ? text : `I feel ${text}`
}

// ── Emotion tiebreaker ────────────────────────────────────────
// When sentiment model returns neutral but emotion model is highly confident,
// we use a safe subset of emotions to nudge the sentiment score.
//
// SAFE to nudge: joy, trust (clearly positive) | sadness, anger, disgust, fear (clearly negative)
// NOT used:      surprise, anticipation — too ambiguous directionally
//                e.g. "surprise" covers both "astonished (good)" and "shocked (bad)"
//                     "anticipation" covers both "excited" and "anxious"
//
// Threshold: 0.78 — only act when emotion model is highly confident.
// Nudge magnitude: 0.25 × intensity — soft signal, never overrides strong sentiment.

const TIEBREAKER_POSITIVE = new Set(['joy', 'trust'])
const TIEBREAKER_NEGATIVE = new Set(['sadness', 'anger', 'disgust', 'fear'])
const TIEBREAKER_THRESHOLD = 0.78

function applyEmotionTiebreaker(sentiment, sentScore, emotion, emotionIntensity) {
  // Only act when sentiment model returned neutral
  if (sentiment !== 'neutral') return { sentiment, sentScore }

  // Only act when emotion model is highly confident
  if (emotionIntensity < TIEBREAKER_THRESHOLD) return { sentiment, sentScore }

  if (TIEBREAKER_POSITIVE.has(emotion)) {
    const nudged = parseFloat((emotionIntensity * 0.25).toFixed(3))
    console.log(`[TIE] neutral → positive via ${emotion}(${emotionIntensity}) nudge: +${nudged}`)
    return { sentiment: 'positive', sentScore: nudged }
  }

  if (TIEBREAKER_NEGATIVE.has(emotion)) {
    const nudged = parseFloat((-emotionIntensity * 0.25).toFixed(3))
    console.log(`[TIE] neutral → negative via ${emotion}(${emotionIntensity}) nudge: ${nudged}`)
    return { sentiment: 'negative', sentScore: nudged }
  }

  // surprise, anticipation, neutral — leave unchanged
  return { sentiment, sentScore }
}

// ── Main classifier ───────────────────────────────────────────
export const classifyWord = async (word) => {
  const w     = word.toLowerCase().trim()
  const input = toModelInput(w)

  if (!sentimentPipeline || modelStatus !== 'ready') {
    return {
      sentiment:        'neutral',
      sentimentScore:   0,
      emotion:          'neutral',
      emotionIntensity: 0,
    }
  }

  try {
    // Run both pipelines in parallel using context-wrapped input
    const [sentResult, emoResult] = await Promise.all([
      sentimentPipeline(input),
      emotionPipeline ? emotionPipeline(input, { top_k: 1 }) : Promise.resolve(null),
    ])

    // ── Parse sentiment ───────────────────────────────────
    const rawLabel  = sentResult[0]?.label ?? 'neutral'
    const rawConf   = sentResult[0]?.score ?? 0.5
    let sentScore   = toSentimentScore(rawLabel, rawConf)

    let sentiment   = sentScore >  0.08 ? 'positive'
                    : sentScore < -0.08 ? 'negative'
                    : 'neutral'

    // ── Parse emotion ─────────────────────────────────────
    let emotion          = 'neutral'
    let emotionIntensity = 0

    if (emoResult?.[0]) {
      emotion          = normalizeGoEmotion(emoResult[0].label)
      emotionIntensity = parseFloat(emoResult[0].score.toFixed(2))
    } else {
      // Fallback: derive emotion from sentiment if emotion model failed
      emotion          = sentiment === 'positive' ? 'joy'
                       : sentiment === 'negative' ? 'sadness'
                       : 'neutral'
      emotionIntensity = parseFloat(rawConf.toFixed(2))
    }

    // ── Emotion tiebreaker ────────────────────────────────
    // Runs only when sentiment=neutral and emotion is highly confident.
    // Uses only unambiguous emotions: joy/trust → positive, sadness/anger/disgust/fear → negative.
    // surprise and anticipation are intentionally excluded — too directionally ambiguous.
    const tied = applyEmotionTiebreaker(sentiment, sentScore, emotion, emotionIntensity)
    sentiment = tied.sentiment
    sentScore = tied.sentScore

    console.log(
      `[TRF] ${w.padEnd(16)} (sent as: "${input}") ` +
      `${rawLabel}(${rawConf.toFixed(2)}) → score:${sentScore} ${sentiment} | ` +
      `emo:${emoResult?.[0]?.label ?? 'n/a'} → ${emotion}(${emotionIntensity})`
    )

    return { sentiment, sentimentScore: sentScore, emotion, emotionIntensity }

  } catch (err) {
    console.warn(`[TRF] Failed on "${w}":`, err.message)
    return {
      sentiment:        'neutral',
      sentimentScore:   0,
      emotion:          'neutral',
      emotionIntensity: 0,
    }
  }
}

// ── Standalone emotion classifier ─────────────────────────────
export const classifyEmotion = async (word) => {
  if (!emotionPipeline || modelStatus !== 'ready') {
    return { emotion: 'neutral', emotionIntensity: 0 }
  }
  try {
    const input  = toModelInput(word.toLowerCase().trim())
    const result = await emotionPipeline(input, { top_k: 1 })
    return {
      emotion:          normalizeGoEmotion(result[0]?.label),
      emotionIntensity: parseFloat((result[0]?.score ?? 0).toFixed(2)),
    }
  } catch {
    return { emotion: 'neutral', emotionIntensity: 0 }
  }
}

// ── Window debug helper ───────────────────────────────────────
if (typeof window !== 'undefined') {
  window.__mindorb = {
    classifyWord,
    classifyEmotion,
    getStatus: () => ({
      modelStatus,
      modelBackend,
      sentimentLoaded: !!sentimentPipeline,
      emotionLoaded:   !!emotionPipeline,
    }),
    testWord: async (w) => {
      const r = await classifyWord(w)
      console.table([{ word: w, ...r }])
      return r
    },
  }
}