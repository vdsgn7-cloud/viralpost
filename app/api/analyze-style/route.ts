import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, mediaType = 'image/jpeg' } = await req.json()
  if (!imageBase64) return NextResponse.json({ error: 'imageBase64 obrigatório' }, { status: 400 })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: `Analise este post e extraia o estilo visual. Responda APENAS JSON sem markdown:
{"palette":{"background":"#hex","primary":"#hex","secondary":"#hex","text":"#hex","accent":"#hex"},"typography":{"headingStyle":"serif|sans","headingWeight":"bold|medium","fontSize":"small|medium|large"},"layout":"centered|left-aligned|minimal","mood":"professional|casual|bold|elegant","borderRadius":"none|small|medium|large","description":"descrição em 1 frase"}` }
        ]
      }]
    })
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || '{}'
  try {
    const style = JSON.parse(text)
    return NextResponse.json({ style })
  } catch {
    return NextResponse.json({ style: { palette: { background: '#ffffff', text: '#0f1419', accent: '#1d9bf0' }, description: 'Estilo limpo e profissional' } })
  }
}
