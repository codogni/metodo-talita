export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const body = req.body;
  let text = '';
  
  try {
    // Tenta extrair o texto de qualquer formato que vier
    const contents = body.contents || body.messages || [];
    const msgs = [];
    
    for (const c of contents) {
      const role = c.role === 'model' ? 'assistant' : 'user';
      let content = '';
      if (c.parts) content = c.parts.map(p => p.text || '').join('');
      else if (c.content) content = c.content;
      else if (typeof c === 'string') content = c;
      if (content) msgs.push({ role, content });
    }
    
    if (msgs.length === 0) {
      return res.status(200).json({ candidates: [{ content: { parts: [{ text: 'Tente novamente.' }] } }] });
    }
    
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: 1024 })
    });
    
    const d = await r.json();
    text = d.choices?.[0]?.message?.content || 'Tente novamente.';
  } catch(e) {
    text = 'Tente novamente.';
  }
  
  res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });
}
