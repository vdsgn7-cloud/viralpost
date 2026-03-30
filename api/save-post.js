// api/save-post.js
// Salva post gerado no Supabase (autenticado via JWT do usuário)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token obrigatório' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Token inválido' });

  const { nicho, redeSocial, formato, headline, copy, slides, hashtags, estiloVisual } = req.body;

  try {
    const { data, error } = await supabase
      .from('generated_posts')
      .insert({
        user_id: user.id,
        nicho,
        rede_social: redeSocial,
        formato,
        headline,
        copy,
        slides: slides || null,
        hashtags: hashtags || [],
        estilo_visual: estiloVisual || null,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ post: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar post' });
  }
}
