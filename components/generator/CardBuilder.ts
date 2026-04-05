// components/generator/CardBuilder.ts
// Builds the HTML string for post cards — used for preview and download

export interface CardStyle {
  bg: string
  text: string
  font: string
  fontSize: number
  lineHeight: number
  padding: number
  name: string
  handle: string
  verified: boolean
  verifiedColor: string
  proporcao: string
  accentColor: string
}

export const DEFAULT_STYLE: CardStyle = {
  bg: '#ffffff',
  text: '#0f1419',
  font: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  fontSize: 20,
  lineHeight: 1.55,
  padding: 44,
  name: '',
  handle: '',
  verified: true,
  verifiedColor: '#1d9bf0',
  proporcao: '1080x1350',
  accentColor: '#1d9bf0',
}

function verifiedBadge(color: string) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="${color}" style="margin-left:4px;flex-shrink:0;vertical-align:middle"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.87 9.33 2 10.57 2 12s.87 2.67 2.19 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>`
}

function avatarHTML(avatarDataUrl: string | null, textColor: string) {
  if (avatarDataUrl) {
    return `<img src="${avatarDataUrl}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0"/>`
  }
  return `<div style="width:48px;height:48px;border-radius:50%;background:${textColor}18;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden"><svg width="28" height="28" viewBox="0 0 24 24" fill="${textColor}66"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg></div>`
}

function profileHeader(s: CardStyle, avatarDataUrl: string | null, textColor?: string) {
  const tc = textColor || s.text
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
    ${avatarHTML(avatarDataUrl, tc)}
    <div>
      <div style="display:flex;align-items:center;gap:2px">
        <span style="font-family:${s.font};font-size:15px;font-weight:700;color:${tc}">${s.name || 'Seu Nome'}</span>
        ${s.verified ? verifiedBadge(s.verifiedColor) : ''}
      </div>
      <div style="font-family:${s.font};font-size:13px;color:${tc}88;margin-top:1px">${s.handle ? (s.handle.startsWith('@') ? s.handle : '@' + s.handle) : '@seuhandle'}</div>
    </div>
  </div>`
}

// ─── ESTÁTICO ─────────────────────────────────────
function buildEstatico(post: any, s: CardStyle, avatarDataUrl: string | null, aiImageUrl?: string): string {
  const fs = s.fontSize + 'px', lh = s.lineHeight, pad = s.padding + 'px'

  if (aiImageUrl) {
    // Layout com imagem AI no topo (60%) + texto embaixo
    return `<div style="background:${s.bg};width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;position:relative">
      <div style="flex:0 0 55%;position:relative;overflow:hidden">
        <img src="${aiImageUrl}" style="width:100%;height:100%;object-fit:cover"/>
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,${s.bg}ee 100%)"/>
      </div>
      <div style="flex:1;padding:${pad};padding-top:16px;display:flex;flex-direction:column">
        ${profileHeader(s, avatarDataUrl)}
        <div style="font-family:${s.font};font-size:calc(${fs} + 2px);font-weight:800;color:${s.text};line-height:1.2;letter-spacing:-.02em;margin-bottom:12px">${post.headline || ''}</div>
        <div style="font-family:${s.font};font-size:calc(${fs} - 3px);color:${s.text}cc;line-height:${lh};flex:1">${(post.copy || '').split(/\n\n+/)[0]}</div>
        <div style="font-family:${s.font};font-size:13px;font-weight:700;color:${s.verifiedColor};margin-top:12px">${post.cta || ''}</div>
      </div>
    </div>`
  }

  // Layout tipográfico puro — impactante sem imagem
  const paragraphs = (post.copy || '').split(/\n\n+/).filter((x: string) => x.trim())
  const paras = paragraphs.map((p: string) =>
    `<p style="margin:0 0 16px 0;font-family:${s.font};font-size:${fs};color:${s.text};line-height:${lh}">${p.trim()}</p>`
  ).join('')

  return `<div style="background:${s.bg};padding:${pad};width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden">
    ${profileHeader(s, avatarDataUrl)}
    <div style="font-family:${s.font};font-size:calc(${fs} + 6px);font-weight:800;color:${s.text};line-height:1.15;letter-spacing:-.03em;margin-bottom:20px;flex-shrink:0">${post.headline || ''}</div>
    <div style="flex:1;overflow:hidden">${paras}</div>
    <div style="font-family:${s.font};font-size:14px;font-weight:700;color:${s.verifiedColor};margin-top:8px;flex-shrink:0">${post.cta || ''}</div>
  </div>`
}

// ─── CARROSSEL ────────────────────────────────────
function buildCarrossel(post: any, s: CardStyle, slideIndex: number, avatarDataUrl: string | null, aiImageUrl?: string): string {
  const slides = post.slides || []
  const sl = slides[slideIndex] || slides[0]
  const fs = s.fontSize + 'px', lh = s.lineHeight, pad = s.padding + 'px'
  const total = slides.length

  // CAPA (slide 0) — layout impactante
  if (slideIndex === 0 || sl?.tipo === 'capa') {
    if (aiImageUrl) {
      // Capa com imagem full-bleed + overlay + texto
      return `<div style="background:#000;width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;position:relative">
        <img src="${aiImageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.65"/>
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,.7) 0%,rgba(0,0,0,.3) 100%)"/>
        <div style="position:relative;z-index:1;padding:${pad};display:flex;flex-direction:column;height:100%">
          ${profileHeader(s, avatarDataUrl, '#ffffff')}
          <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end">
            <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:10px;font-family:${s.font}">1/${total}</div>
            <div style="font-family:${s.font};font-size:calc(${fs} + 10px);font-weight:900;color:#ffffff;line-height:1.1;letter-spacing:-.03em;margin-bottom:14px">${sl?.titulo || post.headline || ''}</div>
            ${sl?.subtitulo ? `<div style="font-family:${s.font};font-size:calc(${fs} - 2px);color:rgba(255,255,255,.8);line-height:1.4">${sl.subtitulo}</div>` : ''}
          </div>
        </div>
      </div>`
    }

    // Capa tipográfica bold — sem imagem
    return `<div style="background:${s.text};width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;padding:${pad};position:relative">
      <div style="position:absolute;top:0;right:0;width:200px;height:200px;border-radius:50%;background:${s.verifiedColor}22;transform:translate(50%,-50%)"/>
      <div style="position:absolute;bottom:0;left:0;width:150px;height:150px;border-radius:50%;background:${s.verifiedColor}15;transform:translate(-40%,40%)"/>
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%">
        ${profileHeader(s, avatarDataUrl, '#ffffff')}
        <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end">
          <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:10px;font-family:${s.font}">1/${total}</div>
          <div style="font-family:${s.font};font-size:calc(${fs} + 8px);font-weight:900;color:#ffffff;line-height:1.1;letter-spacing:-.03em;margin-bottom:12px">${sl?.titulo || post.headline || ''}</div>
          ${sl?.subtitulo ? `<div style="font-family:${s.font};font-size:calc(${fs} - 2px);color:rgba(255,255,255,.7);line-height:1.4">${sl.subtitulo}</div>` : ''}
          <div style="width:40px;height:3px;background:${s.verifiedColor};border-radius:2px;margin-top:20px"/>
        </div>
      </div>
    </div>`
  }

  // SLIDE CTA (último)
  if (sl?.tipo === 'cta') {
    return `<div style="background:${s.verifiedColor};width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;padding:${pad}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:auto">
        <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.7);font-family:${s.font}">${sl.numero}/${total}</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
        <div style="font-family:${s.font};font-size:calc(${fs} + 6px);font-weight:900;color:#ffffff;line-height:1.15;letter-spacing:-.03em;margin-bottom:16px">${sl?.titulo || 'Salva e compartilha!'}</div>
        <div style="font-family:${s.font};font-size:calc(${fs} - 2px);color:rgba(255,255,255,.85);line-height:${lh}">${sl?.corpo || ''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:24px">
        ${avatarHTML(avatarDataUrl, '#ffffff')}
        <div>
          <div style="font-family:${s.font};font-size:14px;font-weight:700;color:#ffffff">${s.name || 'Seu Nome'}</div>
          <div style="font-family:${s.font};font-size:12px;color:rgba(255,255,255,.7)">${s.handle ? (s.handle.startsWith('@') ? s.handle : '@' + s.handle) : '@seuhandle'}</div>
        </div>
      </div>
    </div>`
  }

  // SLIDE CONTEÚDO
  return `<div style="background:${s.bg};padding:${pad};width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div style="width:32px;height:3px;background:${s.verifiedColor};border-radius:2px"/>
      <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${s.text}55;font-family:${s.font}">${sl?.numero}/${total}</div>
    </div>
    <div style="font-family:${s.font};font-size:calc(${fs} + 2px);font-weight:800;color:${s.text};line-height:1.2;letter-spacing:-.02em;margin-bottom:16px">${sl?.titulo || ''}</div>
    <div style="font-family:${s.font};font-size:${fs};color:${s.text}cc;line-height:${lh};flex:1">${sl?.corpo || ''}</div>
  </div>`
}

// ─── THREAD ───────────────────────────────────────
function buildThread(post: any, s: CardStyle, slideIndex: number, avatarDataUrl: string | null, aiImageUrl?: string): string {
  const tweets = post.tweets || []
  const t = tweets[slideIndex] || tweets[0]
  const fs = s.fontSize + 'px', lh = s.lineHeight, pad = s.padding + 'px'

  return `<div style="background:${s.bg};padding:${pad};width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden">
    ${profileHeader(s, avatarDataUrl)}
    ${aiImageUrl && slideIndex === 0 ? `<div style="width:100%;height:180px;border-radius:12px;overflow:hidden;margin-bottom:16px;flex-shrink:0"><img src="${aiImageUrl}" style="width:100%;height:100%;object-fit:cover"/></div>` : ''}
    <div style="font-family:${s.font};font-size:${slideIndex === 0 ? 'calc(' + fs + ' + 2px)' : fs};font-weight:${slideIndex === 0 ? '600' : '400'};color:${s.text};line-height:${lh};flex:1">${t?.texto || ''}</div>
    ${slideIndex === 0 ? `<div style="display:flex;align-items:center;gap:6px;margin-top:14px;font-family:${s.font};font-size:13px;color:${s.text}55"><span>🧵</span><span>${tweets.length} partes</span></div>` : ''}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1px solid ${s.text}12">
      <span style="font-family:${s.font};font-size:12px;color:${s.text}44">${slideIndex + 1}/${tweets.length}</span>
      <span style="font-family:${s.font};font-size:12px;color:${s.verifiedColor};font-weight:600">${s.handle ? (s.handle.startsWith('@') ? s.handle : '@' + s.handle) : '@seuhandle'}</span>
    </div>
  </div>`
}

// ─── MAIN EXPORT ──────────────────────────────────
export function buildCardHTML(
  post: any,
  formato: string,
  s: CardStyle,
  slideIndex: number,
  avatarDataUrl: string | null,
  aiImageUrl?: string
): string {
  if (formato === 'estatico') return buildEstatico(post, s, avatarDataUrl, aiImageUrl)
  if (formato === 'carrossel') return buildCarrossel(post, s, slideIndex, avatarDataUrl, aiImageUrl)
  if (formato === 'thread') return buildThread(post, s, slideIndex, avatarDataUrl, aiImageUrl)
  return ''
}
