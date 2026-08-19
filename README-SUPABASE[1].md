# Remeselnik AI + Supabase

Táto verzia už načítava cenník priamo zo Supabase.

## 1. Nainštaluj balíčky

```bash
npm install
```

## 2. Nastav premenné prostredia

Vytvor `.env.local` podľa `.env.local.example`.

Potrebné sú:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

## 3. Supabase

Použitý projekt:

`Remeselnik-AI`

Tabuľka:

`price_list`

Aplikácia číta iba aktívne položky:

`active = true`

## 4. Spustenie

```bash
npm run dev
```

Potom otvor:

`http://localhost:3000`

## 5. GitHub / Vercel

Ak nahrávaš projekt na GitHub, súbor `.env.local` tam NEDÁVAJ.

Na Vercel pridaj rovnaké premenné v:

Project Settings -> Environment Variables
