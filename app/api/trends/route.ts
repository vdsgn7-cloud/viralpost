import { NextRequest, NextResponse } from 'next/server'

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

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
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
      tool_choice: { type: 'auto' },
      system: `Você é especialista em marketing digital viral para redes sociais brasileiras.
REGRAS: Use web_search. Responda SOMENTE com JSON válido. NUNCA inclua tags HTML como <cite> na resposta.`,
      messages: [{
        role: 'user',
        content: `Pesquise tendências de "${nicho}" para ${redesMap[redeSocial]} em ${new Date().getFullYear()}.
Liste as 5 melhores oportunidades de conteúdo viral.
Responda SOMENTE com este JSON (sem texto adicional, sem markdown):
{"trends":[{"titulo":"tema em alta","descricao":"por que está viral","angulo":"ângulo criativo","potencial":"alto","tipo":"novidade"}]}`
      }]
    })
  })

  const data = await response.json()
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 })

  let jsonText = ''
  for (const block of (data.content || [])) {
    if (block.type === 'text') { jsonText = block.text; break }
  }

  // Remove todas as tags HTML (cite, a, span etc)
  jsonText = stripTags(jsonText)

  try {
    const clean = jsonText.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('{'), end = clean.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('JSON não encontrado')
    const parsed = JSON.parse(clean.slice(start, end + 1))
    // Sanitiza campos de texto dentro do JSON
    if (parsed.trends) {
      parsed.trends = parsed.trends.map((t: any) => ({
        ...t,
        titulo: stripTags(String(t.titulo || '')),
        descricao: stripTags(String(t.descricao || '')),
        angulo: stripTags(String(t.angulo || '')),
      }))
    }
    return NextResponse.json(parsed)
  } catch {
    console.error('Trends parse error. Raw:', jsonText.slice(0, 400))
    return NextResponse.json({ error: 'Falha ao processar. Tente novamente.' }, { status: 500 })
  }
}
