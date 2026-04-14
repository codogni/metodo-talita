export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const contents = req.body.contents || [];
    const messages = contents.map(c => ({
      role: c.role === 'model' ? 'assistant' : 'user',
      content: Array.isArray(c.parts) ? c.parts.map(p => p.text || '').join('') : ''
    })).filter(m => m.content);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 1024 })
    });
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || '';
    res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
