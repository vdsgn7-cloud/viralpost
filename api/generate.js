// api/generate.js
// Gera copy viral completo: estático, carrossel ou thread

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nicho, redeSocial, formato, tema, estiloVisual } = req.body;
  if (!nicho || !redeSocial || !formato || !tema) {
    return res.status(400).json({ error: 'Campos obrigatórios: nicho, redeSocial, formato, tema' });
  }

  const estiloDesc = estiloVisual?.description || 'estilo profissional e direto';
  const mood = estiloVisual?.mood || 'professional';

  const promptsFormato = {
    estatico: `Crie um post estático viral para ${redeSocial} sobre "${tema}" no nicho de ${nicho}.
Tom: ${mood}. Estilo: ${estiloDesc}.

Responda APENAS com JSON válido:
{
  "headline": "Frase de impacto máximo para capturar atenção (máx 10 palavras)",
  "copy": "Corpo do post completo, formatado para ${redeSocial}, com quebras de linha. Use ganchos, storytelling e CTA. Máx 300 palavras.",
  "cta": "Call-to-action específico e direto",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "emoji_abertura": "1 emoji representativo do tema"
}`,

    carrossel: `Crie um carrossel viral para ${redeSocial} sobre "${tema}" no nicho de ${nicho}.
Tom: ${mood}. Estilo: ${estiloDesc}.

Responda APENAS com JSON válido:
{
  "headline": "Título geral do carrossel (máx 8 palavras)",
  "slides": [
    { "numero": 1, "titulo": "Slide de capa — gancho poderoso", "subtitulo": "Subtítulo opcional", "tipo": "capa" },
    { "numero": 2, "titulo": "Ponto 1", "corpo": "Explicação do ponto 1 (máx 50 palavras)", "tipo": "conteudo" },
    { "numero": 3, "titulo": "Ponto 2", "corpo": "Explicação do ponto 2 (máx 50 palavras)", "tipo": "conteudo" },
    { "numero": 4, "titulo": "Ponto 3", "corpo": "Explicação do ponto 3 (máx 50 palavras)", "tipo": "conteudo" },
    { "numero": 5, "titulo": "Ponto 4", "corpo": "Explicação do ponto 4 (máx 50 palavras)", "tipo": "conteudo" },
    { "numero": 6, "titulo": "Conclusão + CTA", "corpo": "Fechamento e chamada para ação", "tipo": "cta" }
  ],
  "caption": "Legenda do post para ${redeSocial} (máx 150 palavras)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}`,

    thread: `Crie uma thread viral para Twitter/X sobre "${tema}" no nicho de ${nicho}.
Tom: ${mood}. Estilo: ${estiloDesc}.

Responda APENAS com JSON válido:
{
  "headline": "Tweet de abertura — gancho máximo (máx 280 chars)",
  "tweets": [
    { "numero": 1, "texto": "Tweet de abertura com gancho poderoso", "tipo": "abertura" },
    { "numero": 2, "texto": "Desenvolvimento do ponto 1", "tipo": "conteudo" },
    { "numero": 3, "texto": "Desenvolvimento do ponto 2", "tipo": "conteudo" },
    { "numero": 4, "texto": "Desenvolvimento do ponto 3", "tipo": "conteudo" },
    { "numero": 5, "texto": "Desenvolvimento do ponto 4", "tipo": "conteudo" },
    { "numero": 6, "texto": "Conclusão + CTA + pede RT", "tipo": "cta" }
  ],
  "hashtags": ["hashtag1", "hashtag2"]
}`
  };

  const prompt = promptsFormato[formato] || promptsFormato.estatico;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    let post;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      post = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'Erro ao parsear resposta da IA' });
    }

    return res.status(200).json({ post, formato, nicho, redeSocial });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao gerar post' });
  }
}
