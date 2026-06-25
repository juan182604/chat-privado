'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Loader2, Volume2 } from 'lucide-react'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * Voice note player.
 * Uses a custom UI with a real progress bar, but always includes a hidden
 * native <audio> element as the actual player. If the custom UI fails,
 * a native <audio controls> is shown as fallback so the note can always be heard.
 */
export function VoicePlayer({
  path,
  mine = false,
  tone = 'dark',
}: {
  path: string
  mine?: boolean
  tone?: 'dark' | 'light'
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showNative, setShowNative] = useState(false)

  const src = `/api/media?path=${encodeURIComponent(path)}`

  const accent = tone === 'light' ? (mine ? 'bg-emerald-500' : 'bg-cyan-500') : (mine ? 'bg-emerald-300' : 'bg-emerald-400')
  const btnBg = tone === 'light'
    ? (mine ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500')
    : (mine ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-zinc-700 hover:bg-zinc-600')
  const trackBg = tone === 'light' ? 'bg-white/30' : 'bg-white/20'

  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const onTime = () => setCurrent(a.currentTime)
    const onDur = () => {
      if (isFinite(a.duration) && a.duration > 0) setDuration(a.duration)
    }
    const onEnd = () => { setPlaying(false); setCurrent(0) }
    const onCanPlay = () => { setLoading(false); setError(false); if (isFinite(a.duration) && a.duration > 0) setDuration(a.duration) }
    const onError = () => { setLoading(false); setError(true); setPlaying(false) }
    const onWaiting = () => setLoading(true)
    const onPlaying = () => { setLoading(false); setError(false) }

    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onDur)
    a.addEventListener('durationchange', onDur)
    a.addEventListener('ended', onEnd)
    a.addEventListener('canplay', onCanPlay)
    a.addEventListener('error', onError)
    a.addEventListener('waiting', onWaiting)
    a.addEventListener('playing', onPlaying)

    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onDur)
      a.removeEventListener('durationchange', onDur)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('canplay', onCanPlay)
      a.removeEventListener('error', onError)
      a.removeEventListener('waiting', onWaiting)
      a.removeEventListener('playing', onPlaying)
    }
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      setLoading(true)
      a.play()
        .then(() => { setPlaying(true); setLoading(false) })
        .catch(() => {
          setLoading(false)
          setError(true)
          // Show native player as fallback
          setShowNative(true)
        })
    }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    a.currentTime = Math.max(0, Math.min(1, pct)) * duration
    setCurrent(a.currentTime)
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  // If error or native fallback requested, show native audio controls
  if (error || showNative) {
    return (
      <div className="flex flex-col gap-1 min-w-[200px] py-1">
        <audio
          ref={audioRef}
          controls
          src={src}
          preload="auto"
          className="w-full"
          style={{ height: '32px' }}
        />
        {error && (
          <p className={`text-[10px] ${tone === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Si no se reproduce automáticamente, usa los controles de arriba.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px] py-0.5">
      <button
        type="button"
        onClick={toggle}
        disabled={loading && !playing}
        className={`w-9 h-9 rounded-full flex items-center justify-center ${btnBg} text-white transition-colors shrink-0 disabled:opacity-50`}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div
          onClick={seek}
          className={`relative h-1.5 ${trackBg} rounded-full cursor-pointer overflow-hidden`}
        >
          <div
            className={`h-full ${accent} transition-[width] duration-75`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className={`text-[10px] ${tone === 'light' ? 'text-zinc-300' : (mine ? 'text-emerald-100/80' : 'text-zinc-400')} flex justify-between font-mono`}>
          <span>{formatTime(current)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowNative(true)}
        className="text-zinc-500 hover:text-zinc-300 shrink-0"
        title="Reproductor nativo"
      >
        <Volume2 className="w-3.5 h-3.5" />
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        className="hidden"
      />
    </div>
  )
}
