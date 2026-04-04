import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const sb = createServiceClient()
  const { data: { user }, error: authError } = await sb.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { nicho, redeSocial, formato, headline, copy, slides, hashtags } = await req.json()
  const { data, error } = await sb.from('generated_posts').insert({
    user_id: user.id, nicho, rede_social: redeSocial, formato, headline, copy,
    slides: slides || null, hashtags: hashtags || []
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
