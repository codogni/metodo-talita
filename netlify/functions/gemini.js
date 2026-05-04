// netlify/functions/gemini.js
// Texto e chat: Groq (grátis, sem bloqueio de IP)
// Imagem: Gemini (funciona na Netlify)

const https = require("https");

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(data) } },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const body = JSON.parse(event.body);
    const contents = body.contents || [];

    // Detecta se tem imagem
    const temImagem = contents.some((c) =>
      (c.parts || []).some((p) => p.inline_data)
    );

    if (temImagem) {
      // ── GEMINI para imagem ──────────────────────────────────────────────
      const GEMINI_KEY = process.env.GEMINI_KEY;
      if (!GEMINI_KEY) {
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "GEMINI_KEY não configurada" }),
        };
      }

      const result = await httpsPost(
        "generativelanguage.googleapis.com",
        `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        { "Content-Type": "application/json" },
        { contents }
      );

      return {
        statusCode: result.status,
        headers: corsHeaders,
        body: JSON.stringify(result.body),
      };

    } else {
      // ── GROQ para texto e chat ──────────────────────────────────────────
      const GROQ_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_KEY) {
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "GROQ_API_KEY não configurada" }),
        };
      }

      // Converte formato Gemini → formato OpenAI (que o Groq usa)
      const messages = [];
      for (const c of contents) {
        const role = c.role === "model" ? "assistant" : "user";
        const text = (c.parts || []).map((p) => p.text || "").join("");
        if (text) messages.push({ role, content: text });
      }

      const result = await httpsPost(
        "api.groq.com",
        "/openai/v1/chat/completions",
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        {
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        }
      );

      if (result.status !== 200) {
        return {
          statusCode: result.status,
          headers: corsHeaders,
          body: JSON.stringify({ error: result.body }),
        };
      }

      // Converte resposta Groq → formato Gemini (que o index.html espera)
      const texto = result.body.choices?.[0]?.message?.content || "";
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          candidates: [{ content: { parts: [{ text: texto }] } }],
        }),
      };
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
