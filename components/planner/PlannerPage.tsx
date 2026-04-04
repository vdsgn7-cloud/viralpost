'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function PlannerPage() {
  const sb = createClient()
  const [date, setDate] = useState(new Date())
  const [items, setItems] = useState<any[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [planTime, setPlanTime] = useState('')
  const [planRede, setPlanRede] = useState('instagram')
  const [planNotas, setPlanNotas] = useState('')

  useEffect(() => { load() }, [date])

  async function getToken() {
    const { data: { session } } = await sb.auth.getSession()
    return session?.access_token || ''
  }

  async function load() {
    const token = await getToken()
    const month = date.getMonth() + 1, year = date.getFullYear()
    const res = await fetch(`/api/planner?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setItems(data.items || [])
  }

  async function toggleStatus(id: string, status: string) {
    const token = await getToken()
    const newStatus = status === 'publicado' ? 'agendado' : 'publicado'
    await fetch('/api/planner', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, status: newStatus }) })
    load()
  }

  async function dropOnDate(newDate: string) {
    if (!dragId) return
    const token = await getToken()
    await fetch('/api/planner', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: dragId, scheduledDate: newDate }) })
    setDragId(null); load()
  }

  async function schedule() {
    if (!selectedDate || !planRede) return
    const token = await getToken()
    const res = await fetch('/api/planner', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ scheduledDate: selectedDate, scheduledTime: planTime, redeSocial: planRede, notas: planNotas }) })
    const data = await res.json()
    if (data.item) { setModalOpen(false); setPlanTime(''); setPlanNotas(''); load() }
    else alert('Erro: ' + (data.error || ''))
  }

  const year = date.getFullYear(), month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={navBtnStyle}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.02em', minWidth: 160, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
          <button onClick={() => setDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={navBtnStyle}>›</button>
        </div>
        <button onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setModalOpen(true) }} style={actionBtnStyle}>+ Agendar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#404040', padding: '6px 0', letterSpacing: '.08em', textTransform: 'uppercase' }}>{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={'e'+i}/>)}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          const dayItems = items.filter(x => x.scheduled_date === dateStr)
          return (
            <div key={day}
              onClick={() => { setSelectedDate(dateStr); setModalOpen(true) }}
              onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,222,128,.3)' }}
              onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isToday ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)' }}
              onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = isToday ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)'; dropOnDate(dateStr) }}
              style={{ background: '#111', border: `1px solid ${isToday ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)'}`, borderRadius: 10, minHeight: 80, padding: 7, cursor: 'pointer', transition: 'border-color .15s' }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: isToday ? '#f2f2f2' : '#404040', marginBottom: 4 }}>{day}</div>
              {dayItems.map(item => (
                <div key={item.id}
                  draggable onDragStart={() => setDragId(item.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3,
                    background: item.status === 'publicado' ? 'rgba(74,222,128,.06)' : item.status === 'rascunho' ? '#161616' : 'rgba(255,255,255,.05)',
                    color: item.status === 'publicado' ? '#4ade80' : item.status === 'rascunho' ? '#404040' : '#737373',
                    border: `1px solid ${item.status === 'publicado' ? 'rgba(74,222,128,.12)' : 'rgba(255,255,255,.07)'}`,
                  }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.generated_posts?.headline || item.rede_social}</span>
                  <button onClick={() => toggleStatus(item.id, item.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'inherit', padding: 0, opacity: .6, flexShrink: 0 }}>
                    {item.status === 'publicado' ? '↩' : '✓'}
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,.12)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)' }}/>
            <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: 14, right: 14, background: '#161616', border: '1px solid rgba(255,255,255,.07)', color: '#737373', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', fontSize: 16 }}>×</button>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>Agendar post</div>
            {[
              { label: 'Data', el: <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={inputStyle}/> },
              { label: 'Horário', el: <input type="time" value={planTime} onChange={e => setPlanTime(e.target.value)} style={inputStyle}/> },
              { label: 'Rede', el: <select value={planRede} onChange={e => setPlanRede(e.target.value)} style={inputStyle}><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option><option value="twitter">Twitter/X</option></select> },
              { label: 'Notas', el: <textarea value={planNotas} onChange={e => setPlanNotas(e.target.value)} placeholder="Observações..." style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}/> },
            ].map(({ label, el }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#737373', marginBottom: 5, fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase' as const }}>{label}</label>
                {el}
              </div>
            ))}
            <button onClick={schedule} style={{ width: '100%', padding: 11, background: '#e4e4e7', color: '#000', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Agendar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = { background: '#111', border: '1px solid rgba(255,255,255,.12)', color: '#737373', width: 30, height: 30, borderRadius: 10, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const actionBtnStyle: React.CSSProperties = { padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.12)', color: '#737373', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }
const inputStyle: React.CSSProperties = { width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '9px 12px', color: '#f2f2f2', fontFamily: 'inherit', fontSize: 13, outline: 'none' }
