// utils/openrouterClient.js
const { OpenAI } = require("openai");

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
  },
});

module.exports = openrouter;
