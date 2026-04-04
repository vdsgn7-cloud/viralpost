'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WritersModal from '@/components/writers/WritersModal'
import TourOverlay from '@/components/ui/TourOverlay'
import { useAppStore } from '@/store'

export default function AppShell({ children, user }: { children: React.ReactNode, user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const { setWriters, setActiveWriter } = useAppStore()
  const sb = createClient()

  useEffect(() => {
    loadWriters()
  }, [])

  async function loadWriters() {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return
    const res = await fetch('/api/writers', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    if (data.writers) {
      setWriters(data.writers)
      setActiveWriter(data.writers[0] || null)
    }
  }

  async function logout() {
    await sb.auth.signOut()
    router.push('/auth')
  }

  const nav = [
    { href: '/criar', label: 'Criar' },
    { href: '/planner', label: 'Planner' },
    { href: '/historico', label: 'Histórico' },
  ]

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52,
        borderBottom: '1px solid rgba(255,255,255,.07)',
        background: 'rgba(8,8,8,.85)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, letterSpacing: '-.02em' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
          ViralPost
        </div>

        <nav style={{ display: 'flex', gap: 1, background: '#161616', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,.07)' }}>
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all .15s',
              background: pathname === href ? '#111' : 'transparent',
              color: pathname === href ? '#f2f2f2' : '#737373',
              border: pathname === href ? '1px solid rgba(255,255,255,.12)' : '1px solid transparent'
            }}>{label}</Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TourTrigger />
          <WritersModalTrigger />
          <span style={{ fontSize: 12, color: '#737373' }}>
            {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          </span>
          <button onClick={logout} style={topbarBtnStyle}>Sair</button>
        </div>
      </div>

      <main>{children}</main>
      <WritersModal onReload={loadWriters} />
      <TourOverlay />
    </div>
  )
}

function TourTrigger() {
  const { setTourActive } = useTourStore()
  return (
    <button onClick={() => setTourActive(true)} style={topbarBtnStyle}>? Tutorial</button>
  )
}

function WritersModalTrigger() {
  const { setWritersModalOpen } = useWritersModalStore()
  return (
    <button onClick={() => setWritersModalOpen(true)} style={topbarBtnStyle}>✍ Escritores</button>
  )
}

// Mini stores for modal/tour state
import { create } from 'zustand'
export const useTourStore = create<{ tourActive: boolean, setTourActive: (v: boolean) => void }>(set => ({
  tourActive: false,
  setTourActive: (tourActive) => set({ tourActive })
}))
export const useWritersModalStore = create<{ open: boolean, setWritersModalOpen: (v: boolean) => void }>(set => ({
  open: false,
  setWritersModalOpen: (open) => set({ open })
}))

const topbarBtnStyle: React.CSSProperties = {
  padding: '5px 12px', border: '1px solid rgba(255,255,255,.12)',
  background: 'transparent', color: '#737373', borderRadius: 10,
  cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: 'all .15s'
}
