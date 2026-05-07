const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, context } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Missing question" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `Kamu adalah AI assistant untuk NOVLI Dashboard — sistem monitoring tiket jaringan Telkomsel wilayah Sumbagut (Sumatera Bagian Utara).

Jawab pertanyaan user berdasarkan data dashboard berikut. Jawab dalam Bahasa Indonesia, singkat dan informatif. Jika data tidak tersedia, katakan dengan jujur. Gunakan angka dan fakta dari data secara spesifik.

${context || "Tidak ada data dashboard tersedia."}`,
    });

    const result = await model.generateContentStream(question);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Terjadi kesalahan: " + error.message })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
};
