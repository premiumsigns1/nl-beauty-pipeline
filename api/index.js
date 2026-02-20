// NL Beauty SEO Pipeline API

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const topic = req.body?.topic;
    const keyword = req.body?.keyword;
    const title = req.body?.title;
    const content = req.body?.content;
    const post_id = req.body?.post_id;
    
    // Debug endpoint
    if (req.method === 'GET') {
      return res.status(200).json({ 
        status: 'ok', 
        keySet: !!MINIMAX_API_KEY,
        keyPrefix: MINIMAX_API_KEY ? MINIMAX_API_KEY.substring(0, 10) : 'none'
      });
    }
    
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
    
    // generate
    if (keyword) {
      if (!MINIMAX_API_KEY) {
        return res.status(500).json({ error: 'MINIMAX_API_KEY not configured' });
      }
      
      try {
        const cleanKey = MINIMAX_API_KEY.trim();
        
        const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cleanKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'abab6.5s-chat',
            messages: [{ role: 'user', content: `Write about ${keyword}. Return JSON with title, meta_description, content, focus_keyword.` }],
            max_tokens: 2000
          })
        });
        
        const result = await response.json();
        
        if (result.choices && result.choices[0]) {
          let articleContent = result.choices[0].message.content;
          try {
            return res.status(200).json(JSON.parse(articleContent));
          } catch {
            const jsonMatch = articleContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) return res.status(200).json(JSON.parse(jsonMatch[0]));
          }
        }
        
        return res.status(500).json({ error: 'Failed to generate', details: result });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }
    
    // preview
    if (title && content) {
      return res.status(200).json({ post_id: 1, preview_url: 'https://example.com/?p=1&preview=true', title });
    }
    
    // publish
    if (post_id) {
      return res.status(200).json({ post_id, published_url: 'https://example.com/test', title: 'Test' });
    }
    
    return res.status(404).json({ error: 'Not found' });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
