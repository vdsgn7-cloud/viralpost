import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const PRESETS = [
  { nome:'Educativo', avatar_emoji:'🧠', nicho_principal:'educação e conhecimento', publico_alvo:'pessoas que querem aprender', tom:'educativo', formalidade:'medio', evitar:['frases motivacionais clichê','emojis em excesso'], tamanho_copy:'medio', descricao_pessoal:'Escritor focado em ensinar de forma clara e didática', palavras_chave:['aprenda','entenda','na prática'], is_preset:true },
  { nome:'Direto', avatar_emoji:'🎯', nicho_principal:'negócios e produtividade', publico_alvo:'profissionais e empreendedores', tom:'direto', formalidade:'medio', evitar:['rodeios','frases motivacionais clichê'], tamanho_copy:'curto', descricao_pessoal:'Escritor direto ao ponto, sem rodeios', palavras_chave:['a verdade é','simples assim'], is_preset:true },
  { nome:'Analítico', avatar_emoji:'📊', nicho_principal:'dados e negócios', publico_alvo:'profissionais que tomam decisões com dados', tom:'analitico', formalidade:'formal', evitar:['emojis em excesso','clickbait e exageros'], tamanho_copy:'medio', descricao_pessoal:'Escritor analítico que usa dados e fatos', palavras_chave:['dados mostram','números indicam'], is_preset:true },
]

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const sb = createServiceClient()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const sb = createServiceClient()
  const { data, error } = await sb.from('writers').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    const { data: created, error: ce } = await sb.from('writers').insert(PRESETS.map(p => ({ ...p, user_id: user.id }))).select()
    if (ce) return NextResponse.json({ error: ce.message }, { status: 500 })
    return NextResponse.json({ writers: created })
  }
  return NextResponse.json({ writers: data })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const sb = createServiceClient()
  const { data, error } = await sb.from('writers').insert({ ...body, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ writer: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  delete updates.user_id; delete updates.created_at
  const sb = createServiceClient()
  const { data, error } = await sb.from('writers').update(updates).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ writer: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const sb = createServiceClient()
  const { error } = await sb.from('writers').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
