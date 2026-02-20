const axios = require('axios');
const crypto = require('crypto');

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN || 'b2ce775644701c2ffdb8e7ec45d8c0655252a5ee38c71a4de3cae6496aabc328';
const WEBFLOW_COLLECTION_ID = process.env.WEBFLOW_COLLECTION_ID || '67dd9615c522abd0f18d1f0a';

const articlesDb = {};

const AFFILIATE_LINKS = {
  lookfantastic: {
    url: 'https://www.nicolalondors.com/beauty-picks/save-20-with-look-fantastic-discount-code-lftfnicolal',
    anchors: ['20% off at Lookfantastic', 'exclusive discount code', 'verified promo code', 'shop Lookfantastic']
  },
  sephora: {
    url: 'https://www.nicolalondors.com/beauty-picks/save-15-with-sephora-uk-discount-code-nicolasph',
    anchors: ['15% off at Sephora UK', 'exclusive Sephora discount', 'verified Sephora promo code', 'shop Sephora']
  },
  elemis: {
    url: 'https://www.nicolalondors.com/beauty-picks/elemis-discount-code-15-off',
    anchors: ['15% off Elemis', 'exclusive Elemis discount', 'verified Elemis promo code', 'shop Elemis']
  }
};

function selectAffiliateLinks(keyword, count = 3) {
  const kw = keyword.toLowerCase();
  const selected = [];
  
  selected.push({ url: AFFILIATE_LINKS.lookfantastic.url, anchor: AFFILIATE_LINKS.lookfantastic.anchors[Math.floor(Math.random() * 4)] });
  
  if (kw.includes('makeup') || kw.includes('cosmetics')) {
    selected.push({ url: AFFILIATE_LINKS.sephora.url, anchor: AFFILIATE_LINKS.sephora.anchors[Math.floor(Math.random() * 4)] });
  }
  if (kw.includes('skincare') || kw.includes('cream') || kw.includes('serum')) {
    selected.push({ url: AFFILIATE_LINKS.elemis.url, anchor: AFFILIATE_LINKS.elemis.anchors[Math.floor(Math.random() * 4)] });
  }
  return selected.slice(0, count);
}

function addAffiliateLinks(content, keyword) {
  const links = selectAffiliateLinks(keyword);
  const disclaimer = '<p><em>*This blog may contain affiliated links.</em></p>';
  const firstPara = content.indexOf('</p>');
  if (firstPara > 0) {
    content = content.slice(0, firstPara + 4) + ` <a href="${links[0].url}">${links[0].anchor}</a>` + content.slice(firstPara + 4);
  }
  return disclaimer + content;
}

module.exports = async (req, res) => {
  const path = (req.url || '/').split('?')[0];
  const method = req.method;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (method === 'OPTIONS') return res.status(200).end();
  
  let body = {};
  if (method === 'POST') {
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } 
    catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  
  // Root - health check
  if (path === '/') return res.status(200).json({ status: 'ok', message: 'NL Beauty SEO Pipeline API' });
  
  // Keywords - return keyword suggestions
  if (path === '/keywords') {
    const topic = body.topic || '';
    const keywords = [
      { keyword: `${topic} UK`, url: '#', snippet: 'UK search' },
      { keyword: `best ${topic}`, url: '#', snippet: 'Best of' },
      { keyword: `${topic} 2026`, url: '#', snippet: 'Latest trends' },
      { keyword: `${topic} reviews`, url: '#', snippet: 'Reviews' },
      { keyword: `${topic} deals`, url: '#', snippet: 'Deals' },
    ];
    return res.status(200).json({ keywords, topic });
  }
  
  // Save article - store article with affiliate links
  if (path === '/save-article') {
    const { keyword, title, content, meta_description } = body;
    if (!keyword || !title || !content) {
      return res.status(400).json({ error: 'keyword, title, content required' });
    }
    const articleId = crypto.randomBytes(4).toString('hex');
    const contentWithLinks = addAffiliateLinks(content, keyword);
    const article = { 
      id: articleId, 
      keyword, 
      title, 
      meta_description: meta_description || '', 
      content: contentWithLinks, 
      status: 'draft', 
      affiliate_links: selectAffiliateLinks(keyword) 
    };
    articlesDb[articleId] = article;
    return res.status(200).json({ 
      article_id: articleId, 
      title, 
      preview: { 
        title, 
        content: contentWithLinks.slice(0, 500) + '...', 
        affiliate_links: article.affiliate_links 
      } 
    });
  }
  
  // Get article by ID
  if (path.startsWith('/article/')) {
    const id = path.split('/article/')[1];
    const article = articlesDb[id];
    if (!article) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(article);
  }
  
  // List all articles
  if (path === '/articles') {
    return res.status(200).json({ articles: Object.values(articlesDb).map(a => ({ id: a.id, keyword: a.keyword, title: a.title, status: a.status })) });
  }
  
  // Preview - generate preview data
  if (path === '/preview') {
    const article = articlesDb[body.article_id];
    if (!article) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ 
      article_id: article.id, 
      title: article.title, 
      content: article.content, 
      schema: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: article.title }) 
    });
  }
  
  // Publish - send to Webflow
  if (path === '/publish') {
    const article = articlesDb[body.article_id];
    if (!article) return res.status(404).json({ error: 'Not found' });
    try {
      const slug = article.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      const resp = await axios.post(
        `https://api.webflow.com/collections/${WEBFLOW_COLLECTION_ID}/items`,
        { fields: { name: article.title, slug: slug, content: article.content, description: article.meta_description } },
        { headers: { 'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      article.status = 'published';
      return res.status(200).json({ article_id: article.id, published: true, webflow_item_id: resp.data.id, title: article.title });
    } catch (e) {
      return res.status(500).json({ error: 'Webflow publish failed: ' + e.message });
    }
  }
  
  return res.status(404).json({ error: 'Not found' });
};
