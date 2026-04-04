'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const REDE_ICON: Record<string, string> = { instagram: '📸', linkedin: '💼', twitter: '𝕏' }
const FORMATO_LABEL: Record<string, string> = { estatico: 'Estático', carrossel: 'Carrossel', thread: 'Thread' }

export default function HistoryPage() {
  const sb = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb.from('generated_posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60)
    setPosts(data || [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,.1)', borderTopColor: 'rgba(255,255,255,.5)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, letterSpacing: '-.02em' }}>Histórico</div>
      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#404040' }}>
          <div style={{ fontSize: 28, opacity: .3, marginBottom: 10 }}>◻</div>
          <p style={{ fontSize: 12 }}>Nenhum post salvo ainda</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
          {posts.map(p => (
            <div key={p.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: 18, position: 'relative', overflow: 'hidden', transition: 'all .15s', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)', pointerEvents: 'none' }}/>
              <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-.01em', marginBottom: 8 }}>{p.headline || 'Post'}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                {[`${REDE_ICON[p.rede_social] || ''} ${p.rede_social}`, FORMATO_LABEL[p.formato] || p.formato, p.nicho].map((tag, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#161616', color: '#737373', border: '1px solid rgba(255,255,255,.07)' }}>{tag}</span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{p.copy}</div>
              <div style={{ fontSize: 10, color: '#404040', marginTop: 10 }}>
                {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
