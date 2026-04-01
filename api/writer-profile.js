// api/writer-profile.js
// GET: busca perfil do escritor | POST: salva perfil

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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('writer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ profile: data || null });
  }

  if (req.method === 'POST') {
    const {
      nicho_principal, publico_alvo, tom, formalidade,
      evitar, formato_preferido, tamanho_copy,
      descricao_pessoal, exemplo_post, palavras_chave
    } = req.body;

    const { data, error } = await supabase
      .from('writer_profiles')
      .upsert({
        user_id: user.id,
        nicho_principal, publico_alvo, tom, formalidade,
        evitar: evitar || [],
        formato_preferido, tamanho_copy,
        descricao_pessoal, exemplo_post,
        palavras_chave: palavras_chave || [],
        onboarding_completo: true
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ profile: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
