'use client'
import { useState, useRef as reactUseRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import Modal from '@/components/ui/Modal'
import { buildCardHTML, DEFAULT_STYLE, CardStyle } from './CardBuilder'

const FONT_OPTIONS = [
  { value: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', label: 'Sistema' },
  { value: '"Inter",sans-serif', label: 'Inter' },
  { value: '"Manrope",sans-serif', label: 'Manrope' },
  { value: '"Space Grotesk",sans-serif', label: 'Space Grotesk' },
  { value: '"Geist",sans-serif', label: 'Geist' },
  { value: '"Playfair Display",serif', label: 'Playfair Display' },
  { value: '"Lora",serif', label: 'Lora' },
  { value: '"Bebas Neue",sans-serif', label: 'Bebas Neue' },
]

export default function GeneratorPage() {
  const sb = createClient()
  const { writers, activeWriter, setActiveWriter, currentPost, setCurrentPost, currentTrend, setCurrentTrend, avatarDataUrl, setAvatarDataUrl } = useAppStore()

  const [nicho, setNicho] = useState('')
  const [rede, setRede] = useState('instagram')
  const [formato, setFormato] = useState('estatico')
  const [trends, setTrends] = useState<any[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [loadingGen, setLoadingGen] = useState(false)
  const [loadingImg, setLoadingImg] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [cardStyle, setCardStyle] = useState<CardStyle>(DEFAULT_STYLE)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentSlides, setCurrentSlides] = useState<any[]>([])
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null)
  const [refImageB64, setRefImageB64] = useState<string | null>(null)
  const [styleLoading, setStyleLoading] = useState(false)
  const [styleDone, setStyleDone] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0])
  const [planTime, setPlanTime] = useState('')
  const [planRede, setPlanRede] = useState('instagram')
  const [planNotas, setPlanNotas] = useState('')

  async function getToken() {
    const { data: { session } } = await sb.auth.getSession()
    return session?.access_token || ''
  }

  async function fetchTrends() {
    if (!nicho) { alert('Preencha o nicho'); return }
    setLoadingTrends(true)
    try {
      const res = await fetch('/api/trends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nicho, redeSocial: rede }) })
      const data = await res.json()
      if (data.error) { alert('Erro: ' + data.error); return }
      setTrends(data.trends || [])
      if (data.trends?.[0]) setCurrentTrend(data.trends[0])
    } catch (e: any) { alert('Erro: ' + e.message) }
    finally { setLoadingTrends(false) }
  }

  async function generatePost() {
    if (!currentTrend) { alert('Selecione uma tendência'); return }
    setLoadingGen(true); setStreaming(''); setCurrentPost(null); setCurrentSlide(0); setAiImageUrl(null)
    const wp = activeWriter ? { tom: activeWriter.tom, formalidade: activeWriter.formalidade, publico_alvo: activeWriter.publico_alvo, evitar: activeWriter.evitar, tamanho_copy: activeWriter.tamanho_copy, descricao_pessoal: activeWriter.descricao_pessoal, exemplo_post: activeWriter.exemplo_post, palavras_chave: activeWriter.palavras_chave } : {}
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nicho, redeSocial: rede, formato, tema: currentTrend.titulo + ' — ' + currentTrend.angulo, writerProfile: wp, stream: true }) })
      const reader = res.body!.getReader(); const decoder = new TextDecoder(); let buffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.replace('data: ', ''))
            if (parsed.delta) setStreaming(s => s + parsed.delta)
            if (parsed.done && parsed.post) {
              setCurrentPost({ post: parsed.post, formato, nicho, redeSocial: rede })
              setStreaming('')
              setCurrentSlides(formato === 'carrossel' ? parsed.post.slides || [] : formato === 'thread' ? parsed.post.tweets || [] : [])
            }
            if (parsed.error) alert('Erro: ' + parsed.error)
          } catch {}
        }
      }
    } catch (e: any) { alert('Erro: ' + e.message) }
    finally { setLoadingGen(false) }
  }

  async function generateAiImage() {
    if (!currentPost) return
    const { post } = currentPost
    const imagePrompt = post.image_prompt || (formato === 'carrossel' ? post.slides?.[0]?.image_prompt : null) || `${post.headline || currentTrend?.titulo || nicho}, professional editorial photography`
    setLoadingImg(true)
    try {
      const res = await fetch('/api/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: imagePrompt, formato }) })
      const data = await res.json()
      if (data.error) { alert('Erro: ' + data.error); return }
      setAiImageUrl(data.imageUrl)
    } catch (e: any) { alert('Erro: ' + e.message) }
    finally { setLoadingImg(false) }
  }

  function handleRefImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const b64 = (ev.target?.result as string).split(',')[1]; setRefImageB64(b64); setStyleLoading(true); setStyleDone(false)
      try {
        const res = await fetch('/api/analyze-style', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: b64, mediaType: file.type }) })
        const data = await res.json()
        if (data.style?.palette) { const p = data.style.palette; setCardStyle(s => ({ ...s, bg: p.background || s.bg, text: p.text || s.text, verifiedColor: p.accent || s.verifiedColor })) }
        setStyleDone(true)
      } catch {} finally { setStyleLoading(false) }
    }; reader.readAsDataURL(file)
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = ev => setAvatarDataUrl(ev.target?.result as string); reader.readAsDataURL(file)
  }

  async function savePost() {
    if (!currentPost) return; const token = await getToken(); const { post, formato: fmt, nicho: n, redeSocial: r } = currentPost
    const res = await fetch('/api/save-post', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ nicho: n, redeSocial: r, formato: fmt, headline: post.headline || post.tweets?.[0]?.texto || '', copy: post.copy || post.caption || '', slides: post.slides || post.tweets || null, hashtags: post.hashtags || [] }) })
    const data = await res.json(); alert(data.post ? 'Post salvo! ✅' : 'Erro: ' + (data.error || ''))
  }

  async function schedulePost() {
    if (!planDate) { alert('Selecione a data'); return }; const token = await getToken()
    const res = await fetch('/api/planner', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ scheduledDate: planDate, scheduledTime: planTime, redeSocial: planRede, notas: planNotas }) })
    const data = await res.json(); if (data.item) { setPlanModalOpen(false); alert('Agendado! ✅') } else alert('Erro: ' + (data.error || ''))
  }

  async function downloadCard() {
    if (!currentPost || typeof window === 'undefined') return
    const html2canvas = (await import('html2canvas')).default
    const { post, formato: fmt } = currentPost; const s = cardStyle
    const [exportW, exportH] = s.proporcao.split('x').map(Number)
    const total = fmt === 'carrossel' ? (post.slides?.length || 1) : fmt === 'thread' ? (post.tweets?.length || 1) : 1
    for (let i = 0; i < total; i++) {
      const slideImg = (fmt !== 'carrossel' || i === 0) ? aiImageUrl : null
      const div = document.createElement('div'); div.style.cssText = `position:fixed;left:-9999px;top:0;width:${exportW}px;height:${exportH}px;overflow:hidden;`
      div.innerHTML = buildCardHTML(post, fmt, s, i, avatarDataUrl, slideImg || undefined); document.body.appendChild(div)
      await new Promise(r => setTimeout(r, 300))
      const canvas = await html2canvas(div, { backgroundColor: s.bg, scale: 1, useCORS: true, allowTaint: true, width: exportW, height: exportH }); document.body.removeChild(div)
      const link = document.createElement('a'); link.download = total > 1 ? `slide-${i+1}.png` : 'viralpost.png'; link.href = canvas.toDataURL('image/png'); link.click()
      await new Promise(r => setTimeout(r, 300))
    }
  }

  const hasPost = !!currentPost

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
        <div>
          <Panel id="panel-writers" title="Escritor ativo" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {writers.map(w => (
                <button key={w.id} onClick={() => setActiveWriter(w)} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:50,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:500,background:activeWriter?.id===w.id?'#161616':'transparent',border:`1px solid ${activeWriter?.id===w.id?'rgba(255,255,255,.2)':'rgba(255,255,255,.1)'}`,color:activeWriter?.id===w.id?'#f2f2f2':'#737373',transition:'all .15s' }}>
                  <span style={{ fontSize: 14 }}>{w.avatar_emoji || '✍️'}</span>{w.nome}
                </button>
              ))}
              {!writers.length && <span style={{ fontSize: 12, color: '#737373' }}>Carregando...</span>}
            </div>
          </Panel>

          <Panel id="panel-config" title="Configuração" style={{ marginBottom: 12 }}>
            <FormRow label="Nicho / Tema"><input value={nicho} onChange={e => setNicho(e.target.value)} placeholder="ex: investimentos, fitness" style={iStyle}/></FormRow>
            <FormRow label="Rede Social"><Seg options={[{v:'instagram',l:'Instagram'},{v:'linkedin',l:'LinkedIn'},{v:'twitter',l:'Twitter/X'}]} value={rede} onChange={setRede}/></FormRow>
            <FormRow label="Formato"><Seg options={[{v:'estatico',l:'Estático'},{v:'carrossel',l:'Carrossel'},{v:'thread',l:'Thread'}]} value={formato} onChange={setFormato}/></FormRow>
            <FormRow label="Referência visual (opcional)">
              <div style={{ border:'1px dashed rgba(255,255,255,.12)',borderRadius:10,padding:12,textAlign:'center',position:'relative',cursor:'pointer' }}>
                <input type="file" accept="image/*" onChange={handleRefImage} style={{ position:'absolute',inset:0,opacity:0,cursor:'pointer' }}/>
                <span style={{ fontSize:12,color:refImageB64?'#4ade80':'#737373' }}>{refImageB64?'✓ Referência carregada':'Arraste ou clique — clona o estilo visual'}</span>
              </div>
              {styleLoading && <div style={{ fontSize:11,color:'#737373',marginTop:5,display:'flex',alignItems:'center',gap:5 }}><Spinner/> Analisando...</div>}
              {styleDone && !styleLoading && <div style={{ fontSize:11,color:'#4ade80',marginTop:5 }}>✓ Estilo clonado</div>}
            </FormRow>
            <button onClick={fetchTrends} disabled={loadingTrends} style={pBtn}>{loadingTrends?<><Spinner/> Buscando...</>:'Buscar tendências →'}</button>
          </Panel>

          {trends.length > 0 && (
            <Panel id="panel-trends" title="Em alta agora" style={{ marginBottom: 12 }}>
              {trends.map((t, i) => (
                <div key={i} onClick={() => setCurrentTrend(t)} style={{ background:'#161616',border:`1px solid ${currentTrend===t?'rgba(255,255,255,.25)':'rgba(255,255,255,.07)'}`,borderRadius:10,padding:'11px 13px',marginBottom:6,cursor:'pointer',transition:'all .15s' }}>
                  <div style={{ fontSize:13,fontWeight:500,marginBottom:3 }}>{t.titulo}</div>
                  <div style={{ fontSize:12,color:'#737373',lineHeight:1.4 }}>{t.descricao}</div>
                  <div style={{ display:'flex',gap:5,marginTop:7 }}>
                    <Chip color={t.potencial==='alto'?'#4ade80':'#fbbf24'} bg={t.potencial==='alto'?'rgba(74,222,128,.06)':'rgba(250,204,21,.06)'} border={t.potencial==='alto'?'rgba(74,222,128,.12)':'rgba(250,204,21,.12)'}>{t.potencial==='alto'?'↑ Alto':'→ Médio'}</Chip>
                    <Chip>{t.tipo}</Chip>
                  </div>
                </div>
              ))}
              <button onClick={generatePost} disabled={loadingGen} style={{ ...pBtn,marginTop:10 }}>{loadingGen?<><Spinner/> Gerando...</>:'Gerar post →'}</button>
            </Panel>
          )}
        </div>

        <div style={{ position: 'sticky', top: 64 }}>
          <Panel id="panel-preview" title="Preview">
            {streaming && (
              <div style={{ background:'#161616',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,padding:16,marginBottom:12,fontSize:12,color:'#737373',lineHeight:1.7,minHeight:80,wordBreak:'break-word',fontFamily:'monospace' }}>
                {streaming}<span className="stream-cursor"/>
              </div>
            )}

            {hasPost && currentSlides.length > 0 && (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,padding:'6px 10px',background:'#161616',border:'1px solid rgba(255,255,255,.07)',borderRadius:10 }}>
                <button onClick={() => setCurrentSlide(s => Math.max(0,s-1))} disabled={currentSlide===0} style={snBtn}>‹</button>
                <span style={{ fontSize:12,color:'#737373' }}>{currentSlide+1} / {currentSlides.length}</span>
                <button onClick={() => setCurrentSlide(s => Math.min(currentSlides.length-1,s+1))} disabled={currentSlide===currentSlides.length-1} style={snBtn}>›</button>
              </div>
            )}

            {hasPost ? (
              <CardPreview post={currentPost!.post} formato={currentPost!.formato} style={cardStyle} slideIndex={currentSlide} avatarDataUrl={avatarDataUrl} aiImageUrl={aiImageUrl}/>
            ) : !streaming ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:280,color:'#404040',textAlign:'center',gap:10,background:'#161616',border:'1px dashed rgba(255,255,255,.07)',borderRadius:10 }}>
                <div style={{ fontSize:32,opacity:.2 }}>✦</div><p style={{ fontSize:12 }}>Seu post aparece aqui</p>
              </div>
            ) : null}

            {hasPost && (
              <button onClick={generateAiImage} disabled={loadingImg} style={{ ...pBtn,marginTop:12,background:loadingImg?'rgba(255,255,255,.04)':'rgba(255,255,255,.07)',color:loadingImg?'#737373':'#f2f2f2',border:'1px solid rgba(255,255,255,.12)' }}>
                {loadingImg?<><Spinner/> Gerando imagem...</>:aiImageUrl?'↺ Nova imagem IA':'✨ Gerar imagem com IA (FLUX)'}
              </button>
            )}

            {hasPost && (
              <div style={{ background:'#161616',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,padding:14,marginTop:12 }}>
                <div style={{ fontSize:10,fontWeight:600,color:'#404040',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:12 }}>Personalizar visual</div>
                <div style={{ marginBottom:10 }}><label style={cLbl}>Proporção</label><select value={cardStyle.proporcao} onChange={e=>setCardStyle(s=>({...s,proporcao:e.target.value}))} style={cSel}><option value="1080x1350">1080×1350 Feed (4:5)</option><option value="1080x1080">1080×1080 Quadrado (1:1)</option></select></div>
                <div style={{ marginBottom:10 }}>
                  <label style={cLbl}>Foto de perfil</label>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ width:34,height:34,borderRadius:'50%',border:'1px solid rgba(255,255,255,.12)',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0 }}>
                      {avatarDataUrl?<img src={avatarDataUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:<span>👤</span>}
                    </div>
                    <div style={{ flex:1,position:'relative',padding:'7px 10px',background:'#111',border:'1px solid rgba(255,255,255,.12)',borderRadius:7,cursor:'pointer',fontSize:11,color:'#737373',textAlign:'center' }}>
                      Upload<input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ position:'absolute',inset:0,opacity:0,cursor:'pointer' }}/>
                    </div>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                  <div><label style={cLbl}>Nome</label><input value={cardStyle.name} onChange={e=>setCardStyle(s=>({...s,name:e.target.value}))} placeholder="Seu Nome" style={cInp}/></div>
                  <div><label style={cLbl}>@ usuário</label><input value={cardStyle.handle} onChange={e=>setCardStyle(s=>({...s,handle:e.target.value}))} placeholder="@handle" style={cInp}/></div>
                  <div><label style={cLbl}>Fundo</label><input type="color" value={cardStyle.bg} onChange={e=>setCardStyle(s=>({...s,bg:e.target.value}))} style={cClr}/></div>
                  <div><label style={cLbl}>Texto</label><input type="color" value={cardStyle.text} onChange={e=>setCardStyle(s=>({...s,text:e.target.value}))} style={cClr}/></div>
                  <div><label style={cLbl}>Destaque</label><input type="color" value={cardStyle.verifiedColor} onChange={e=>setCardStyle(s=>({...s,verifiedColor:e.target.value,accentColor:e.target.value}))} style={cClr}/></div>
                  <div style={{ display:'flex',alignItems:'flex-end',gap:6 }}><input type="checkbox" id="cv" checked={cardStyle.verified} onChange={e=>setCardStyle(s=>({...s,verified:e.target.checked}))} style={{ accentColor:'#f2f2f2',marginBottom:4 }}/><label htmlFor="cv" style={{ fontSize:11,color:'#737373',cursor:'pointer',marginBottom:4 }}>Verificado</label></div>
                  <div style={{ gridColumn:'1/-1' }}><label style={cLbl}>Fonte</label><select value={cardStyle.font} onChange={e=>setCardStyle(s=>({...s,font:e.target.value}))} style={cSel}>{FONT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                  <div style={{ gridColumn:'1/-1' }}><label style={cLbl}>Tamanho — {cardStyle.fontSize}px</label><input type="range" min={13} max={32} value={cardStyle.fontSize} onChange={e=>setCardStyle(s=>({...s,fontSize:+e.target.value}))} style={{ width:'100%',accentColor:'#f2f2f2' }}/></div>
                  <div style={{ gridColumn:'1/-1' }}><label style={cLbl}>Espaçamento — {cardStyle.lineHeight.toFixed(1)}</label><input type="range" min={1} max={2.2} step={0.1} value={cardStyle.lineHeight} onChange={e=>setCardStyle(s=>({...s,lineHeight:+e.target.value}))} style={{ width:'100%',accentColor:'#f2f2f2' }}/></div>
                  <div style={{ gridColumn:'1/-1' }}><label style={cLbl}>Margem — {cardStyle.padding}px</label><input type="range" min={16} max={80} value={cardStyle.padding} onChange={e=>setCardStyle(s=>({...s,padding:+e.target.value}))} style={{ width:'100%',accentColor:'#f2f2f2' }}/></div>
                </div>
              </div>
            )}

            {hasPost && currentPost && (
              <div style={{ marginTop:10 }}>
                <div style={{ background:'#161616',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,padding:13,whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.6,color:'#737373' }}>
                  {currentPost.formato==='estatico'?currentPost.post.copy:currentPost.formato==='carrossel'?currentPost.post.caption:currentPost.post.tweets?.map((t:any)=>t.texto).join('\n\n')}
                </div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginTop:8 }}>
                  {(currentPost.post.hashtags||[]).map((h:string,i:number)=>(
                    <span key={i} style={{ fontSize:11,color:'#737373',background:'#161616',border:'1px solid rgba(255,255,255,.07)',padding:'2px 8px',borderRadius:20 }}>#{h.replace(/^#/,'')}</span>
                  ))}
                </div>
              </div>
            )}

            {hasPost && (
              <div style={{ display:'flex',gap:6,marginTop:12,flexWrap:'wrap' }}>
                <button onClick={downloadCard} style={{ ...aBtn,background:'#e4e4e7',color:'#000',border:'none' }}>⬇ Baixar PNG</button>
                <button onClick={savePost} style={aBtn}>💾 Salvar</button>
                <button onClick={()=>setPlanModalOpen(true)} style={aBtn}>📅 Agendar</button>
                <button onClick={generatePost} disabled={loadingGen} style={aBtn}>↺ Nova versão</button>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Modal open={planModalOpen} onClose={()=>setPlanModalOpen(false)} title="Agendar post">
        <FormRow label="Data"><input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)} style={iStyle}/></FormRow>
        <FormRow label="Horário"><input type="time" value={planTime} onChange={e=>setPlanTime(e.target.value)} style={iStyle}/></FormRow>
        <FormRow label="Rede"><select value={planRede} onChange={e=>setPlanRede(e.target.value)} style={iStyle}><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option><option value="twitter">Twitter/X</option></select></FormRow>
        <FormRow label="Notas"><textarea value={planNotas} onChange={e=>setPlanNotas(e.target.value)} style={{ ...iStyle,minHeight:70,resize:'vertical' }}/></FormRow>
        <button onClick={schedulePost} style={pBtn}>Agendar</button>
      </Modal>
    </div>
  )
}

function CardPreview({ post, formato, style: s, slideIndex, avatarDataUrl, aiImageUrl }: { post:any, formato:string, style:CardStyle, slideIndex:number, avatarDataUrl:string|null, aiImageUrl:string|null }) {
  const ref = reactUseRef<HTMLDivElement>(null)
  const [pw, ph] = s.proporcao.split('x').map(Number)
  const w = ref.current?.offsetWidth || 500
  const previewH = Math.round(w * ph / pw)
  const html = buildCardHTML(post, formato, s, slideIndex, avatarDataUrl, aiImageUrl || undefined)
  return (
    <div ref={ref} style={{ width:'100%',height:previewH,overflow:'hidden',borderRadius:10,border:'1px solid rgba(255,255,255,.07)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function Panel({ id, title, children, style }: { id?:string, title:string, children:React.ReactNode, style?:React.CSSProperties }) {
  return (
    <div id={id} style={{ background:'#111',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:20,position:'relative',overflow:'hidden',...style }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)',pointerEvents:'none' }}/>
      <div style={{ fontSize:11,fontWeight:600,color:'#737373',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:16,display:'flex',alignItems:'center',gap:7 }}>
        <div style={{ width:4,height:4,borderRadius:'50%',background:'#404040' }}/>{title}
      </div>
      {children}
    </div>
  )
}

function FormRow({ label, children }: { label:string, children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:13 }}>
      <label style={{ display:'block',fontSize:11,color:'#737373',marginBottom:5,fontWeight:500,letterSpacing:'.05em',textTransform:'uppercase' as const }}>{label}</label>
      {children}
    </div>
  )
}

function Seg({ options, value, onChange }: { options:{v:string,l:string}[], value:string, onChange:(v:string)=>void }) {
  return (
    <div style={{ display:'flex',background:'#161616',borderRadius:8,padding:2,gap:1,border:'1px solid rgba(255,255,255,.07)' }}>
      {options.map(o=>(
        <button key={o.v} onClick={()=>onChange(o.v)} style={{ flex:1,padding:'6px 4px',border:value===o.v?'1px solid rgba(255,255,255,.12)':'1px solid transparent',background:value===o.v?'#111':'transparent',color:value===o.v?'#f2f2f2':'#737373',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:'inherit',transition:'all .15s' }}>{o.l}</button>
      ))}
    </div>
  )
}

function Chip({ children, color, bg, border }: { children:React.ReactNode, color?:string, bg?:string, border?:string }) {
  return <span style={{ fontSize:10,padding:'2px 7px',borderRadius:20,background:bg||'#161616',color:color||'#737373',border:`1px solid ${border||'rgba(255,255,255,.07)'}` }}>{children}</span>
}

function Spinner() {
  return <span style={{ display:'inline-block',width:13,height:13,border:'1.5px solid rgba(255,255,255,.15)',borderTopColor:'rgba(255,255,255,.6)',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>
}

const iStyle:React.CSSProperties={width:'100%',background:'#161616',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,padding:'9px 12px',color:'#f2f2f2',fontFamily:'inherit',fontSize:13,outline:'none'}
const pBtn:React.CSSProperties={width:'100%',padding:11,background:'#e4e4e7',color:'#000',border:'none',borderRadius:10,fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7}
const aBtn:React.CSSProperties={padding:'8px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:500,background:'#161616',color:'#737373'}
const snBtn:React.CSSProperties={background:'#111',border:'1px solid rgba(255,255,255,.12)',color:'#737373',width:26,height:26,borderRadius:6,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}
const cLbl:React.CSSProperties={display:'block',fontSize:10,color:'#404040',marginBottom:4,fontWeight:500,letterSpacing:'.05em',textTransform:'uppercase'}
const cInp:React.CSSProperties={width:'100%',background:'#111',border:'1px solid rgba(255,255,255,.12)',borderRadius:7,padding:'7px 9px',color:'#f2f2f2',fontSize:12,outline:'none',fontFamily:'inherit'}
const cSel:React.CSSProperties={...cInp}
const cClr:React.CSSProperties={width:'100%',height:32,border:'1px solid rgba(255,255,255,.12)',borderRadius:7,background:'#111',cursor:'pointer',padding:'2px 3px'}
