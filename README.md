Remeselnik-AI

## Learning V2

The estimate flow now:
1. Loads the active Supabase price list.
2. Loads up to 10 approved historical estimates.
3. Sends those approved experiences to the AI as context.
4. Saves every new AI estimate to `estimates`.
5. Lets the user edit the estimate.
6. `Schváliť a naučiť AI` saves the final version as an approved experience.

Required server environment variables:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
