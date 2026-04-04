'use client'
import { useEffect, useState } from 'react'
import { useTourStore } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  { target: '#panel-writers', title: 'Escritores de IA', desc: 'Cada escritor tem sua própria personalidade, tom e estilo. Selecione qual vai escrever o post antes de gerar. Crie quantos quiser.', pos: 'right' },
  { target: '#panel-config', title: 'Configure o post', desc: 'Escolha o nicho, rede social e formato. Suba uma screenshot de referência para a IA clonar o estilo visual.', pos: 'right' },
  { target: '#panel-preview', title: 'Preview e personalização', desc: 'O post gerado aparece aqui. Personalize fontes, cores, foto de perfil e proporção. Em carrosséis, navegue entre slides com as setas.', pos: 'left' },
  { target: '#btn-writers-topbar', title: 'Gerenciar escritores', desc: 'Crie, edite ou exclua escritores aqui. Os presets Educativo, Direto e Analítico já estão prontos para começar.', pos: 'bottom' },
]

export default function TourOverlay() {
  const { tourActive, setTourActive } = useTourStore()
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const sb = createClient()

  useEffect(() => {
    if (tourActive) {
      setStep(0)
      setTimeout(() => updateRect(0), 100)
    }
  }, [tourActive])

  useEffect(() => {
    if (tourActive) updateRect(step)
  }, [step, tourActive])

  function updateRect(s: number) {
    const el = document.querySelector(STEPS[s]?.target)
    if (el) setRect(el.getBoundingClientRect())
  }

  function next() {
    if (step >= STEPS.length - 1) { finish(); return }
    setStep(s => s + 1)
  }

  function finish() {
    setTourActive(false)
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) localStorage.setItem('tour_done_' + session.user.id, '1')
    })
  }

  if (!tourActive || !rect) return null

  const current = STEPS[step]
  const cardW = 300, margin = 14
  let cardLeft = 0, cardTop = 0
  if (current.pos === 'right') { cardLeft = rect.right + margin; cardTop = rect.top }
  else if (current.pos === 'left') { cardLeft = rect.left - cardW - margin; cardTop = rect.top }
  else { cardLeft = rect.left + rect.width / 2 - cardW / 2; cardTop = rect.bottom + margin }
  cardLeft = Math.max(12, Math.min(cardLeft, window.innerWidth - cardW - 12))
  cardTop = Math.max(12, Math.min(cardTop, window.innerHeight - 240))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, pointerEvents: 'none' }}>
      {/* Backdrop */}
      <div onClick={finish} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.72)', pointerEvents: 'all' }}/>

      {/* Spotlight */}
      <div style={{
        position: 'absolute',
        left: rect.left - 8, top: rect.top - 8,
        width: rect.width + 16, height: rect.height + 16,
        borderRadius: 14,
        boxShadow: '0 0 0 9999px rgba(0,0,0,.72)',
        zIndex: 1, pointerEvents: 'none',
        transition: 'all .3s ease',
        border: '1px solid rgba(255,255,255,.12)'
      }}/>

      {/* Card */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: cardLeft, top: cardTop,
        width: cardW, background: '#111', border: '1px solid rgba(255,255,255,.15)',
        borderRadius: 16, padding: '18px 20px', zIndex: 2, pointerEvents: 'all',
        transition: 'all .3s ease', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)' }}/>
        <div style={{ fontSize: 10, color: '#737373', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 7 }}>
          Passo {step + 1} de {STEPS.length}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 6 }}>{current.title}</div>
        <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.5, marginBottom: 16 }}>{current.desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i === step ? '#f2f2f2' : '#333', border: '1px solid rgba(255,255,255,.12)', transition: 'all .2s' }}/>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={finish} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,.12)', color: '#737373', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>Pular</button>
            <button onClick={next} style={{ padding: '6px 14px', background: '#e4e4e7', border: 'none', color: '#000', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
              {step === STEPS.length - 1 ? 'Concluir ✓' : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
