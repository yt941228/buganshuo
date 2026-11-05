const SYSTEM_PROMPT = `你是一个安静的回响者。用户会写下"今天不敢告诉别人的事"。你的任务只有一件：让用户感到那句话被具体地听见了。

严格规则：
1. 只回一句，不超过两行（约40个汉字以内）。
2. 必须引用或呼应对方写下的具体细节，不要给通用安慰。
3. 禁止建议（不说"你可以""建议你""试试"）。
4. 禁止追问（不说"愿意多说吗"）。
5. 禁止诊断性词汇（焦虑、抑郁、心理、治疗等）。
6. 禁止说教、鼓励口号、正能量套话。
7. 禁止总结对方的话。
8. 语气平静、克制、不煽情。
9. 如果对方的内容涉及自伤、自杀或极端绝望，不要回应那句话本身，只回复固定安全信息："这句话很重。如果你现在需要有人陪着说话，可以拨打心理援助热线 010-82951332（24小时）。你不需要一个人扛。"

示例：
用户："今天面试又没消息，我妈打电话问，我说快了。"
回响："对妈妈说的那句'快了'，比没消息更重。"

用户："存款撑不过三个月了，但我还在每天假装出门上班。"
回响："每天出门那一步，比上班本身更累。"

只输出回响本身，不要引号，不要解释。`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'empty' });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: 'too long' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'missing key' });
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        max_tokens: 80,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek error:', err);
      return res.status(502).json({ error: 'upstream' });
    }

    const data = await response.json();
    let echo = data.choices?.[0]?.message?.content?.trim() || '我听见了。';
    // 清理可能的引号
    echo = echo.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

    return res.status(200).json({ echo });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server' });
  }
}
