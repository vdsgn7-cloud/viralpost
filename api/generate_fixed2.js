export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nicho, redeSocial, formato, tema, writerProfile, stream = false } = req.body;
  if (!nicho || !redeSocial || !formato || !tema) {
    return res.status(400).json({ error: 'Campos obrigatórios: nicho, redeSocial, formato, tema' });
  }

  const wp = writerProfile || {};
  const tom = wp.tom || 'educativo';
  const formalidade = wp.formalidade || 'medio';
  const publico = wp.publico_alvo || 'pessoas interessadas no tema';
  const evitar = (wp.evitar || []).join(', ') || 'frases clichê, emojis em excesso';
  const tamanho = wp.tamanho_copy || 'medio';
  const palavras = (wp.palavras_chave || []).join(', ');
  const descricao = wp.descricao_pessoal || '';
  const exemplo = wp.exemplo_post || '';

  const tomMap = {
    direto: 'direto ao ponto, sem rodeios, provoca reflexão com afirmações fortes',
    educativo: 'explica de forma simples e clara, usa analogias e exemplos práticos',
    inspiracional: 'motiva e inspira, usa histórias e narrativa emocional',
    analitico: 'usa dados, fatos e raciocínio lógico, cita números quando possível',
    conversacional: 'fala como se estivesse numa conversa, próximo e acessível'
  };
  const formalMap = {
    informal: 'linguagem leve e próxima, mas sem gírias',
    medio: 'linguagem clara e natural',
    formal: 'linguagem profissional e precisa'
  };
  const tamanhoMap = {
    curto: 'máx 100 palavras no corpo',
    medio: '150-250 palavras no corpo',
    longo: '300-500 palavras no corpo'
  };

  const personalidadePrompt = `PERFIL DO ESCRITOR:
- Tom: ${tomMap[tom] || tom}
- Formalidade: ${formalMap[formalidade] || formalidade}
- Público: ${publico}
- Tamanho: ${tamanhoMap[tamanho] || tamanho}
- NUNCA use: ${evitar}
${palavras ? `- Palavras da voz: ${palavras}` : ''}
${descricao ? `- Autor: ${descricao}` : ''}
${exemplo ? `- Referência:\n"${exemplo}"` : ''}
Regras: português brasileiro, sem clichês, máx 2 emojis.`;

  const prompts = {
    estatico: `${personalidadePrompt}
Crie um post estático viral para ${redeSocial} sobre: "${tema}" no nicho ${nicho}.
Responda APENAS JSON válido sem markdown:
{"headline":"impacto máximo máx 12 palavras","copy":"corpo com parágrafos separados por linha dupla","cta":"ação direta","hashtags":["h1","h2","h3","h4","h5"],"emoji_abertura":"emoji"}`,

    carrossel: `${personalidadePrompt}
Crie carrossel viral para ${redeSocial} sobre: "${tema}" no nicho ${nicho}.
Responda APENAS JSON válido sem markdown:
{"headline":"título","slides":[{"numero":1,"titulo":"capa gancho","subtitulo":"subtítulo","tipo":"capa"},{"numero":2,"titulo":"ponto 1","corpo":"explicação","tipo":"conteudo"},{"numero":3,"titulo":"ponto 2","corpo":"explicação","tipo":"conteudo"},{"numero":4,"titulo":"ponto 3","corpo":"explicação","tipo":"conteudo"},{"numero":5,"titulo":"ponto 4","corpo":"explicação","tipo":"conteudo"},{"numero":6,"titulo":"conclusão","corpo":"CTA","tipo":"cta"}],"caption":"legenda","hashtags":["h1","h2","h3","h4","h5"]}`,

    thread: `${personalidadePrompt}
Crie thread viral Twitter/X sobre: "${tema}" no nicho ${nicho}.
Responda APENAS JSON válido sem markdown:
{"headline":"abertura máx 280 chars","tweets":[{"numero":1,"texto":"abertura","tipo":"abertura"},{"numero":2,"texto":"ponto 1","tipo":"conteudo"},{"numero":3,"texto":"ponto 2","tipo":"conteudo"},{"numero":4,"texto":"ponto 3","tipo":"conteudo"},{"numero":5,"texto":"ponto 4","tipo":"conteudo"},{"numero":6,"texto":"conclusão CTA","tipo":"cta"}],"hashtags":["h1","h2"]}`
  };

  const prompt = prompts[formato] || prompts.estatico;

  // ── MODO STREAMING ──────────────────────────────
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          stream: true,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        res.write(`data: ${JSON.stringify({ error: 'API error: ' + errText.slice(0, 200) })}\n\n`);
        res.end();
        return;
      }

      let fullText = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]' || data === '') continue;
          try {
            const parsed = JSON.parse(data);
            // Eventos de streaming da Anthropic
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              const delta = parsed.delta.text || '';
              if (delta) {
                fullText += delta;
                res.write(`data: ${JSON.stringify({ delta })}\n\n`);
              }
            }
          } catch {
            // ignora linhas malformadas
          }
        }
      }

      // Parseia o JSON completo acumulado
      if (!fullText.trim()) {
        res.write(`data: ${JSON.stringify({ error: 'Resposta vazia da IA' })}\n\n`);
        res.end();
        return;
      }

      try {
        const clean = fullText.replace(/```json|```/g, '').trim();
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('JSON não encontrado');
        const post = JSON.parse(clean.slice(start, end + 1));
        res.write(`data: ${JSON.stringify({ done: true, post, formato, nicho, redeSocial })}\n\n`);
      } catch (parseErr) {
        // Tenta fallback: usa o texto como copy direto
        console.error('Parse error, raw text:', fullText.slice(0, 500));
        res.write(`data: ${JSON.stringify({ error: 'Erro ao processar resposta. Tente novamente.' })}\n\n`);
      }

      res.end();
    } catch (err) {
      console.error('Streaming error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
    return;
  }

  // ── MODO NORMAL ─────────────────────────────────
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content?.[0]?.text || '';
    if (!text) return res.status(500).json({ error: 'Resposta vazia da IA' });

    let post;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      post = JSON.parse(clean.slice(start, end + 1));
    } catch {
      return res.status(500).json({ error: 'Erro ao processar resposta: ' + text.slice(0, 200) });
    }

    return res.status(200).json({ post, formato, nicho, redeSocial });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
