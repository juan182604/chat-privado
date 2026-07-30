'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '@/lib/realtime'
import { useAppStore } from '@/lib/store'

export type CallMeta = {
  peerUniqueId: string
  peerName: string
  kind: 'voice' | 'video'
}

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended'

/**
 * Custom hook encapsulating all WebRTC + signaling logic for one-to-one calls.
 * Keeps the CallOverlay component pure.
 */
export function useCallEngine() {
  const user = useAppStore((s) => s.user)

  const [state, setState] = useState<CallState>('idle')
  const [meta, setMeta] = useState<CallMeta | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const iceQueueRef = useRef<any[]>([])
  const callStartRef = useRef<number>(0)
  const storedOfferRef = useRef<any>(null)
  const metaRef = useRef<CallMeta | null>(null)
  const stateRef = useRef<CallState>('idle')

  // Keep refs in sync
  useEffect(() => { metaRef.current = meta }, [meta])
  useEffect(() => { stateRef.current = state }, [state])

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startTimer = useCallback(() => {
    stopTimer()
    callStartRef.current = Date.now()
    setSeconds(0)
    timerRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - callStartRef.current) / 1000))
    }, 1000)
  }, [])

  const createPeerConnection = useCallback((m: CallMeta) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    pc.onicecandidate = (e) => {
      if (e.candidate && user) {
        getSocket()?.emit('call:ice', {
          toUniqueId: m.peerUniqueId,
          fromUniqueId: user.uniqueId,
          candidate: e.candidate,
        })
      }
    }
    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0]
      const evt = new CustomEvent('nx:remote-stream', { detail: e.streams[0] })
      window.dispatchEvent(evt)
    }
    return pc
  }, [user])

  const attachLocalStream = useCallback(async (m: CallMeta) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: m.kind === 'video',
    })
    localStreamRef.current = stream
    const evt = new CustomEvent('nx:local-stream', { detail: stream })
    window.dispatchEvent(evt)
    return stream
  }, [])

  const endCall = useCallback(async (reason: string = 'manual') => {
    const m = metaRef.current
    if (m && user) {
      getSocket()?.emit('call:end', { toUniqueId: m.peerUniqueId, fromUniqueId: user.uniqueId, reason })
    }
    // Record call as a message
    if (m && user && (stateRef.current === 'connected' || stateRef.current === 'outgoing')) {
      const duration = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : 0
      try {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUniqueId: m.peerUniqueId,
            type: 'call',
            callKind: m.kind,
            callDuration: duration,
            callStatus: duration > 0 ? 'completed' : (stateRef.current === 'outgoing' ? 'missed' : 'completed'),
          }),
        })
        window.dispatchEvent(new Event('nx:refresh-chats'))
      } catch {}
    }
    stopTimer()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current = null
    remoteStreamRef.current = null
    storedOfferRef.current = null
    setState('idle')
    setMeta(null)
    setSeconds(0)
  }, [user])

  const acceptIncomingCall = useCallback(async () => {
    if (!user) return
    const m = metaRef.current
    if (!m) return
    const offer = storedOfferRef.current
    if (!offer) {
      endCall('no offer')
      return
    }
    setState('connected')
    setCamOn(m.kind === 'video')
    try {
      const stream = await attachLocalStream(m)
      const pc = createPeerConnection(m)
      pcRef.current = pc
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      getSocket()?.emit('call:answer', {
        toUniqueId: m.peerUniqueId,
        fromUniqueId: user.uniqueId,
        answer,
      })
      startTimer()
    } catch {
      alert('No se pudo acceder a cámara/micrófono')
      endCall('device error')
    }
  }, [user, attachLocalStream, createPeerConnection, endCall, startTimer])

  const startOutgoingCall = useCallback(async (m: CallMeta) => {
    if (!user) return
    setMeta(m)
    metaRef.current = m
    setState('outgoing')
    stateRef.current = 'outgoing'
    setCamOn(m.kind === 'video')
    try {
      const stream = await attachLocalStream(m)
      const pc = createPeerConnection(m)
      pcRef.current = pc
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      getSocket()?.emit('call:offer', {
        toUniqueId: m.peerUniqueId,
        fromUniqueId: user.uniqueId,
        fromName: user.username,
        kind: m.kind,
        offer,
      })
    } catch {
      alert('No se pudo acceder a cámara/micrófono')
      endCall('device error')
    }
  }, [user, attachLocalStream, createPeerConnection, endCall])

  const declineIncomingCall = useCallback(() => {
    const m = metaRef.current
    if (m && user) {
      getSocket()?.emit('call:decline', { toUniqueId: m.peerUniqueId, fromUniqueId: user.uniqueId })
    }
    endCall('declined')
  }, [user, endCall])

  const toggleMic = useCallback(() => {
    const t = localStreamRef.current?.getAudioTracks()[0]
    if (t) {
      t.enabled = !t.enabled
      setMicOn(t.enabled)
    }
  }, [])

  const toggleCam = useCallback(() => {
    const t = localStreamRef.current?.getVideoTracks()[0]
    if (t) {
      t.enabled = !t.enabled
      setCamOn(t.enabled)
    }
  }, [])

  // Listen for socket events
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onOffer = (e: any) => {
      if (stateRef.current !== 'idle') return
      storedOfferRef.current = e.offer
      const m: CallMeta = { peerUniqueId: e.fromUniqueId, peerName: e.fromName, kind: e.kind }
      setMeta(m)
      metaRef.current = m
      setState('incoming')
      stateRef.current = 'incoming'
    }
    const onAnswer = async (e: any) => {
      if (stateRef.current === 'outgoing' && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(e.answer))
          for (const c of iceQueueRef.current) {
            try { await pcRef.current.addIceCandidate(c) } catch {}
          }
          iceQueueRef.current = []
          setState('connected')
          stateRef.current = 'connected'
          startTimer()
        } catch (err) {
          console.error('answer error', err)
        }
      }
    }
    const onIce = async (e: any) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(e.candidate)) } catch {}
      } else {
        iceQueueRef.current.push(new RTCIceCandidate(e.candidate))
      }
    }
    const onEnd = () => endCall('peer ended')
    const onDecline = () => endCall('declined')

    socket.on('call:offer', onOffer)
    socket.on('call:answer', onAnswer)
    socket.on('call:ice', onIce)
    socket.on('call:end', onEnd)
    socket.on('call:decline', onDecline)
    return () => {
      socket.off('call:offer', onOffer)
      socket.off('call:answer', onAnswer)
      socket.off('call:ice', onIce)
      socket.off('call:end', onEnd)
      socket.off('call:decline', onDecline)
    }
  }, [endCall, startTimer])

  // Listen for outgoing call requests from chat view
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as CallMeta
      startOutgoingCall(detail)
    }
    window.addEventListener('nx:start-call', handler)
    return () => window.removeEventListener('nx:start-call', handler)
  }, [startOutgoingCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      pcRef.current?.close()
    }
  }, [])

  return {
    state,
    meta,
    seconds,
    micOn,
    camOn,
    startOutgoingCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMic,
    toggleCam,
  }
}
