# WordPress SEO Pipeline - Specification

## Project Overview
- **Project Name:** Premium Signs SEO Pipeline
- **Type:** React Web Application + Python Backend API
- **Core Functionality:** Automated SEO content pipeline that discovers keyword opportunities, generates optimized articles using Claude, and publishes to WordPress with internal linking
- **Target Users:** Site owner (Nick) managing premiumsigns.co.uk

## Tech Stack
- **Frontend:** React + Vercel
- **Backend:** Python (FastAPI) on Render
- **APIs:** ValueSERP (keywords), Claude (content), WordPress REST API

## Functionality Specification

### 1. Dashboard (React Frontend)
- Clean, professional interface matching premiumsigns.co.uk brand
- Input field for seed topic/keyword
- Display discovered keyword clusters
- Show generated articles with preview
- Approve/reject workflow before publishing
- Status indicators for each article (draft, pending review, published)

### 2. Keyword Discovery (Backend)
- Input: seed topic from dashboard
- Use ValueSERP API to discover related keywords
- Use pytrends for Google Trends data
- Group keywords into semantic clusters
- Output: list of keyword opportunities with metrics

### 3. Content Generation (Backend)
- For each keyword opportunity:
  - Generate title (SEO optimized)
  - Generate meta description
  - Generate full article body (800-1500 words)
  - Add schema markup (FAQ, HowTo)
  - Add Yoast SEO meta fields
- Internal linking: find relevant existing pages on premiumsigns.co.uk and naturally embed links

### 4. WordPress Publishing (Backend)
- Draft creation via REST API
- Preview URL generation
- Publish on approval
- Support Yoast SEO fields

### 5. Internal Link Insertion
- Fetch existing post titles/URLs from WordPress
- Identify relevant pages to link to based on keyword/context
- Insert 2-4 internal links naturally throughout article
- Vary anchor text for diversity

## Environment Variables
```
WP_USERNAME=nick
WP_APP_PASSWORD=<app_password>
WP_SITE_URL=https://premiumsigns.co.uk
CLAUDE_API_KEY=<api_key>
VALUESERP_API_KEY=<api_key>
```

## API Endpoints (Backend)
- `POST /keywords` - Discover keywords from seed topic
- `POST /generate` - Generate article for keyword
- `POST /preview` - Create draft and return preview URL
- `POST /publish` - Publish approved article
- `GET /posts` - List existing posts (for internal linking)

## Acceptance Criteria
1. User can input seed topic and receive keyword opportunities
2. User can generate article for any keyword
3. Generated articles include title, meta description, body, schema
4. Internal links are naturally placed
5. User can preview article before publishing
6. User can approve/reject articles
7. Approved articles publish to WordPress
8. Yoast SEO fields are populated
