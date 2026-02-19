import os
import json
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import urllib.parse

app = FastAPI(title="Premium Signs SEO Pipeline")

# Environment variables
WP_USERNAME = os.getenv("WP_USERNAME", "nick")
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD", "")
WP_SITE_URL = os.getenv("WP_SITE_URL", "https://premiumsigns.co.uk")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
VALUESERP_API_KEY = os.getenv("VALUESERP_API_KEY", "")

WP_API_URL = f"{WP_SITE_URL}/wp-json/wp/v2"
AUTH = (WP_USERNAME, WP_APP_PASSWORD)

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

def get_wp_headers():
    return {
        "Authorization": f"Basic {requests.auth.HTTPBasicAuth(WP_USERNAME, WP_APP_PASSWORD).encode().decode()}",
        "Content-Type": "application/json"
    }

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
    """Discover keyword opportunities from seed topic"""
    if not VALUESERP_API_KEY:
        raise HTTPException(status_code=500, detail="VALUESERP_API_KEY not configured")
    
    # Use ValueSERP API
    serp_url = "https://api.valueserp.com/search"
    params = {
        "api_key": VALUESERP_API_KEY,
        "q": req.topic,
        "num": 50
    }
    
    try:
        response = requests.get(serp_url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        keywords = []
        seen = set()
        
        if "organic_results" in data:
            for result in data["organic_results"]:
                title = result.get("title", "")
                snippet = result.get("snippet", "")
                
                # Extract potential keywords from titles
                if title and title not in seen:
                    keywords.append({
                        "keyword": title[:200],
                        "url": result.get("link", ""),
                        "snippet": snippet[:300] if snippet else ""
                    })
                    seen.add(title)
        
        return {"keywords": keywords[:20], "topic": req.topic}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Keyword discovery failed: {str(e)}")

@app.post("/generate")
def generate_article(req: GenerateRequest):
    """Generate SEO-optimized article using Claude"""
    if not CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="CLAUDE_API_KEY not configured")
    
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
    
    # Generate content with Claude
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
        claude_response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            json={
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 4000,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=120
        )
        
        if claude_response.status_code != 200:
            raise Exception(f"Claude API error: {claude_response.text}")
        
        result = claude_response.json()
        content = result["content"][0]["text"]
        
        # Parse JSON from response
        try:
            article = json.loads(content)
        except:
            # Try to extract JSON from response
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
