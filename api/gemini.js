const https = require("https");

const GROQ_KEY = "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";

function httpsPost(hostname, path, headers, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...headers
      }
    }, (res) => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => resolve(raw));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function geminiContentsParaGroq(contents, systemPrompt) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  for (const msg of contents) {
    const role = msg.role === "model" ? "assistant" : "user";
    const text = msg.parts?.map(p => p.text || "").join("") || "";
    if (text.trim()) {
      messages.push({ role, content: text });
    }
  }
  return messages;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const { payload } = req.body;
    const contents = payload?.contents || [];

    const temImagem = contents.some(c =>
      c.parts?.some(p => p.inline_data)
    );

    if (temImagem) {
      res.status(400).json({
        error: "Chamadas com imagem devem usar Gemini direto do browser."
      });
      return;
    }

    const temHistorico = contents.some(c => c.role === "model");

    let messages;

    if (temHistorico) {
      const systemText = contents[0]?.parts?.[0]?.text || "";
      const restante = contents.slice(2);
      messages = geminiContentsParaGroq(restante, systemText);
    } else {
      const texto = contents[0]?.parts?.[0]?.text || "";
      messages = [{ role: "user", content: texto }];
    }

    const groqPayload = {
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.3,
      max_tokens: 1000
    };

    const raw = await httpsPost(
      "api.groq.com",
      "/openai/v1/chat/completions",
      { "Authorization": `Bearer ${GROQ_KEY}` },
      groqPayload
    );

    const groqData = JSON.parse(raw);

    if (groqData.error) {
      res.status(500).json({ error: groqData.error });
      return;
    }

    const textoResposta = groqData.choices?.[0]?.message?.content || "";
    const geminiCompativel = {
      candidates: [{
        content: {
          parts: [{ text: textoResposta }]
        }
      }]
    };

    res.status(200).json(geminiCompativel);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
