import { createClient } from '@supabase/supabase-js';

let client = null;
let cachedKey = '';

function getClient() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    throw new Error('缺少 SUPABASE_URL 或 SUPABASE_ANON_KEY 环境变量');
  }
  const fingerprint = `${url}|${key}`;
  if (!client || cachedKey !== fingerprint) {
    client = createClient(url, key, { auth: { persistSession: false } });
    cachedKey = fingerprint;
  }
  return client;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const url = new URL(req.url || '/', 'http://localhost');
  const id = url.searchParams.get('id');
  const priority = url.searchParams.get('priority');

  try {
    const supabase = getClient();

    if (req.method === 'GET') {
      let query = supabase
        .from('tasks')
        .select('id,title,priority,completed,created_at')
        .order('created_at', { ascending: false });
      if (priority && ['高', '中', '低'].includes(priority)) {
        query = query.eq('priority', priority);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const title = String(body.title || '').trim();
      const level = String(body.priority || '中');
      if (!title) return res.status(400).json({ error: '任务标题不能为空' });
      if (!['高', '中', '低'].includes(level)) return res.status(400).json({ error: '优先级只能是 高/中/低' });

      const { data, error } = await supabase
        .from('tasks')
        .insert({ title, priority: level, completed: false })
        .select('id,title,priority,completed,created_at')
        .single();
      if (error) throw error;
      return res.status(201).json({ data });
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: '缺少任务 id' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const patch = {};
      if (typeof body.completed === 'boolean') patch.completed = body.completed;
      if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
      if (body.priority && ['高', '中', '低'].includes(body.priority)) patch.priority = body.priority;
      if (!Object.keys(patch).length) return res.status(400).json({ error: '没有需要更新的字段' });

      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select('id,title,priority,completed,created_at')
        .single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: '缺少任务 id' });
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || '服务器内部错误' });
  }
}
