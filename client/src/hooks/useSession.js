import { useState, useCallback, useRef } from 'react'
import { classifyWord } from '../services/sentiment'
import api from '../services/api'

const TOTAL_WORDS = 10

export function useSession() {
  const [words, setWords]          = useState([])
  const [status, setStatus]        = useState('breathing')
  const [sessionResult, setResult] = useState(null)
  const [error, setError]          = useState(null)

  // Ref always holds the latest words array — no stale closure
  const wordsRef = useRef([])

  const startSession = useCallback(() => {
    wordsRef.current = []
    setWords([])
    setResult(null)
    setError(null)
    setStatus('breathing')
  }, [])

  const beginRound = useCallback(() => {
    setStatus('active')
  }, [])

  const submitWord = useCallback(async (wordText, reactionTime) => {
    const trimmed = wordText.trim().toLowerCase()
    if (!trimmed) return null

    const { sentiment, sentimentScore, emotion, emotionIntensity } =
      await classifyWord(trimmed)

    const wordEntry = {
      word:            trimmed,
      sentiment,
      sentimentScore,
      emotion,
      emotionIntensity,
      reactionTime,
      wordIndex:       wordsRef.current.length + 1,
      orbState:        sentiment === 'positive' ? 'warm'
                     : sentiment === 'negative' ? 'cool'
                     : 'neutral',
    }

    // Update ref immediately — no stale closure
    const newWords = [...wordsRef.current, wordEntry]
    wordsRef.current = newWords
    setWords([...newWords])

    return { wordEntry, allWords: newWords }
  }, [])

  const finishSession = useCallback(async (allWords, roundType = 'free') => {
    setStatus('submitting')
    try {
      const { data } = await api.post('/sessions', { words: allWords, roundType })
      setResult(data.session)
      setStatus('complete')
      return data.session
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save session')
      setStatus('active')
      return null
    }
  }, [])

  return {
    words,
    status,
    sessionResult,
    error,
    isComplete:  wordsRef.current.length >= TOTAL_WORDS,
    totalWords:  TOTAL_WORDS,
    wordsRef,
    startSession,
    beginRound,
    submitWord,
    finishSession,
  }
}