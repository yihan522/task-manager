const BASE = process.env.BASE_URL || 'http://localhost:3000';
let pass = 0;
let fail = 0;

function report(name, ok, detail) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}: ${detail}`);
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

(async () => {
  console.log(`测试目标: ${BASE}`);

  const created = await req('POST', '/api/tasks', { title: '【测试】完成 Git 上传', priority: '高' });
  const id = created.json?.data?.id;
  report('添加任务', created.status === 201 && !!id, `HTTP ${created.status}, id=${id}`);

  const list = await req('GET', '/api/tasks');
  const rows = list.json?.data || [];
  report('查询列表', list.status === 200 && rows.some((r) => r.id === id), `HTTP ${list.status}, 共 ${rows.length} 条, 首条=${rows[0]?.title}`);

  const done = await req('PATCH', `/api/tasks?id=${id}`, { completed: true });
  report('切换完成状态', done.status === 200 && done.json?.data?.completed === true, `HTTP ${done.status}, completed=${done.json?.data?.completed}`);

  const undone = await req('PATCH', `/api/tasks?id=${id}`, { completed: false });
  report('切换回未完成', undone.status === 200 && undone.json?.data?.completed === false, `HTTP ${undone.status}, completed=${undone.json?.data?.completed}`);

  const filtered = await req('GET', `/api/tasks?priority=${encodeURIComponent('高')}`);
  report('按优先级筛选', filtered.status === 200 && (filtered.json?.data || []).every((r) => r.priority === '高'), `HTTP ${filtered.status}, 高优先级 ${filtered.json?.data?.length ?? 0} 条`);

  const removed = await req('DELETE', `/api/tasks?id=${id}`);
  const after = await req('GET', '/api/tasks');
  report('删除任务', removed.status === 200 && !(after.json?.data || []).some((r) => r.id === id), `HTTP ${removed.status}, 剩余 ${after.json?.data?.length ?? 0} 条`);

  console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})();
