/**
 * trends24_to_nitterLocal.js   (versión limpia de enlaces)
 *
 * ①  Carga https://trends24.in/guatemala
 * ②  listTrends  + tableTrends
 * ③  Para cada trend consulta Nitter local y extrae:
 *       – texto completo sin URLs pegadas
 *       – retweets, quotes, likes, score
 * ④  Devuelve JSON { timestamp, listTrends, tableTrends, topTweets }
 *
 * Requisitos:
 *    npm i puppeteer axios cheerio html-entities
 */

import puppeteer  from 'puppeteer';
import axios      from 'axios';
import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import fs         from 'fs';

export default scrapeTrends;  // exporta la función principal
const NITTER_LOCAL  = 'http://192.168.2.23:9090';
const TWITTER_BASE  = 'https://twitter.com';
const NITTER_BASE   = NITTER_LOCAL;

/* ─────────────── Obtener top tweet (sin retuits, texto limpio) ────────────── */
// Función para obtener la fecha actual en formato YYYY-MM-DD
const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const executionDate = getCurrentDate(); // Fecha actual para filtros

export async function getTopTweetNitter (trend, maxCards = 30) {
  const query = encodeURIComponent(trend);
  const url   = `${NITTER_LOCAL}/search?f=tweets&q=${query}&e-news=on&e-verified=on&since=&until=${executionDate}`;

  try {
    const { data: html } = await axios.get(url, {
      headers : { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
      timeout : 15_000
    });

    const $ = cheerio.load(html);
    let best = null;

    $('.timeline-item').slice(0, maxCards).each((_, el) => {
      const item  = $(el);

      /* ---------- 1. Texto limpio ────────────────────────────── */
      const rawHTML = item.find('.tweet-content').html() ?? '';
      const $$      = cheerio.load(rawHTML);
      const text    = decode(
        $$.root().find('a').remove().end().text().replace(/\s+/g, ' ').trim()
      );

      if (/^RT\s*@/i.test(text)) return;               // ignorar retuits “puros”

      /* ---------- 2. Métricas ────────────────────────────────── */
      const metric = (iconCls) => {
        const t = item.find(`.tweet-stat:has(${iconCls})`).first().text().trim();
        if (!t) return 0;

        const num = parseFloat(t.replace(/[^\d.]/g, ''));
        return /k$/i.test(t) ? Math.round(num * 1_000)
             : /m$/i.test(t) ? Math.round(num * 1_000_000)
             : num;
      };

      const retweets = metric('.icon-retweet');
      const likes    = metric('.icon-heart');
      const score    = retweets + likes * 0.5;

      /* ---------- 3. Seleccionar el mejor ────────────────────── */
      if (!best || score > best.score) {
        const rel = item.find('span.tweet-date > a').attr('href') ?? '';
        best = {
          author   : item.find('.username').text().trim(),
          content  : text,
          link     : TWITTER_BASE + rel,
          retweets,
          likes,
          score
        };
      }
    });

    return best;
  } catch (err) {
    console.warn(`Nitter parse error (${trend}): ${err.message}`);
    return null;
  }
}
/* --- 3. FUNCIÓN PRINCIPAL: scrapeTrends() ------------------------------- */
async function scrapeTrends() {
  /*   ─── TODO el código que estaba dentro del IIFE ───
       - Lanzar Puppeteer
       - Obtener listData, tableTrends
       - topTweets usando getTopTweetNitter
       - Cerrar navegador
       - RETURN del objeto final
  */

  const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const executionDate = getCurrentDate(); // Fecha actual para filtros

  const browser = await puppeteer.launch({
    headless: true, args: ['--no-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  try {
    /* 1. Página + lista */
    await page.goto('https://trends24.in/guatemala/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.list-container', { timeout: 60000 });
    
    const listData = await page.evaluate(base => {
      // const container = document.querySelector('.list-container');
      const getCurrentDate = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const executionDate = getCurrentDate(); // Fecha actual para filtros

      const container = Array.from(document.querySelectorAll('.list-container')).find(c => c.querySelector('h3.title')?.innerText.includes('2 hours ago'));
      const timestamp = container.querySelector('h3.title')?.dataset.timestamp || null;
      const trends = Array.from(container.querySelectorAll('ol.trend-card__list li')).map(li => {
        const a        = li.querySelector('a.trend-link');
        const trend    = a?.innerText.trim() || '';
        const query    = encodeURIComponent(trend);
        const countEl  = li.querySelector('.tweet-count');
        const count    = (countEl?.dataset.count || countEl?.innerText || '0').replace(/,/g, '');
        return { trend, count, nitterSearch: `${base}/search?f=tweets&q=${query}&since=&until=${executionDate}` };
      });
      return { timestamp, trends };
    }, NITTER_BASE);

    /* 2. Tabla */
    await page.click('#tab-link-table');
    await page.waitForSelector('table.the-table tbody tr', { visible: true, timeout: 60000 });

    const tableTrends = await page.evaluate(base => {
    const getCurrentDate = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const executionDate = getCurrentDate(); // Fecha actual para filtros

      return Array.from(document.querySelectorAll('table.the-table tbody tr'))
        .slice(0, 10).map(r => {
          const c = r.querySelectorAll('td');
          const trend = c[1].innerText.trim();
          const query = encodeURIComponent(trend);
          return {
            rank: c[0].innerText.trim(),
            trend,
            topPosition: c[2].innerText.trim(),
            tweetCount : c[3].innerText.trim(),
            duration   : c[4].innerText.trim(),
            nitterSearch: `${base}/search?f=tweets&q=${query}&since=&until=${executionDate}`
          };
        });
    }, NITTER_BASE);

    /* 3. Top tweets */
    const topTweets = {};
    for (const t of listData.trends.slice(0, 10)) {
      topTweets[t.trend] = await getTopTweetNitter(t.trend);
    }
    /* 4. Resultado */
    // console.log(JSON.stringify({
    //   timestamp: listData.timestamp,
    //   listTrends: listData.trends,
    //   tableTrends,
    //   topTweets
    // }, null, 2));
    const result = {
      timestamp: listData.timestamp, // Asegúrate de que `listData.timestamp` esté definido
      listTrends: listData.trends,
      tableTrends,
      topTweets
    };

    return result; // Asegúrate de que `result` contenga `timestamp`

  } catch (err) {
    console.error('❌ Error global:', err.message, err);
    fs.writeFileSync('debug.html', await page.content());
  } finally {
    await browser.close();
  }
}

/* --- 4. Permitir ejecución directa desde CLI --------------------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Si alguien hace: node trends24_to_nitterLocal.js
  const data = await scrapeTrends();
  console.log(JSON.stringify(data, null, 2));
}
