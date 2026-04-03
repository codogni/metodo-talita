const https = require("https");

const GEMINI_KEY = "AIzaSyCz_GkXLZVU24vwdpECFFN1-eI8hwk4jJ4";

function httpsPost(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const { model, payload } = req.body;
    const path = `/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${GEMINI_KEY}`;
    const result = await httpsPost(path, payload);
    res.status(200).send(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
