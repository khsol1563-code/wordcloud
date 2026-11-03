const DEFAULT_STATE = {
  questions: ['오늘 가장 먼저 떠오르는 단어는 무엇인가요?', '', '', '', ''],
  current: 0,
  answers: [[], [], [], [], []]
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' }
  });
}

function normalize(value) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    questions: (Array.isArray(data.questions) ? data.questions : DEFAULT_STATE.questions).concat(['', '', '', '', '']).slice(0, 5),
    current: Math.max(0, Math.min(4, Number.isInteger(data.current) ? data.current : 0)),
    answers: (Array.isArray(data.answers) ? data.answers : DEFAULT_STATE.answers).concat([[], [], [], [], []]).slice(0, 5)
  };
}

export async function onRequestGet({ env }) {
  const state = await env.WORDCLOUD_STATE.get('state', { type: 'json' });
  return json(normalize(state || DEFAULT_STATE));
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '잘못된 요청입니다.' }, 400);
  }

  const current = normalize(await env.WORDCLOUD_STATE.get('state', { type: 'json' }) || DEFAULT_STATE);

  if (body.type === 'answer') {
    const index = Math.max(0, Math.min(4, Number(body.questionIndex) || current.current));
    const text = String(body.text || '').trim().slice(0, 40);
    if (!text) return json({ error: '응답을 입력해 주세요.' }, 400);
    current.answers[index].push({ text, at: Date.now() });
  } else if (body.type === 'admin') {
    if (body.password !== '12345') return json({ error: '관리자 인증에 실패했습니다.' }, 401);
    Object.assign(current, normalize(body.data));
  } else {
    return json({ error: '지원하지 않는 요청입니다.' }, 400);
  }

  await env.WORDCLOUD_STATE.put('state', JSON.stringify(current));
  return json(current);
}

