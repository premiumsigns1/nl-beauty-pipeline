import React, { useState } from 'react';
import axios from 'axios';
import './index.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const discoverKeywords = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await axios.post(`${API_BASE}/keywords`, { topic });
      setKeywords(response.data.keywords || []);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to discover keywords' });
    } finally {
      setLoading(false);
    }
  };

  const requestArticle = (keyword) => {
    setSelectedKeyword(keyword);
    setStatus({ type: 'info', message: `Request sent to write article for "${keyword}". Check the group chat to approve.`, keyword });
  };

  const loadArticle = async (articleId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/article/${articleId}`);
      setArticle(response.data);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to load article' });
    } finally {
      setLoading(false);
    }
  };

  const refreshArticles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/articles`);
      setArticles(response.data.articles || []);
    } catch (err) { console.error(err); }
  };

  const createPreview = async () => {
    if (!article) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/preview`, { article_id: article.id });
      setArticle({...article, preview: response.data});
      setStatus({ type: 'success', message: 'Preview generated!' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to create preview' });
    } finally {
      setLoading(false);
    }
  };

  const publishArticle = async () => {
    if (!article) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/publish`, { article_id: article.id });
      setStatus({ type: 'success', message: 'Published to Webflow!' });
      setArticle({...article, status: 'published'});
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to publish' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo">NL <span>Beauty Pipeline</span></h1>
      </header>
      <main className="main-content">
        {status && <div className={`status-message status-${status.type}`}>{status.message}</div>}
        
        <section className="search-section">
          <h2>Enter a seed topic to discover trending keywords</h2>
          <div className="search-box">
            <input type="text" className="search-input" placeholder="e.g., skincare, best moisturiser..." value={topic} onChange={(e) => setTopic(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && discoverKeywords()} />
            <button className="btn btn-primary" onClick={discoverKeywords} disabled={loading}>{loading ? '...' : 'Discover Keywords'}</button>
          </div>
        </section>

        {keywords.length > 0 && (
          <section className="keywords-section">
            <div className="section-header"><h2>Keyword Opportunities</h2><span className="keyword-count">{keywords.length} found</span></div>
            <div className="keywords-grid">
              {keywords.map((kw, idx) => (
                <div key={idx} className={`keyword-card ${selectedKeyword === kw.keyword ? 'selected' : ''}`} onClick={() => requestArticle(kw.keyword)}>
                  <div className="keyword-title">{kw.keyword}</div>
                  <div className="keyword-snippet">{kw.snippet}</div>
                  <button className="btn btn-small">Request Article</button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="articles-section">
          <div className="section-header"><h2>Generated Articles</h2><button className="btn btn-small" onClick={refreshArticles}>Refresh</button></div>
          {articles.length > 0 ? (
            <div className="articles-list">
              {articles.map((art) => (
                <div key={art.id} className="article-card" onClick={() => loadArticle(art.id)}>
                  <div className="article-title">{art.title}</div>
                  <span className={`badge badge-${art.status}`}>{art.status}</span>
                </div>
              ))}
            </div>
          ) : <p className="empty-text">No articles yet.</p>}
        </section>

        {article && (
          <section className="article-section">
            <div className="article-header"><h2>{article.title || 'Untitled Article'}</h2><span className={`badge badge-${article.status}`}>{article.status}</span></div>
            <div className="article-form">
              <div className="form-group"><label>Title</label><input type="text" className="form-input" value={article.title || ''} onChange={(e) => setArticle({...article, title: e.target.value})} /></div>
              <div className="form-group"><label>Content</label><textarea className="form-textarea" value={article.content || ''} onChange={(e) => setArticle({...article, content: e.target.value})} /></div>
              {article.affiliate_links && <div className="affiliate-section"><label>Affiliate Links</label><ul>{article.affiliate_links.map((l, i) => <li key={i}><a href={l.url}>{l.anchor}</a></li>)}</ul></div>}
              <div className="form-actions">
                {!article.preview ? <button className="btn btn-primary" onClick={createPreview}>Generate Preview</button> : <button className="btn btn-success" onClick={publishArticle}>Publish to Webflow</button>}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
