
ALTER TABLE public.bet_selections DROP CONSTRAINT IF EXISTS bet_selections_match_id_fkey;
ALTER TABLE public.bet_selections DROP CONSTRAINT IF EXISTS bet_selections_market_id_fkey;
ALTER TABLE public.bet_selections DROP CONSTRAINT IF EXISTS bet_selections_bet_id_fkey;

ALTER TABLE public.bet_selections 
  ALTER COLUMN match_id TYPE text USING match_id::text,
  ALTER COLUMN market_id TYPE text USING market_id::text;

-- Re-add only the bet_id FK (still UUID -> bets.id)
ALTER TABLE public.bet_selections
  ADD CONSTRAINT bet_selections_bet_id_fkey
  FOREIGN KEY (bet_id) REFERENCES public.bets(id) ON DELETE CASCADE;
