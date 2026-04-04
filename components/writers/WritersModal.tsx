'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore, Writer } from '@/store'
import { useWritersModalStore } from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'

const TOM_OPTIONS = [
  { value: 'educativo', label: 'Educativo — explica com clareza' },
  { value: 'direto', label: 'Direto — sem rodeios' },
  { value: 'analitico', label: 'Analítico — dados e fatos' },
  { value: 'conversacional', label: 'Conversacional — próximo' },
  { value: 'inspiracional', label: 'Inspiracional — motiva' },
]

export default function WritersModal({ onReload }: { onReload: () => void }) {
  const { open, setWritersModalOpen } = useWritersModalStore()
  const { writers, setWriters, setActiveWriter } = useAppStore()
  const [editing, setEditing] = useState<Writer | null>(null)
  const [creating, setCreating] = useState(false)
  const sb = createClient()

  async function getToken() {
    const { data: { session } } = await sb.auth.getSession()
    return session?.access_token || ''
  }

  async function deleteWriter(id: string) {
    if (!confirm('Excluir este escritor?')) return
    const token = await getToken()
    await fetch(`/api/writers?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    onReload()
  }

  if (editing || creating) {
    return (
      <Modal open={open} onClose={() => { setEditing(null); setCreating(false); setWritersModalOpen(false) }}>
        <WriterForm
          writer={editing || undefined}
          onSave={async (data) => {
            const token = await getToken()
            const method = editing ? 'PATCH' : 'POST'
            const body = editing ? { id: editing.id, ...data } : data
            const res = await fetch('/api/writers', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
            const result = await res.json()
            if (result.error) { alert('Erro: ' + result.error); return }
            setEditing(null); setCreating(false)
            onReload()
          }}
          onCancel={() => { setEditing(null); setCreating(false) }}
        />
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={() => setWritersModalOpen(false)} title="Escritores">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {writers.map(w => (
          <div key={w.id} style={{
            background: '#161616', border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
              {w.avatar_url ? <img src={w.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : w.avatar_emoji || '✍️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{w.nome}</div>
              <div style={{ fontSize: 11, color: '#737373', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {TOM_OPTIONS.find(t => t.value === w.tom)?.label.split('—')[0].trim()} · {w.nicho_principal}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <button onClick={() => setEditing(w)} style={iconBtnStyle}>✏</button>
              <button onClick={() => deleteWriter(w.id)} style={{ ...iconBtnStyle, color: '#f87171' }}>✕</button>
            </div>
          </div>
        ))}
        {writers.length === 0 && <div style={{ fontSize: 12, color: '#737373', padding: '8px 0' }}>Nenhum escritor ainda.</div>}
      </div>
      <button onClick={() => setCreating(true)} style={primaryBtnStyle}>+ Criar novo escritor</button>
    </Modal>
  )
}

function WriterForm({ writer, onSave, onCancel }: { writer?: Writer, onSave: (data: any) => Promise<void>, onCancel: () => void }) {
  const [nome, setNome] = useState(writer?.nome || '')
  const [emoji, setEmoji] = useState(writer?.avatar_emoji || '✍️')
  const [avatarUrl, setAvatarUrl] = useState(writer?.avatar_url || '')
  const [nicho, setNicho] = useState(writer?.nicho_principal || '')
  const [publico, setPublico] = useState(writer?.publico_alvo || '')
  const [tom, setTom] = useState(writer?.tom || 'educativo')
  const [formalidade, setFormalidade] = useState(writer?.formalidade || 'medio')
  const [tamanho, setTamanho] = useState(writer?.tamanho_copy || 'medio')
  const [evitar, setEvitar] = useState((writer?.evitar || []).join(', '))
  const [descricao, setDescricao] = useState(writer?.descricao_pessoal || '')
  const [exemplo, setExemplo] = useState(writer?.exemplo_post || '')
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(writer?.avatar_url || '')

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const url = ev.target?.result as string; setAvatarPreview(url); setAvatarUrl(url) }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!nome) { alert('Nome obrigatório'); return }
    setLoading(true)
    await onSave({
      nome, avatar_emoji: emoji, avatar_url: avatarUrl || null,
      nicho_principal: nicho || 'geral', publico_alvo: publico || 'pessoas interessadas',
      tom, formalidade, tamanho_copy: tamanho,
      evitar: evitar ? evitar.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      descricao_pessoal: descricao || null, exemplo_post: exemplo || null
    })
    setLoading(false)
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 18 }}>
        {writer ? 'Editar escritor' : 'Novo escritor'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FormField label="Nome">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Victor — Investimentos" style={inputStyle}/>
        </FormField>
        <FormField label="Emoji / Foto">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} style={{ ...inputStyle, width: 60, textAlign: 'center', fontSize: 20 }}/>
            <div style={{ flex: 1, position: 'relative', padding: '7px 10px', background: '#161616', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, cursor: 'pointer', fontSize: 11, color: '#737373', textAlign: 'center' }}>
              Upload foto
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}/>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,.12)', background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden', flexShrink: 0 }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}/> : emoji}
            </div>
          </div>
        </FormField>
        <FormField label="Nicho principal">
          <input value={nicho} onChange={e => setNicho(e.target.value)} placeholder="Ex: investimentos, fitness" style={inputStyle}/>
        </FormField>
        <FormField label="Público-alvo">
          <input value={publico} onChange={e => setPublico(e.target.value)} placeholder="Ex: jovens que querem investir" style={inputStyle}/>
        </FormField>
        <FormField label="Tom de voz">
          <select value={tom} onChange={e => setTom(e.target.value)} style={inputStyle}>
            {TOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Formalidade">
            <select value={formalidade} onChange={e => setFormalidade(e.target.value)} style={inputStyle}>
              <option value="medio">Equilibrado</option>
              <option value="informal">Informal</option>
              <option value="formal">Formal</option>
            </select>
          </FormField>
          <FormField label="Tamanho">
            <select value={tamanho} onChange={e => setTamanho(e.target.value)} style={inputStyle}>
              <option value="medio">Médio</option>
              <option value="curto">Curto</option>
              <option value="longo">Longo</option>
            </select>
          </FormField>
        </div>
        <FormField label="Nunca usar (vírgula)">
          <input value={evitar} onChange={e => setEvitar(e.target.value)} placeholder="clichês, emojis, clickbait" style={inputStyle}/>
        </FormField>
        <FormField label="Sobre este escritor (opcional)">
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Personalidade, contexto, voz..." style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}/>
        </FormField>
        <FormField label="Exemplo de post (opcional)">
          <textarea value={exemplo} onChange={e => setExemplo(e.target.value)} placeholder="Cole um post de referência..." style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}/>
        </FormField>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={handleSave} disabled={loading} style={{ ...primaryBtnStyle, flex: 1 }}>
            {loading ? 'Salvando...' : 'Salvar escritor'}
          </button>
          <button onClick={onCancel} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.12)', color: '#737373', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#737373', marginBottom: 5, fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase' as const }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '9px 12px', color: '#f2f2f2', fontFamily: 'inherit', fontSize: 13, outline: 'none' }
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: 11, background: '#e4e4e7', color: '#000', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const iconBtnStyle: React.CSSProperties = { background: '#111', border: '1px solid rgba(255,255,255,.12)', color: '#737373', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }
