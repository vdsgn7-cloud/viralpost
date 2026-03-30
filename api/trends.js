// api/trends.js
// Busca tendências do nicho usando Claude + web search

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nicho, redeSocial = 'instagram' } = req.body;
  if (!nicho) return res.status(400).json({ error: 'nicho obrigatório' });

  const redesMap = {
    instagram: 'Instagram e Reels',
    linkedin: 'LinkedIn',
    twitter: 'Twitter/X'
  };

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
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Pesquise as 5 tendências mais virais e em alta agora no nicho de "${nicho}" para ${redesMap[redeSocial] || 'redes sociais'}. 
          
Busque notícias recentes, polêmicas, debates, dicas e conteúdos que estão gerando muito engajamento.

Responda APENAS com JSON válido, sem markdown:
{
  "trends": [
    {
      "titulo": "Tema curto e direto",
      "descricao": "Por que está em alta agora — 1-2 frases",
      "angulo": "Ângulo de conteúdo sugerido para post viral",
      "potencial": "alto|medio",
      "tipo": "polêmica|dica|novidade|tendência|opinião"
    }
  ]
}`
        }]
      })
    });

    const data = await response.json();

    let jsonText = '';
    for (const block of data.content || []) {
      if (block.type === 'text') jsonText = block.text;
    }

    let trends;
    try {
      const clean = jsonText.replace(/```json|```/g, '').trim();
      trends = JSON.parse(clean);
    } catch {
      trends = {
        trends: [
          { titulo: 'Tendência do nicho', descricao: 'Assunto em alta no momento', angulo: 'Compartilhe sua opinião sobre isso', potencial: 'alto', tipo: 'tendência' }
        ]
      };
    }

    return res.status(200).json(trends);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar tendências' });
  }
}
