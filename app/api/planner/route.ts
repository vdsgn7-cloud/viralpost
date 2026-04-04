import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month'), year = searchParams.get('year')
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`
  const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
  const sb = createServiceClient()
  const { data, error } = await sb.from('planner_posts').select('*,generated_posts(id,headline,nicho,rede_social,formato,copy,slides,hashtags)').eq('user_id', user.id).gte('scheduled_date', startDate).lte('scheduled_date', endDate).order('scheduled_date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { postId, scheduledDate, scheduledTime, redeSocial, notas } = await req.json()
  if (!scheduledDate || !redeSocial) return NextResponse.json({ error: 'scheduledDate e redeSocial obrigatórios' }, { status: 400 })
  const sb = createServiceClient()
  const { data, error } = await sb.from('planner_posts').insert({ user_id: user.id, post_id: postId || null, scheduled_date: scheduledDate, scheduled_time: scheduledTime || null, rede_social: redeSocial, status: 'agendado', notas: notas || null }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const mapped: any = {}
  if (updates.status) mapped.status = updates.status
  if (updates.scheduledDate) mapped.scheduled_date = updates.scheduledDate
  if (updates.scheduledTime !== undefined) mapped.scheduled_time = updates.scheduledTime
  if (updates.notas !== undefined) mapped.notas = updates.notas
  const sb = createServiceClient()
  const { data, error } = await sb.from('planner_posts').update(mapped).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const sb = createServiceClient()
  const { error } = await sb.from('planner_posts').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
