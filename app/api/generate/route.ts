import { NextRequest } from 'next/server'

const strip = (s: string) => s.replace(/<[^>]*>/g, '').trim()

export async function POST(req: NextRequest) {
  const { nicho, redeSocial, formato, tema, writerProfile, stream = false } = await req.json()
  if (!nicho || !redeSocial || !formato || !tema) {
    return new Response(JSON.stringify({ error: 'Campos obrigatórios' }), { status: 400 })
  }

  const wp = writerProfile || {}
  const tomMap: Record<string, string> = {
    direto: 'direto ao ponto, sem rodeios, afirmações fortes',
    educativo: 'explica com clareza, usa analogias e exemplos práticos',
    inspiracional: 'motiva e inspira, narrativa emocional',
    analitico: 'dados, fatos, raciocínio lógico',
    conversacional: 'próximo, como conversa com amigo'
  }
  const formalMap: Record<string, string> = { informal: 'linguagem leve', medio: 'linguagem clara e natural', formal: 'linguagem profissional' }
  const tamanhoMap: Record<string, string> = { curto: 'máx 100 palavras', medio: '150-250 palavras', longo: '300-500 palavras' }

  const perfil = [
    'PERFIL DO ESCRITOR:',
    `- Tom: ${tomMap[wp.tom] || 'educativo'}`,
    `- Formalidade: ${formalMap[wp.formalidade] || 'medio'}`,
    `- Publico: ${wp.publico_alvo || 'pessoas interessadas'}`,
    `- Tamanho: ${tamanhoMap[wp.tamanho_copy] || 'medio'}`,
    `- NUNCA use: ${(wp.evitar || []).join(', ') || 'cliches'}`,
    wp.palavras_chave?.length ? `- Palavras da voz: ${wp.palavras_chave.join(', ')}` : '',
    wp.descricao_pessoal ? `- Sobre o autor: ${wp.descricao_pessoal}` : '',
    wp.exemplo_post ? `- Referencia: "${wp.exemplo_post}"` : '',
    'Regras: portugues brasileiro, max 2 emojis, sem tags HTML na resposta.',
  ].filter(Boolean).join('\n')

  // image_prompt = descrição em inglês para gerar imagem via IA no card
  const prompts: Record<string, string> = {
    estatico: `${perfil}
Crie post estatico viral para ${redeSocial} sobre: "${tema}" no nicho ${nicho}.
Resposta SOMENTE JSON sem markdown:
{"headline":"frase de impacto max 12 palavras","copy":"corpo separado por linha dupla entre paragrafos","cta":"acao direta","hashtags":["h1","h2","h3","h4","h5"],"emoji_abertura":"emoji","image_prompt":"visual concept in english for AI image generation, abstract or metaphorical, no text, professional"}`,

    carrossel: `${perfil}
Crie carrossel viral para ${redeSocial} sobre: "${tema}" no nicho ${nicho}.
Resposta SOMENTE JSON sem markdown:
{"headline":"titulo","slides":[{"numero":1,"titulo":"headline de capa impactante max 8 palavras","subtitulo":"subtitulo complementar max 12 palavras","tipo":"capa","image_prompt":"visual concept in english for cover slide AI image, dramatic, no text"},{"numero":2,"titulo":"ponto 1","corpo":"explicacao","tipo":"conteudo"},{"numero":3,"titulo":"ponto 2","corpo":"explicacao","tipo":"conteudo"},{"numero":4,"titulo":"ponto 3","corpo":"explicacao","tipo":"conteudo"},{"numero":5,"titulo":"ponto 4","corpo":"explicacao","tipo":"conteudo"},{"numero":6,"titulo":"conclusao","corpo":"CTA direto","tipo":"cta"}],"caption":"legenda","hashtags":["h1","h2","h3","h4","h5"]}`,

    thread: `${perfil}
Crie thread viral Twitter/X sobre: "${tema}" no nicho ${nicho}.
Resposta SOMENTE JSON sem markdown:
{"headline":"abertura max 280 chars","tweets":[{"numero":1,"texto":"abertura gancho","tipo":"abertura"},{"numero":2,"texto":"ponto 1","tipo":"conteudo"},{"numero":3,"texto":"ponto 2","tipo":"conteudo"},{"numero":4,"texto":"ponto 3","tipo":"conteudo"},{"numero":5,"texto":"ponto 4","tipo":"conteudo"},{"numero":6,"texto":"conclusao CTA","tipo":"cta"}],"hashtags":["h1","h2"],"image_prompt":"visual concept in english for twitter card, clean minimal, no text"}`
  }

  const prompt = prompts[formato] || prompts.estatico

  if (stream) {
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1400, stream: true, messages: [{ role: 'user', content: prompt }] })
          })

          let fullText = ''
          const reader = response.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const d = line.replace('data: ', '').trim()
              if (d === '[DONE]' || !d) continue
              try {
                const parsed = JSON.parse(d)
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  const delta = parsed.delta.text || ''
                  if (delta) { fullText += delta; controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: strip(delta) })}\n\n`)) }
                }
              } catch {}
            }
          }

          try {
            const clean = strip(fullText).replace(/```json|```/g, '').trim()
            const start = clean.indexOf('{'), end = clean.lastIndexOf('}')
            if (start === -1 || end === -1) throw new Error('JSON nao encontrado')
            const post = JSON.parse(clean.slice(start, end + 1))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, post, formato, nicho, redeSocial })}\n\n`))
          } catch {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Erro ao processar. Tente novamente.' })}\n\n`))
          }
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
        }
        controller.close()
      }
    })
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1400, messages: [{ role: 'user', content: prompt }] })
  })
  const data = await response.json()
  if (data.error) return new Response(JSON.stringify({ error: data.error.message }), { status: 500 })
  const text = strip(data.content?.[0]?.text || '')
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const post = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1))
    return new Response(JSON.stringify({ post, formato, nicho, redeSocial }), { headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Erro ao processar: ' + text.slice(0, 200) }), { status: 500 })
  }
}
