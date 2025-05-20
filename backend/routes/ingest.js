const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const axios = require('axios');
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

// Pinecone initialization
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// PDF location
const pdfPath = path.join(__dirname, '../medical-book/book.pdf');

// Function to get embeddings from Together AI
async function getTogetherEmbedding(text) {
  const response = await axios.post(
    'https://api.together.xyz/v1/embeddings',
    {
      model: 'togethercomputer/m2-bert-80M-8k-retrieval', // or any other embedding model from Together
      input: [text],
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.data[0].embedding;
}

router.post('/', async (req, res) => {
  try {
    if (!fs.existsSync(pdfPath)) {
      return res.status(400).json({ error: `PDF file not found at ${pdfPath}` });
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text;

    const chunks = text.match(/(.|[\r\n]){1,1000}/g);
    const vectors = [];
    let i = 0;

    for (const chunk of chunks) {
      const embedding = await getTogetherEmbedding(chunk);

      vectors.push({
        id: `chunk-${i}`,
        values: embedding,
        metadata: { text: chunk },
      });

      // Upload in batches of 100
      if (vectors.length === 100 || i === chunks.length - 1) {
        const pineconeResponse = await index.upsert(vectors);
        console.log(`Upserted vectors. Response:`, pineconeResponse);
        vectors.length = 0;
      }

      i++;
    }

    res.json({ message: 'Ingestion complete using Together AI embedding model.' });
  } catch (error) {
    console.error('Error during ingestion:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
