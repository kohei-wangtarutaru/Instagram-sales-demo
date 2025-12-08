export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const {
    storeName = '本日のお店',
    category = '飲食店',
    target = '想定しているお客様',
    goal = '来店数の増加',
    concept = 'お店の世界観',
    menuText = '',
    freeNote = '',
  } = payload;

  const systemPrompt = `
あなたは、飲食店特化のSNSクリエイティブディレクターです。
広告代理店やSNS運用代行会社がクライアントに見せる
「ブランド戦略エグゼクティブサマリ」を作成します。

出力は必ず次のJSON形式「だけ」で返してください。余計な文章は一切書かないでください。

{
  "overview": "ブランド全体像。どのポジションを取りにいくかを1〜3文で。",
  "targetInsight": "ターゲットのライフスタイル・価値観・行動インサイトを2〜4文で。",
  "strength": "店舗の強みを箇条書きベースで3〜6行。",
  "coreMessage": "SNS上で一貫して伝えていくコアメッセージ（1〜2文）。キャッチコピー的でも良い。",
  "objective": "短期・中期・長期の目的をそれぞれ1〜2行で。",
  "contentStrategy": "どのような投稿カテゴリを、どの役割で出していくか（3〜6行）。",
  "visualGuide": "色味・明るさ・構図・写真のテイストなどのビジュアルルール（3〜6行）。"
}

日本語で書いてください。
店舗のカテゴリやコンセプトに応じて、
和食・イタリアン・カフェなどでトーンやビジュアルガイドがズレないように調整してください。
  `.trim();

  const userPrompt = `
店舗名: ${storeName}
カテゴリ: ${category}
ターゲット: ${target}
インスタ運用の目的: ${goal}
コンセプト・雰囲気: ${concept}
看板メニュー・コース内容: ${menuText}
追加情報・メモ: ${freeNote}

上記を踏まえて、この店舗に最適化されたブランド戦略エグゼクティブサマリを作成してください。
出力は必ず、指定したJSONだけにしてください。`.trim();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', errText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', detail: errText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || '';

    let strategy;
    try {
      strategy = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse JSON from OpenAI:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse JSON from OpenAI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(strategy), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(
      JSON.stringify({ error: 'Unexpected server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
