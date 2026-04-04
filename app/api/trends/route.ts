import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { nicho, redeSocial = 'instagram' } = await req.json()
  if (!nicho) return NextResponse.json({ error: 'nicho obrigatório' }, { status: 400 })

  const redesMap: Record<string, string> = { instagram: 'Instagram e Reels', linkedin: 'LinkedIn', twitter: 'Twitter/X' }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
      tool_choice: { type: 'auto' },
      system: 'Você é especialista em marketing digital viral para redes sociais brasileiras. SEMPRE use web_search antes de responder.',
      messages: [{
        role: 'user',
        content: `Pesquise: "tendências ${nicho} ${new Date().getFullYear()} viral ${redesMap[redeSocial]}" e "${nicho} notícia recente brasil"

Liste as 5 melhores oportunidades de conteúdo viral para "${nicho}" no ${redesMap[redeSocial]}.
Responda APENAS JSON sem markdown:
{"trends":[{"titulo":"tema atual","descricao":"por que está em alta","angulo":"ângulo criativo","potencial":"alto","tipo":"novidade"}]}`
      }]
    })
  })

  const data = await response.json()
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 })

  let jsonText = ''
  for (const block of data.content || []) {
    if (block.type === 'text') jsonText = block.text
  }

  try {
    const clean = jsonText.replace(/```json|```/g, '').trim()
    const trends = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1))
    return NextResponse.json(trends)
  } catch {
    return NextResponse.json({ error: 'Falha ao parsear: ' + jsonText.slice(0, 200) }, { status: 500 })
  }
}
