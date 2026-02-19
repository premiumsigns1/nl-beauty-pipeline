import os
import json
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import urllib.parse
from pytrends.request import TrendReq

app = FastAPI(title="Premium Signs SEO Pipeline")

# Environment variables
WP_USERNAME = os.getenv("WP_USERNAME", "nick")
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD", "")
WP_SITE_URL = os.getenv("WP_SITE_URL", "https://premiumsigns.co.uk")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")

WP_API_URL = f"{WP_SITE_URL}/wp-json/wp/v2"

class KeywordRequest(BaseModel):
    topic: str

class GenerateRequest(BaseModel):
    keyword: str
    target_url: Optional[str] = None

class PreviewRequest(BaseModel):
    title: str
    content: str
    meta_description: str
    focus_keyword: str

class PublishRequest(BaseModel):
    post_id: int

@app.get("/")
def root():
    return {"status": "ok", "message": "Premium Signs SEO Pipeline API"}

@app.get("/posts")
def list_posts(per_page: int = 20):
    """List existing WordPress posts for internal linking"""
    if not WP_APP_PASSWORD:
        raise HTTPException(status_code=500, detail="WP_APP_PASSWORD not configured")
    
    response = requests.get(
        f"{WP_API_URL}/posts",
        params={"per_page": per_page, "status": "publish"},
        auth=(WP_USERNAME, WP_APP_PASSWORD)
    )
    response.raise_for_status()
    
    posts = response.json()
    return [{
        "id": p["id"],
        "title": p["title"]["rendered"],
        "url": p["link"],
        "slug": p["slug"]
    } for p in posts]

@app.post("/keywords")
def discover_keywords(req: KeywordRequest):
    """Discover keyword opportunities using Google Trends"""
    try:
        pytrends = TrendReq(hl='en-GB', tz=0)
        pytrends.build_payload([req.topic], cat=0, timeframe='today 12-m')
        
        # Get related queries
        related_queries = pytrends.related_queries()
        
        keywords = []
        seen = set()
        
        if req.topic in related_queries:
            # Top queries
            top = related_queries[req.topic].get('top')
            if top is not None:
                for row in top.head(20).itertuples():
                    query = row.query
                    if query and query not in seen:
                        keywords.append({
                            "keyword": query,
                            "url": f"https://www.google.com/search?q={urllib.parse.quote(query)}",
                            "snippet": f"Trending search related to {req.topic}"
                        })
                        seen.add(query)
            
            # Rising queries
            rising = related_queries[req.topic].get('rising')
            if rising is not None:
                for row in rising.head(10).itertuples():
                    query = row.query
                    if query and query not in seen:
                        keywords.append({
                            "keyword": query,
                            "url": f"https://www.google.com/search?q={urllib.parse.quote(query)}",
                            "snippet": f"Rising trend related to {req.topic}"
                        })
                        seen.add(query)
        
        # If no trends data, use the topic itself and variations
        if not keywords:
            keywords = [
                {"keyword": f"{req.topic} UK", "url": f"https://www.google.com/search?q={urllib.parse.quote(req.topic + ' UK')}", "snippet": "UK-focused search"},
                {"keyword": f"best {req.topic}", "url": f"https://www.google.com/search?q={urllib.parse.quote('best ' + req.topic)}", "snippet": "Best of searches"},
                {"keyword": f"{req.topic} near me", "url": f"https://www.google.com/search?q={urllib.parse.quote(req.topic + ' near me')}", "snippet": "Local search intent"},
            ]
        
        return {"keywords": keywords[:20], "topic": req.topic}
        
    except Exception as e:
        # Fallback to basic keywords if trends fails
        keywords = [
            {"keyword": f"{req.topic} UK", "url": f"https://www.google.com/search?q={urllib.parse.quote(req.topic + ' UK')}", "snippet": "UK-focused search"},
            {"keyword": f"best {req.topic}", "url": f"https://www.google.com/search?q={urllib.parse.quote('best ' + req.topic)}", "snippet": "Best of searches"},
            {"keyword": f"{req.topic} prices", "url": f"https://www.google.com/search?q={urllib.parse.quote(req.topic + ' prices')}", "snippet": "Price search intent"},
            {"keyword": f"buy {req.topic}", "url": f"https://www.google.com/search?q={urllib.parse.quote('buy ' + req.topic)}", "snippet": "Purchase intent"},
        ]
        return {"keywords": keywords, "topic": req.topic}

@app.post("/generate")
def generate_article(req: GenerateRequest):
    """Generate SEO-optimized article using Minimax"""
    if not MINIMAX_API_KEY:
        raise HTTPException(status_code=500, detail="MINIMAX_API_KEY not configured")
    
    # Get existing posts for internal linking
    posts_response = requests.get(
        f"{WP_API_URL}/posts",
        params={"per_page": 50, "status": "publish"},
        auth=(WP_USERNAME, WP_APP_PASSWORD)
    )
    existing_posts = posts_response.json() if posts_response.status_code == 200 else []
    
    internal_links = "\n".join([
        f"- {p['title']['rendered']}: {p['link']}" 
        for p in existing_posts[:10]
    ])
    
    # Generate content with Minimax
    prompt = f"""Generate a SEO-optimized article for the keyword: {req.keyword}

Instructions:
1. Write in English (UK)
2. NO unnecessary hyphens (e.g., "real time" not "real-time", "cutting edge" not "cutting-edge")
3. Write professionally for a signs business (premiumsigns.co.uk)
4. Include 2-4 internal links naturally throughout the content
5. Include FAQ section at the end
6. Output as JSON with: title, meta_description, content (HTML), focus_keyword

Relevant existing pages on the site for internal linking:
{internal_links}

Generate the article now. Output ONLY valid JSON, no markdown formatting."""

    try:
        minimax_response = requests.post(
            "https://api.minimax.chat/v1/text/chatcompletion_pro",
            headers={
                "Authorization": f"Bearer {MINIMAX_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "MiniMax-Text-01",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4000
            },
            timeout=120
        )
        
        if minimax_response.status_code != 200:
            raise Exception(f"Minimax API error: {minimax_response.text}")
        
        result = minimax_response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Parse JSON from response
        try:
            article = json.loads(content)
        except:
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                article = json.loads(json_match.group())
            else:
                raise Exception("Could not parse article JSON")
        
        return article
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

@app.post("/preview")
def create_preview(req: PreviewRequest):
    """Create draft post and return preview URL"""
    if not WP_APP_PASSWORD:
        raise HTTPException(status_code=500, detail="WP_APP_PASSWORD not configured")
    
    post_data = {
        "title": req.title,
        "content": req.content,
        "status": "draft",
        "meta": {
            "_yoast_wpseo_title": req.title,
            "_yoast_wpseo_metadesc": req.meta_description,
            "_yoast_wpseo_focuskw": req.focus_keyword
        }
    }
    
    response = requests.post(
        f"{WP_API_URL}/posts",
        json=post_data,
        auth=(WP_USERNAME, WP_APP_PASSWORD)
    )
    response.raise_for_status()
    
    post = response.json()
    preview_url = f"{WP_SITE_URL}/?p={post['id']}&preview=true"
    
    return {
        "post_id": post["id"],
        "preview_url": preview_url,
        "title": post["title"]["rendered"]
    }

@app.post("/publish")
def publish_article(req: PublishRequest):
    """Publish a draft post"""
    if not WP_APP_PASSWORD:
        raise HTTPException(status_code=500, detail="WP_APP_PASSWORD not configured")
    
    response = requests.post(
        f"{WP_API_URL}/posts/{req.post_id}",
        json={"status": "publish"},
        auth=(WP_USERNAME, WP_APP_PASSWORD)
    )
    response.raise_for_status()
    
    post = response.json()
    return {
        "post_id": post["id"],
        "published_url": post["link"],
        "title": post["title"]["rendered"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
