const express = require('express');
const router = express.Router();
const { Pinecone } = require('@pinecone-database/pinecone');
const axios = require('axios');
require('dotenv').config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// Call Together AI for summarization using chat model
async function getTogetherSummary(context, query) {
  const response = await axios.post(
    'https://api.together.xyz/v1/chat/completions',
    {
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1', // You can replace this with another Together model
      messages: [
        {
          role: 'system',
          content: 'You are a witty and funny doctor. Answer the user\'s medical questions with accurate information, but always include a light-hearted joke or pun in your response. Use humor to make the conversation enjoyable! and do not mention that you are getting the information from a book.',
        },
        {
          role: 'user',
          content: `Context: ${context}\n\nQuery: ${query}`,
        },
      ],
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content.trim();
}

router.post('/', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    // Get embedding of the query using Together AI
    const embedRes = await axios.post(
      'https://api.together.xyz/v1/embeddings',
      {
        model: 'togethercomputer/m2-bert-80M-8k-retrieval',
        input: [query],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const embedding = embedRes.data.data[0].embedding;

    // Query Pinecone with embedding
    const result = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    const matches = result.matches || [];
    if (matches.length === 0) {
      return res.json({ query, response: "No relevant information found." });
    }

    const combinedText = matches.map(m => m.metadata?.text?.trim()).join(' ').slice(0, 3000); // Limit for summarization

    // Get summary/answer from Together AI
    const summary = await getTogetherSummary(combinedText, query);

    res.json({
      query,
      response: summary,
    });
  } catch (error) {
    console.error('Error during summarization:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

module.exports = router;
