// api/chat.js
// Vercel Node Serverless Function – hides your GROQ_API_KEY
export default async function handler(req, res) {
  // CORS (safe if you ever embed elsewhere)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse JSON body safely
    const body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => {
        try { resolve(JSON.parse(data || "{}")); }
        catch (e) { resolve({}); }
      });
      req.on("error", reject);
    });

    const userMsg = String(body?.message || "").slice(0, 4000);
    if (!userMsg) {
      return res.status(400).json({ error: "Missing 'message' in body" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server missing GROQ_API_KEY" });
    }

    // Call Groq (OpenAI-compatible)
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.4,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content:
              "Ka amsa koyaushe a harshen Hausa kawai. Idan tambaya ba a Hausa ba ce, ka fassara ta zuwa Hausa sannan ka amsa a Hausa. Ka yi takaitaccen bayani, a sarari."
          },
          { role: "user", content: userMsg }
        ]
      })
    });

    if (!groqRes.ok) {
      const errTxt = await groqRes.text().catch(() => "");
      return res.status(500).json({ error: "Groq error", detail: errTxt });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
