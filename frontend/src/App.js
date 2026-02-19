import React, { useState } from 'react';
import axios from 'axios';
import './index.css';

// Configure API base URL - update for production
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const discoverKeywords = async () => {
    if (!topic.trim()) return;
    
    setLoading(true);
    setStatus(null);
    setKeywords([]);
    setSelectedKeyword(null);
    setArticle(null);
    setPreviewUrl(null);

    try {
      const response = await axios.post(`${API_BASE}/keywords`, { topic });
      setKeywords(response.data.keywords || []);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to discover keywords' });
    } finally {
      setLoading(false);
    }
  };

  const generateArticle = async (keyword) => {
    setLoading(true);
    setStatus(null);
    setSelectedKeyword(keyword);
    setArticle(null);
    setPreviewUrl(null);

    try {
      const response = await axios.post(`${API_BASE}/generate`, { keyword });
      setArticle({
        title: response.data.title || '',
        meta_description: response.data.meta_description || '',
        content: response.data.content || '',
        focus_keyword: response.data.focus_keyword || keyword
      });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to generate article' });
    } finally {
      setLoading(false);
    }
  };

  const createPreview = async () => {
    if (!article) return;

    setLoading(true);
    setStatus(null);

    try {
      const response = await axios.post(`${API_BASE}/preview`, article);
      setPreviewUrl(response.data.preview_url);
      setStatus({ type: 'success', message: 'Draft created! Click preview to review.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to create preview' });
    } finally {
      setLoading(false);
    }
  };

  const publishArticle = async () => {
    if (!previewUrl) return;

    setLoading(true);
    setStatus(null);

    try {
      // Extract post ID from preview URL
      const postId = previewUrl.split('?p=')[1]?.split('&')[0];
      await axios.post(`${API_BASE}/publish`, { post_id: parseInt(postId) });
      setStatus({ type: 'success', message: 'Article published successfully!' });
      setPreviewUrl(null);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to publish' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo">Premium Signs <span>SEO Pipeline</span></h1>
      </header>

      <main className="main-content">
        {/* Status Message */}
        {status && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}

        {/* Search Section */}
        <section className="search-section">
          <h2>Enter a seed topic to discover keyword opportunities</h2>
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="e.g., engraved signs London, brass plaques..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && discoverKeywords()}
            />
            <button className="btn btn-primary" onClick={discoverKeywords} disabled={loading}>
              {loading ? <span className="loading-spinner"></span> : 'Discover Keywords'}
            </button>
          </div>
        </section>

        {/* Keywords Section */}
        {keywords.length > 0 && (
          <section className="keywords-section">
            <div className="section-header">
              <h2>Keyword Opportunities</h2>
              <span className="keyword-count">{keywords.length} found</span>
            </div>
            <div className="keywords-grid">
              {keywords.map((kw, idx) => (
                <div
                  key={idx}
                  className={`keyword-card ${selectedKeyword === kw.keyword ? 'selected' : ''}`}
                  onClick={() => generateArticle(kw.keyword)}
                >
                  <div className="keyword-title">{kw.keyword}</div>
                  <div className="keyword-snippet">{kw.snippet}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Article Section */}
        {selectedKeyword && (
          <section className="article-section">
            <div className="article-header">
              <h2>
                {article ? 'Generated Article' : `Generating for: ${selectedKeyword}`}
                {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="preview-link">↗ Preview</a>}
              </h2>
              <div className="article-meta">
                <span className={`badge ${loading ? 'badge-generating' : article ? 'badge-ready' : 'badge-draft'}`}>
                  {loading ? 'Generating...' : article ? 'Ready for Review' : 'Draft'}
                </span>
              </div>
            </div>

            {loading && !article && (
              <div className="loading-overlay">
                <span className="loading-spinner"></span>
                <span>Generating SEO-optimized content...</span>
              </div>
            )}

            {article && !loading && (
              <div className="article-form">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={article.title}
                    onChange={(e) => setArticle({...article, title: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Meta Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={article.meta_description}
                    onChange={(e) => setArticle({...article, meta_description: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Focus Keyword</label>
                  <input
                    type="text"
                    className="form-input"
                    value={article.focus_keyword}
                    onChange={(e) => setArticle({...article, focus_keyword: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Content</label>
                  <textarea
                    className="form-textarea"
                    value={article.content}
                    onChange={(e) => setArticle({...article, content: e.target.value})}
                  />
                </div>

                <div className="form-actions">
                  {!previewUrl ? (
                    <button className="btn btn-primary" onClick={createPreview}>
                      Create Preview
                    </button>
                  ) : (
                    <>
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        View Preview
                      </a>
                      <button className="btn btn-success" onClick={publishArticle}>
                        Publish
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {!keywords.length && !loading && topic && (
          <div className="empty-state">
            <h3>No keywords found</h3>
            <p>Try a different topic or check your API keys</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
