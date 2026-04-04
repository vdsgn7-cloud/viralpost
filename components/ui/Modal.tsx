'use client'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }: {
  open: boolean, onClose: () => void, title?: string, children: React.ReactNode
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
      backdropFilter: 'blur(8px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111', border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 18, padding: 28, width: '100%', maxWidth: 480,
        position: 'relative', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Shine */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)', pointerEvents: 'none' }}/>

        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: '#161616', border: '1px solid rgba(255,255,255,.07)',
          color: '#737373', width: 28, height: 28, borderRadius: 7,
          cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>×</button>

        {title && <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 18 }}>{title}</div>}
        {children}
      </div>
    </div>
  )
}
