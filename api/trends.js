export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nicho, redeSocial = 'instagram' } = req.body;
  if (!nicho) return res.status(400).json({ error: 'nicho obrigatório' });

  const redesMap = { instagram: 'Instagram e Reels', linkedin: 'LinkedIn', twitter: 'Twitter/X' };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
       tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
        tool_choice: { type: 'auto' },
        system: 'Você é um especialista em marketing digital e conteúdo viral para redes sociais brasileiras. Você SEMPRE usa a ferramenta web_search para buscar tendências atuais antes de responder. Nunca responda sem pesquisar primeiro.',
        messages: [{
          role: 'user',
          content: `Use a ferramenta web_search para pesquisar AGORA: "tendências ${nicho} ${new Date().getFullYear()} viral ${redesMap[redeSocial]}"

Depois pesquise também: "${nicho} polêmica notícia recente brasil"

Com base nos resultados reais encontrados, liste as 5 melhores oportunidades de conteúdo viral para o nicho de "${nicho}" no ${redesMap[redeSocial]}.

Responda APENAS com este JSON, sem markdown, sem explicação:
{
  "trends": [
    {
      "titulo": "Tema específico e atual encontrado na pesquisa",
      "descricao": "Por que está gerando engajamento agora — baseado no que você encontrou",
      "angulo": "Ângulo criativo e específico para transformar isso em post viral",
      "potencial": "alto",
      "tipo": "novidade"
    }
  ]
}`
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    let jsonText = '';
    for (const block of data.content || []) {
      if (block.type === 'text') jsonText = block.text;
    }

    let trends;
    try {
      const clean = jsonText.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      trends = JSON.parse(clean.slice(start, end + 1));
    } catch {
      return res.status(500).json({ error: 'Falha ao parsear trends: ' + jsonText.slice(0, 200) });
    }

    return res.status(200).json(trends);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
