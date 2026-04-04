// api/generate.js — usa perfil do escritor para personalizar o copy

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nicho, redeSocial, formato, tema, writerProfile } = req.body;
  if (!nicho || !redeSocial || !formato || !tema) {
    return res.status(400).json({ error: 'Campos obrigatórios: nicho, redeSocial, formato, tema' });
  }

  // Monta instruções de personalidade a partir do perfil
  const wp = writerProfile || {};
  const tom = wp.tom || 'educativo';
  const formalidade = wp.formalidade || 'medio';
  const publico = wp.publico_alvo || 'pessoas interessadas no tema';
  const evitar = (wp.evitar || []).join(', ') || 'frases clichê, emojis em excesso';
  const tamanho = wp.tamanho_copy || 'medio';
  const descricao = wp.descricao_pessoal || '';
  const exemplo = wp.exemplo_post || '';
  const palavras = (wp.palavras_chave || []).join(', ');

  const tomMap = {
    direto: 'direto ao ponto, sem rodeios, provoca reflexão com afirmações fortes',
    educativo: 'explica de forma simples e clara, usa analogias e exemplos práticos',
    inspiracional: 'motiva e inspira, usa histórias e narrativa emocional',
    analitico: 'usa dados, fatos e raciocínio lógico, cita números quando possível',
    conversacional: 'fala como se estivesse numa conversa, próximo e acessível'
  };

  const formalMap = {
    informal: 'linguagem leve e próxima, mas sem gírias',
    medio: 'linguagem clara e natural, nem muito formal nem muito informal',
    formal: 'linguagem profissional e precisa'
  };

  const tamanhoMap = {
    curto: 'seja conciso: máx 100 palavras no corpo',
    medio: 'tamanho equilibrado: 150-250 palavras no corpo',
    longo: 'seja completo e detalhado: 300-500 palavras no corpo'
  };

  const personalidadePrompt = `
PERFIL DO ESCRITOR (siga rigorosamente):
- Tom: ${tomMap[tom] || tom}
- Formalidade: ${formalMap[formalidade] || formalidade}
- Público-alvo: ${publico}
- Tamanho: ${tamanhoMap[tamanho] || tamanho}
- NUNCA use: ${evitar}
${palavras ? `- Palavras e conceitos que fazem parte da voz do autor: ${palavras}` : ''}
${descricao ? `- Sobre o autor: ${descricao}` : ''}
${exemplo ? `- Exemplo de post no estilo correto para referência:\n"${exemplo}"` : ''}

REGRAS ABSOLUTAS:
- Escreva em português brasileiro
- Não use frases motivacionais genéricas
- Não exagere em emojis (máx 2 por post)
- Cada frase deve ter propósito real
- Prefira clareza à sofisticação
`;

  const prompts = {
    estatico: `${personalidadePrompt}

Agora crie um post estático viral para ${redeSocial} sobre: "${tema}" no nicho de ${nicho}.

Responda APENAS com JSON válido, sem markdown:
{
  "headline": "frase de impacto que para o scroll (máx 12 palavras)",
  "copy": "corpo completo do post com quebras de linha duplas entre parágrafos",
  "cta": "chamada para ação direta e específica",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "emoji_abertura": "1 emoji no máximo"
}`,

    carrossel: `${personalidadePrompt}

Crie um carrossel viral para ${redeSocial} sobre: "${tema}" no nicho de ${nicho}.

Responda APENAS com JSON válido, sem markdown:
{
  "headline": "título geral do carrossel",
  "slides": [
    { "numero": 1, "titulo": "capa com gancho forte", "subtitulo": "complemento da capa", "tipo": "capa" },
    { "numero": 2, "titulo": "ponto 1", "corpo": "explicação clara e útil", "tipo": "conteudo" },
    { "numero": 3, "titulo": "ponto 2", "corpo": "explicação clara e útil", "tipo": "conteudo" },
    { "numero": 4, "titulo": "ponto 3", "corpo": "explicação clara e útil", "tipo": "conteudo" },
    { "numero": 5, "titulo": "ponto 4", "corpo": "explicação clara e útil", "tipo": "conteudo" },
    { "numero": 6, "titulo": "conclusão", "corpo": "fechamento + CTA", "tipo": "cta" }
  ],
  "caption": "legenda completa para o post",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}`,

    thread: `${personalidadePrompt}

Crie uma thread viral para Twitter/X sobre: "${tema}" no nicho de ${nicho}.

Responda APENAS com JSON válido, sem markdown:
{
  "headline": "tweet de abertura com gancho (máx 280 chars)",
  "tweets": [
    { "numero": 1, "texto": "abertura que gera curiosidade", "tipo": "abertura" },
    { "numero": 2, "texto": "desenvolvimento ponto 1", "tipo": "conteudo" },
    { "numero": 3, "texto": "desenvolvimento ponto 2", "tipo": "conteudo" },
    { "numero": 4, "texto": "desenvolvimento ponto 3", "tipo": "conteudo" },
    { "numero": 5, "texto": "desenvolvimento ponto 4", "tipo": "conteudo" },
    { "numero": 6, "texto": "conclusão + CTA", "tipo": "cta" }
  ],
  "hashtags": ["hashtag1", "hashtag2"]
}`
  };

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
        messages: [{ role: 'user', content: prompts[formato] || prompts.estatico }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

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
    return res.status(500).json({ error: err.message });
  }
}
