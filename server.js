import express from 'express';
import scrapeTrends from './scraper.js'; // exporta tu main como función

const app = express();
const PORT = process.env.PORT || 8080;

/* GET /  →  JSON con datos actualizados */
app.get('/', async (_, res) => {
  try {
    const data = await scrapeTrends();   // ejecuta el scraping
    res.json(data);
  } catch (err) {
    console.error('Scraper error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Scraper API listening on http://0.0.0.0:${PORT}`)
);
