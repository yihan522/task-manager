import { useEffect, useMemo, useState } from 'react';

const PRIORITIES = ['高', '中', '低'];
const FILTERS = ['全部', '高', '中', '低'];

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `请求失败（${res.status}）`);
  return json;
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('中');
  const [filter, setFilter] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadTasks() {
    try {
      setError('');
      const json = await request('GET', '/api/tasks');
      setTasks(json.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function addTask(e) {
    e.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      setError('');
      const json = await request('POST', '/api/tasks', { title: value, priority });
      setTasks((prev) => [json.data, ...prev]);
      setTitle('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(task) {
    try {
      setError('');
      const json = await request('PATCH', `/api/tasks?id=${task.id}`, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? json.data : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeTask(task) {
    try {
      setError('');
      await request('DELETE', `/api/tasks?id=${task.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleTasks = useMemo(
    () => (filter === '全部' ? tasks : tasks.filter((t) => t.priority === filter)),
    [tasks, filter],
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    return { total, done, left: total - done };
  }, [tasks]);

  return (
    <div className="page">
      <div className="card">
        <header className="header">
          <div>
            <h1>智能任务管理</h1>
            <p className="subtitle">今天共 {stats.total} 项 · 已完成 {stats.done} 项 · 待办 {stats.left} 项</p>
          </div>
          <span className="leaf">🌿</span>
        </header>

        <form className="composer" onSubmit={addTask}>
          <input
            className="composer-input"
            placeholder="输入任务标题，回车即可添加"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <select className="composer-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}优先级
              </option>
            ))}
          </select>
          <button className="composer-btn" type="submit" disabled={busy || !title.trim()}>
            {busy ? '添加中…' : '添加任务'}
          </button>
        </form>

        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty">正在加载任务…</div>
        ) : visibleTasks.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">🌸</span>
            <p>{filter === '全部' ? '还没有任务，先添加一条吧' : `暂无「${filter}」优先级任务`}</p>
          </div>
        ) : (
          <ul className="task-list">
            {visibleTasks.map((task) => (
              <li key={task.id} className={`task ${task.completed ? 'is-done' : ''}`}>
                <span className={`prio-bar prio-${task.priority}`} />
                <div className="task-main">
                  <p className="task-title">{task.title}</p>
                  <div className="task-meta">
                    <span className={`tag tag-${task.priority}`}>{task.priority}优先级</span>
                    <span className={`status ${task.completed ? 'status-done' : 'status-todo'}`}>
                      {task.completed ? '已完成' : '未完成'}
                    </span>
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    type="button"
                    className={`action ${task.completed ? 'action-undo' : 'action-done'}`}
                    onClick={() => toggleTask(task)}
                  >
                    {task.completed ? '标为未完成' : '完成'}
                  </button>
                  <button type="button" className="action action-delete" onClick={() => removeTask(task)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="footer">数据实时保存在 Supabase 云端数据库</p>
    </div>
  );
}
