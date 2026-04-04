// api/writers.js
import { createClient } from '@supabase/supabase-js';

const PRESETS = [
  {
    nome: 'Educativo',
    avatar_emoji: '🧠',
    nicho_principal: 'educação e conhecimento',
    publico_alvo: 'pessoas que querem aprender e se desenvolver',
    tom: 'educativo',
    formalidade: 'medio',
    evitar: ['frases motivacionais clichê', 'emojis em excesso'],
    tamanho_copy: 'medio',
    descricao_pessoal: 'Escritor focado em ensinar de forma clara e didática',
    palavras_chave: ['aprenda', 'entenda', 'na prática', 'passo a passo'],
    is_preset: true
  },
  {
    nome: 'Direto',
    avatar_emoji: '🎯',
    nicho_principal: 'negócios e produtividade',
    publico_alvo: 'profissionais e empreendedores',
    tom: 'direto',
    formalidade: 'medio',
    evitar: ['rodeios', 'frases motivacionais clichê'],
    tamanho_copy: 'curto',
    descricao_pessoal: 'Escritor direto ao ponto, sem rodeios',
    palavras_chave: ['a verdade é', 'simples assim', 'sem enrolação'],
    is_preset: true
  },
  {
    nome: 'Analítico',
    avatar_emoji: '📊',
    nicho_principal: 'dados e negócios',
    publico_alvo: 'profissionais que tomam decisões baseadas em dados',
    tom: 'analitico',
    formalidade: 'formal',
    evitar: ['emojis em excesso', 'frases motivacionais clichê', 'clickbait e exageros'],
    tamanho_copy: 'medio',
    descricao_pessoal: 'Escritor analítico que usa dados e fatos',
    palavras_chave: ['dados mostram', 'segundo pesquisa', 'números indicam'],
    is_preset: true
  }
];

export default async function handler(req, res) {
  // Usa service role — bypassa RLS completamente
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verifica usuário via token JWT
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token obrigatório' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Token inválido' });

  // GET
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('writers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    if (!data || data.length === 0) {
      const { data: created, error: createErr } = await supabase
        .from('writers')
        .insert(PRESETS.map(p => ({ ...p, user_id: user.id })))
        .select();
      if (createErr) return res.status(500).json({ error: createErr.message });
      return res.status(200).json({ writers: created });
    }

    return res.status(200).json({ writers: data });
  }

  // POST
  if (req.method === 'POST') {
    const { nome, avatar_emoji, avatar_url, nicho_principal, publico_alvo, tom, formalidade, evitar, tamanho_copy, descricao_pessoal, exemplo_post, palavras_chave } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome obrigatório' });

    const { data, error } = await supabase
      .from('writers')
      .insert({
        user_id: user.id,
        nome,
        avatar_emoji: avatar_emoji || '✍️',
        avatar_url: avatar_url || null,
        nicho_principal: nicho_principal || 'geral',
        publico_alvo: publico_alvo || 'pessoas interessadas no tema',
        tom: tom || 'educativo',
        formalidade: formalidade || 'medio',
        evitar: evitar || [],
        tamanho_copy: tamanho_copy || 'medio',
        descricao_pessoal: descricao_pessoal || null,
        exemplo_post: exemplo_post || null,
        palavras_chave: palavras_chave || [],
        is_preset: false
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ writer: data });
  }

  // PATCH
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    delete updates.user_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('writers')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ writer: data });
  }

  // DELETE
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });

    const { error } = await supabase
      .from('writers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
