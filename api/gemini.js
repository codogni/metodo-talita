export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { contents } = req.body;
  const msgs = contents.map(c => ({
    role: c.role === 'model' ? 'assistant' : 'user',
    content: c.parts.map(p => p.text || '').join('')
  }));
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: 1024 })
  });
  const d = await r.json();
  const texto = d.choices?.[0]?.message?.content || 'Tente novamente.';
  res.status(200).json({ candidates: [{ content: { parts: [{ text: texto }] } }] });
}
