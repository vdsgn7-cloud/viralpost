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
    `- Público: ${wp.publico_alvo || 'pessoas interessadas'}`,
    `- Tamanho: ${tamanhoMap[wp.tamanho_copy] || 'medio'}`,
    `- NUNCA use: ${(wp.evitar || []).join(', ') || 'clichês'}`,
    wp.palavras_chave?.length ? `- Palavras da voz: ${wp.palavras_chave.join(', ')}` : '',
    wp.descricao_pessoal ? `- Sobre o autor: ${wp.descricao_pessoal}` : '',
    wp.exemplo_post ? `- Referência: "${wp.exemplo_post}"` : '',
    'Regras: português brasileiro, máx 2 emojis, sem tags HTML na resposta.',
  ].filter(Boolean).join('\n')

  const prompts: Record<string, string> = {
    estatico: `${perfil}\nCrie post estático viral para ${redeSocial} sobre: "${tema}" no nicho ${nicho}.\nResposta SOMENTE JSON sem markdown:\n{"headline":"impacto máx 12 palavras","copy":"corpo com parágrafos separados por linha dupla","cta":"ação direta","hashtags":["h1","h2","h3","h4","h5"],"emoji_abertura":"emoji"}`,
    carrossel: `${perfil}\nCrie carrossel viral para ${redeSocial} sobre: "${tema}" no nicho ${nicho}.\nResposta SOMENTE JSON sem markdown:\n{"headline":"título","slides":[{"numero":1,"titulo":"capa gancho","subtitulo":"sub","tipo":"capa"},{"numero":2,"titulo":"p1","corpo":"exp","tipo":"conteudo"},{"numero":3,"titulo":"p2","corpo":"exp","tipo":"conteudo"},{"numero":4,"titulo":"p3","corpo":"exp","tipo":"conteudo"},{"numero":5,"titulo":"p4","corpo":"exp","tipo":"conteudo"},{"numero":6,"titulo":"conclusão","corpo":"CTA","tipo":"cta"}],"caption":"legenda","hashtags":["h1","h2","h3","h4","h5"]}`,
    thread: `${perfil}\nCrie thread viral Twitter/X sobre: "${tema}" no nicho ${nicho}.\nResposta SOMENTE JSON sem markdown:\n{"headline":"abertura máx 280 chars","tweets":[{"numero":1,"texto":"abertura","tipo":"abertura"},{"numero":2,"texto":"p1","tipo":"conteudo"},{"numero":3,"texto":"p2","tipo":"conteudo"},{"numero":4,"texto":"p3","tipo":"conteudo"},{"numero":5,"texto":"p4","tipo":"conteudo"},{"numero":6,"texto":"conclusão CTA","tipo":"cta"}],"hashtags":["h1","h2"]}`
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
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, stream: true, messages: [{ role: 'user', content: prompt }] })
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
            if (start === -1 || end === -1) throw new Error('JSON não encontrado')
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
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
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
