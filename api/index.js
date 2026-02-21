const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    let body = {};
    try {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body || '{}');
      } else {
        body = req.body || {};
      }
    } catch (e) {}
    
    const topic = body.topic;
    const keyword = body.keyword;
    const title = body.title;
    const content = body.content;
    const meta_description = body.meta_description;
    const focus_keyword = body.focus_keyword;
    const post_id = body.post_id;
    
    // keywords
    if (topic) {
      const keywords = [
        { keyword: `${topic} UK`, url: '#', snippet: 'UK-focused search' },
        { keyword: `best ${topic}`, url: '#', snippet: 'Best of searches' },
        { keyword: `${topic} prices`, url: '#', snippet: 'Price search intent' },
        { keyword: `buy ${topic}`, url: '#', snippet: 'Purchase intent' },
        { keyword: `${topic} near me`, url: '#', snippet: 'Local search' },
      ];
      return res.status(200).json({ keywords, topic });
    }
    
    // generate - return sample article for now
    if (keyword) {
      return res.status(200).json({
        title: `Guide to ${keyword}`,
        meta_description: `Learn about ${keyword} - expert guide and tips.`,
        content: `<h2>Introduction</h2><p>Welcome to our comprehensive guide about ${keyword}.</p><h2>Why Choose ${keyword}?</h2><p>There are many reasons to consider ${keyword} for your needs.</p><h2>Our Services</h2><p>We offer professional ${keyword} services in London and across the UK.</p><h2>FAQ</h2><h3>What is the price range?</h3><p>Prices vary based on your specific requirements.</p><h3>How long does it take?</h3><p>Typically 5-7 working days for most orders.</p><h3>Do you offer guarantees?</h3><p>Yes, all our work comes with a satisfaction guarantee.</p>`,
        focus_keyword: keyword
      });
    }
    
    // preview
    if (title && content) {
      return res.status(200).json({ 
        post_id: 1, 
        preview_url: 'https://example.com/?p=1&preview=true', 
        title: title 
      });
    }
    
    // publish
    if (post_id) {
      return res.status(200).json({ 
        post_id, 
        published_url: 'https://example.com/test', 
        title: 'Test' 
      });
    }
    
    return res.status(200).json({ status: 'ok', message: 'SEO Pipeline API' });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
