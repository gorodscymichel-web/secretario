exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── Auth ──────────────────────────────────────────────────────
  const RELATAR_SECRET = process.env.RELATAR_SECRET;
  if (!RELATAR_SECRET) {
    return { statusCode: 503, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'RELATAR_SECRET não configurado no Netlify' }) };
  }
  const incoming = event.headers['x-secret'] || '';
  if (incoming !== RELATAR_SECRET) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Não autorizado' }) };
  }

  try {
    const { message } = JSON.parse(event.body || '{}');
    if (!message?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Mensagem vazia' }) };
    }

    // Input length cap — prevents abuse and runaway API calls
    if (message.length > 2000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Mensagem muito longa (máx 2000 caracteres)' }) };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    const OWNER = 'gorodscymichel-web';
    const REPO = 'secretario';
    const FILE = 'plan.json';

    // 1. Fetch current plan.json from GitHub
    const ghRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!ghRes.ok) throw new Error('Falha ao buscar plan.json do GitHub');

    const ghData = await ghRes.json();
    const currentPlan = Buffer.from(ghData.content, 'base64').toString('utf-8');
    const sha = ghData.sha;
    const today = new Date().toISOString().slice(0, 10);

    // 2. Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: `Você é o Secretário Pessoal do Michel. Gerencie o plan.json da agenda de 2 semanas.

Regras da rotina:
- Trabalho: 9h-18:30h. Presencial seg/qua/qui. Home office ter/sex.
- Aulas (até fim abril): ter+qua+qui 19:30-22:45
- Treino: apenas pós-trabalho. NUNCA em dia de aula. FDS manhã viável.
- Dias de treino possíveis: seg (pós ~19h), sex (HO sem aula), FDS manhã.
- Tipos válidos: treino, dissertacao, aula, trabalho, outros
- Status válidos: planejado, feito, perdido
- Para novos blocos use id incremental (ex: "x0", "x1")

Hoje é ${today}.

O Michel vai descrever o que fez ou não fez. Atualize o status dos blocos correspondentes no plan.json.
Retorne APENAS o JSON atualizado — sem markdown, sem explicação, sem código fence. Só o JSON puro e válido.`,
        messages: [{ role: 'user', content: `plan.json atual:\n${currentPlan}\n\nMensagem do Michel: ${message.trim()}` }]
      })
    });

    if (!claudeRes.ok) throw new Error(`Claude API: ${await claudeRes.text()}`);

    const claudeData = await claudeRes.json();
    let newPlanText = claudeData.content[0].text.trim();

    // Strip markdown code fences if Claude added them
    newPlanText = newPlanText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    const newPlan = JSON.parse(newPlanText); // throws if invalid JSON

    // 3. Commit updated plan.json to GitHub
    const commitRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `atualiza plano: ${message.trim().slice(0, 60)}`,
          content: Buffer.from(JSON.stringify(newPlan, null, 2)).toString('base64'),
          sha,
        })
      }
    );

    if (!commitRes.ok) throw new Error(`GitHub commit: ${await commitRes.text()}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, plan: newPlan }),
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
