export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nicho, redeSocial, formato, tema, estiloVisual } = req.body;
  if (!nicho || !redeSocial || !formato || !tema) {
    return res.status(400).json({ error: 'Campos obrigatórios: nicho, redeSocial, formato, tema' });
  }

  const estiloDesc = estiloVisual?.description || 'estilo profissional e direto';
  const mood = estiloVisual?.mood || 'professional';
  const palette = estiloVisual?.palette || {};
  const layout = estiloVisual?.layout || 'centered';

  const estiloInstrucoes = estiloVisual ? `
ESTILO VISUAL DE REFERÊNCIA (clone este estilo):
- Descrição: ${estiloDesc}
- Tom/mood: ${mood}
- Layout: ${layout}
- Cores predominantes: fundo ${palette.background || 'escuro'}, texto ${palette.text || 'claro'}, destaque ${palette.accent || 'colorido'}
- Tipografia: ${estiloVisual.typography?.headingStyle || 'sans'} para títulos, peso ${estiloVisual.typography?.headingWeight || 'bold'}
- Bordas: ${estiloVisual.borderRadius || 'medium'}
Use esse estilo para definir o tom do copy: se o estilo for luxury/elegant, o copy é refinado e aspiracional. Se for bold/energetic, o copy é direto e impactante.
` : 'Use estilo profissional e direto.';

  const prompts = {
    estatico: `Crie um post estático EXTREMAMENTE viral para ${redeSocial} sobre: "${tema}" no nicho de ${nicho}.

${estiloInstrucoes}

REGRAS OBRIGATÓRIAS:
- Headline deve causar curiosidade ou choque imediato
- Copy deve ter gancho forte na primeira linha
- Use quebras de linha para facilitar leitura
- CTA específico e urgente

Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois:
{
  "headline": "headline de impacto máximo aqui (máx 10 palavras)",
  "copy": "corpo completo do post com quebras de linha\\n\\nparágrafos separados\\n\\ncta no final",
  "cta": "call to action específico e urgente",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "emoji_abertura": "🔥"
}`,

    carrossel: `Crie um carrossel EXTREMAMENTE viral para ${redeSocial} sobre: "${tema}" no nicho de ${nicho}.

${estiloInstrucoes}

REGRAS: Capa com gancho poderoso, slides com conteúdo denso e útil, último slide com CTA forte.

Responda APENAS com JSON válido, sem markdown:
{
  "headline": "título geral do carrossel",
  "slides": [
    { "numero": 1, "titulo": "gancho poderoso que faz parar o scroll", "subtitulo": "subtítulo complementar", "tipo": "capa" },
    { "numero": 2, "titulo": "Ponto 1 revelador", "corpo": "explicação detalhada e útil do ponto 1 em até 2 frases", "tipo": "conteudo" },
    { "numero": 3, "titulo": "Ponto 2 surpreendente", "corpo": "explicação detalhada e útil do ponto 2 em até 2 frases", "tipo": "conteudo" },
    { "numero": 4, "titulo": "Ponto 3 prático", "corpo": "explicação detalhada e útil do ponto 3 em até 2 frases", "tipo": "conteudo" },
    { "numero": 5, "titulo": "Ponto 4 transformador", "corpo": "explicação detalhada e útil do ponto 4 em até 2 frases", "tipo": "conteudo" },
    { "numero": 6, "titulo": "Agora é com você!", "corpo": "conclusão poderosa + chamada para ação direta", "tipo": "cta" }
  ],
  "caption": "legenda completa para o post com gancho + valor + hashtags naturais",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}`,

    thread: `Crie uma thread EXTREMAMENTE viral para Twitter/X sobre: "${tema}" no nicho de ${nicho}.

${estiloInstrucoes}

REGRAS: Primeiro tweet é o gancho que faz salvar, tweets seguintes entregam valor real, último pede RT.

Responda APENAS com JSON válido, sem markdown:
{
  "headline": "primeiro tweet — gancho máximo em até 280 chars",
  "tweets": [
    { "numero": 1, "texto": "tweet de abertura com gancho poderoso que gera curiosidade (máx 280 chars)", "tipo": "abertura" },
    { "numero": 2, "texto": "desenvolvimento ponto 1 com informação surpreendente (máx 280 chars)", "tipo": "conteudo" },
    { "numero": 3, "texto": "desenvolvimento ponto 2 com dica prática (máx 280 chars)", "tipo": "conteudo" },
    { "numero": 4, "texto": "desenvolvimento ponto 3 com dado ou exemplo real (máx 280 chars)", "tipo": "conteudo" },
    { "numero": 5, "texto": "desenvolvimento ponto 4 com insight exclusivo (máx 280 chars)", "tipo": "conteudo" },
    { "numero": 6, "texto": "conclusão poderosa + pede RT + CTA (máx 280 chars)", "tipo": "cta" }
  ],
  "hashtags": ["hashtag1", "hashtag2"]
}`
  };

  const prompt = prompts[formato] || prompts.estatico;

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
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.[0]?.text || '{}';

    let post;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      post = JSON.parse(clean.slice(start, end + 1));
    } catch {
      return res.status(500).json({ error: 'Erro ao parsear post: ' + text.slice(0, 200) });
    }

    return res.status(200).json({ post, formato, nicho, redeSocial });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
