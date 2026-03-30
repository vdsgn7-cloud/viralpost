// api/analyze-style.js
// Recebe imagem base64, usa Claude Vision para extrair estilo visual

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mediaType = 'image/jpeg' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 obrigatório' });

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
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `Analise este post de rede social e extraia o estilo visual. Responda APENAS com JSON válido, sem markdown:
{
  "palette": {
    "background": "#hex",
    "primary": "#hex",
    "secondary": "#hex",
    "text": "#hex",
    "accent": "#hex"
  },
  "typography": {
    "headingStyle": "serif|sans|display|mono",
    "bodyStyle": "serif|sans|mono",
    "headingWeight": "light|regular|medium|bold|black",
    "fontSize": "small|medium|large"
  },
  "layout": "centered|left-aligned|editorial|grid|minimal",
  "mood": "professional|casual|luxury|energetic|calm|bold|elegant",
  "hasGradient": true|false,
  "hasBorder": true|false,
  "borderRadius": "none|small|medium|large|pill",
  "description": "Descrição em 1 frase do estilo geral"
}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    let style;
    try {
      style = JSON.parse(text);
    } catch {
      style = {
        palette: { background: '#ffffff', primary: '#000000', secondary: '#666666', text: '#111111', accent: '#FF4D4D' },
        typography: { headingStyle: 'sans', bodyStyle: 'sans', headingWeight: 'bold', fontSize: 'medium' },
        layout: 'centered',
        mood: 'professional',
        hasGradient: false,
        hasBorder: false,
        borderRadius: 'medium',
        description: 'Estilo limpo e profissional'
      };
    }

    return res.status(200).json({ style });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao analisar imagem' });
  }
}
