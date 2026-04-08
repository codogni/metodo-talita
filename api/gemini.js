// api/gemini.js — Vercel Serverless Function
// Texto e Chat: Groq (grátis, llama-3.3-70b)
// Imagem: desabilitado temporariamente (OpenRouter instável)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY não configurada na Vercel' });
  }

  const { contents } = req.body;

  // Detecta se tem imagem
  const temImagem = contents?.some(c =>
    c.parts?.some(p => p.inline_data)
  );

  // Se tiver imagem, retorna mensagem amigável por enquanto
  if (temImagem) {
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: 'A análise por foto está temporariamente indisponível. Por favor, descreva os dados manualmente.' }]
        }
      }]
    });
  }

  // Converte formato Gemini → formato OpenAI (que o Groq usa)
  const messages = contents.map(c => ({
    role: c.role === 'model' ? 'assistant' : 'user',
    content: c.parts.map(p => p.text || '').join('')
  }));

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq erro:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Erro no Groq'
      });
    }

    // Converte resposta Groq → formato Gemini (que o index.html espera)
    const texto = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: texto }] } }]
    });

  } catch (error) {
    console.error('Erro Groq:', error);
    return res.status(500).json({
      error: 'Erro interno',
      detail: error.message
    });
  }
}
