# Premium Signs SEO Pipeline

Automated SEO content pipeline for premiumsigns.co.uk

## Quick Start

### 1. Backend (Render)

```bash
cd backend
cp env.example .env
# Edit .env with your credentials
pip install -r requirements.txt
python main.py
```

### 2. Frontend (Vercel)

```bash
cd frontend
npm install
npm run build
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `WP_USERNAME` | WordPress admin username |
| `WP_APP_PASSWORD` | Application password from WP Admin → Profile |
| `WP_SITE_URL` | Your WordPress site URL |
| `CLAUDE_API_KEY` | API key from anthropic.com |
| `VALUESERP_API_KEY` | API key from valueserp.com (free) |

## API Endpoints

- `POST /keywords` - Discover keywords from seed topic
- `POST /generate` - Generate article for keyword  
- `POST /preview` - Create draft and get preview URL
- `POST /publish` - Publish approved article
- `GET /posts` - List existing posts (for internal linking)

## Deployment

### Backend (Render)
1. Connect GitHub repo to Render
2. Set environment variables in Render dashboard
3. Deploy

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Add REACT_APP_API_URL environment variable (your Render backend URL)
3. Deploy
