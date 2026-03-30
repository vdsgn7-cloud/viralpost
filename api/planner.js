// api/planner.js
// CRUD do planner: GET (listar por mês), POST (agendar), PATCH (atualizar status), DELETE

import { createClient } from '@supabase/supabase-js';

async function getUser(req) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { user: null, supabase };
  return { user, supabase };
}

export default async function handler(req, res) {
  const { user, supabase } = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Não autenticado' });

  // GET — listar posts do planner por mês
  if (req.method === 'GET') {
    const { month, year } = req.query;
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('planner_posts')
      .select(`
        *,
        generated_posts (
          id, headline, nicho, rede_social, formato, copy, slides, hashtags
        )
      `)
      .eq('user_id', user.id)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data });
  }

  // POST — agendar post
  if (req.method === 'POST') {
    const { postId, scheduledDate, scheduledTime, redeSocial, notas } = req.body;
    if (!scheduledDate || !redeSocial) {
      return res.status(400).json({ error: 'scheduledDate e redeSocial obrigatórios' });
    }

    const { data, error } = await supabase
      .from('planner_posts')
      .insert({
        user_id: user.id,
        post_id: postId || null,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        rede_social: redeSocial,
        status: 'agendado',
        notas: notas || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  // PATCH — atualizar status ou data
  if (req.method === 'PATCH') {
    const { id, status, scheduledDate, scheduledTime, notas } = req.body;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });

    const updates = {};
    if (status) updates.status = status;
    if (scheduledDate) updates.scheduled_date = scheduledDate;
    if (scheduledTime !== undefined) updates.scheduled_time = scheduledTime;
    if (notas !== undefined) updates.notas = notas;

    const { data, error } = await supabase
      .from('planner_posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  // DELETE
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });

    const { error } = await supabase
      .from('planner_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
