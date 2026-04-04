'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [tab, setTab] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{type:'error'|'success', text:string}|null>(null)
  const router = useRouter()
  const sb = createClient()

  async function handleLogin() {
    setLoading(true); setMsg(null)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) setMsg({ type: 'error', text: error.message })
    else router.push('/criar')
    setLoading(false)
  }

  async function handleSignup() {
    setLoading(true); setMsg(null)
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Conta criada! Verifique seu email.' })
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-6" style={{position:'relative',zIndex:1}}>
      <div style={{
        width:'100%', maxWidth:380,
        background:'#111', border:'1px solid rgba(255,255,255,.12)',
        borderRadius:20, padding:'40px 36px', position:'relative', overflow:'hidden'
      }}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)'}}/>

        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#fff'}}/>
          <span style={{fontSize:17,fontWeight:600,letterSpacing:'-.02em'}}>ViralPost Studio</span>
        </div>
        <p style={{color:'#737373',fontSize:13,marginBottom:28}}>Crie posts virais com IA em segundos</p>

        {/* Tabs */}
        <div style={{display:'flex',background:'#161616',borderRadius:8,padding:3,marginBottom:22,border:'1px solid rgba(255,255,255,.07)'}}>
          {(['login','signup'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:'7px', border: tab===t ? '1px solid rgba(255,255,255,.12)' : 'none',
              background: tab===t ? '#111' : 'transparent',
              color: tab===t ? '#f2f2f2' : '#737373',
              borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:500, transition:'all .15s'
            }}>{t === 'login' ? 'Entrar' : 'Criar conta'}</button>
          ))}
        </div>

        {tab === 'signup' && (
          <div style={{marginBottom:13}}>
            <label style={{display:'block',fontSize:11,color:'#737373',marginBottom:5,fontWeight:500,letterSpacing:'.05em',textTransform:'uppercase'}}>Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" style={inputStyle}/>
          </div>
        )}
        <div style={{marginBottom:13}}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={inputStyle}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={labelStyle}>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
            style={inputStyle}/>
        </div>

        <button onClick={tab === 'login' ? handleLogin : handleSignup} disabled={loading} style={btnStyle}>
          {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        {msg && (
          <div style={{
            fontSize:12, padding:'10px 12px', borderRadius:8, marginTop:12,
            background: msg.type === 'error' ? 'rgba(239,68,68,.08)' : 'rgba(74,222,128,.08)',
            color: msg.type === 'error' ? '#f87171' : '#4ade80',
            border: `1px solid ${msg.type === 'error' ? 'rgba(239,68,68,.15)' : 'rgba(74,222,128,.15)'}`
          }}>{msg.text}</div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,.12)',
  borderRadius:10, padding:'10px 13px', color:'#f2f2f2', fontFamily:'inherit',
  fontSize:14, outline:'none'
}
const labelStyle: React.CSSProperties = {
  display:'block', fontSize:11, color:'#737373', marginBottom:5,
  fontWeight:500, letterSpacing:'.05em', textTransform:'uppercase'
}
const btnStyle: React.CSSProperties = {
  width:'100%', padding:11, background:'#e4e4e7', color:'#000',
  border:'none', borderRadius:10, fontFamily:'inherit', fontSize:13,
  fontWeight:600, cursor:'pointer'
}
