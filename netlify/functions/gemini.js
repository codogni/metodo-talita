// netlify/functions/gemini.js
// Texto, chat e imagens: tudo via Groq (grátis, sem bloqueio de IP)

const https = require("https");

function httpsPost(hostname, path, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(bodyObj);
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(data) },
      },
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

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "GROQ_API_KEY nao configurada" }),
      };
    }

    // Monta mensagens no formato OpenAI/Groq
    const messages = [];

    for (const c of contents) {
      const role = c.role === "model" ? "assistant" : "user";
      const parts = c.parts || [];
      const temImagem = parts.some((p) => p.inline_data);

      if (temImagem) {
        const contentArray = [];
        for (const p of parts) {
          if (p.inline_data) {
            contentArray.push({
              type: "image_url",
              image_url: {
                url: `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`,
              },
            });
          } else if (p.text) {
            contentArray.push({ type: "text", text: p.text });
          }
        }
        messages.push({ role, content: contentArray });
      } else {
        const texto = parts.map((p) => p.text || "").join("");
        if (texto) messages.push({ role, content: texto });
      }
    }

    const result = await httpsPost(
      "api.groq.com",
      "/openai/v1/chat/completions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages,
        max_tokens: 1024,
        temperature: 0.1,
      }
    );

    if (result.status !== 200) {
      return {
        statusCode: result.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: result.body }),
      };
    }

    const texto = result.body.choices?.[0]?.message?.content || "";
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text: texto }] } }],
      }),
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
