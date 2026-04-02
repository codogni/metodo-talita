const https = require("https");

const GEMINI_KEY = "AIzaSyDpdX32CeG7_SerBC3RH9_51falqDv88_U";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { model, payload } = JSON.parse(event.body);
    const path = `/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${GEMINI_KEY}`;
    const postData = JSON.stringify(payload);

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "generativelanguage.googleapis.com",
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
      req.write(postData);
      req.end();
    });

    return { statusCode: 200, headers, body: result };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
