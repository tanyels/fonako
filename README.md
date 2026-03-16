# Fonako

Türk yatırım fonlarının USD, EUR ve altın bazında gerçek performansını gösteren araç.

A tool to show the real performance of Turkish investment funds against USD, EUR, and gold.

## Quick Start

### 1. Install dependencies

```bash
cd fonako
npm install
```

### 2. Set up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the contents of `supabase/schema.sql`
4. Copy your project URL and anon key from Settings > API

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Populating Data

### Set up Python scraper

```bash
cd scripts
python -m venv venv
source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
```

### Fetch historical data (one-time)

```bash
python scraper.py --historical
```

### Daily updates (set up as cron job)

```bash
python scraper.py --daily
```

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Data**: TEFAS, TCMB, Yahoo Finance

## License

MIT
