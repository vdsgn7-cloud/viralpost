import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, formato = 'estatico' } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt obrigatório' }, { status: 400 })

  const falKey = process.env.FAL_API_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_API_KEY não configurada' }, { status: 500 })

  // Proporção baseada no formato
  const imageSize = formato === 'thread' ? 'square_hd' : 'portrait_4_3'

  // Enriquece o prompt para resultado mais profissional
  const enrichedPrompt = `${prompt}, professional photography, editorial style, high quality, sharp focus, cinematic lighting, 4k, no text, no watermark`

  try {
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enrichedPrompt,
        image_size: imageSize,
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('fal.ai error:', err)
      return NextResponse.json({ error: 'Erro na geração de imagem' }, { status: 500 })
    }

    const data = await response.json()
    const imageUrl = data.images?.[0]?.url

    if (!imageUrl) return NextResponse.json({ error: 'Imagem não gerada' }, { status: 500 })

    return NextResponse.json({ imageUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
