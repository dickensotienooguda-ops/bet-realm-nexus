
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Bet status enum
CREATE TYPE public.bet_status AS ENUM ('open', 'won', 'lost', 'void', 'cashout');

-- Transaction status enum
CREATE TYPE public.tx_status AS ENUM ('pending', 'successful', 'failed', 'reversed');

-- Transaction type enum
CREATE TYPE public.tx_type AS ENUM ('deposit', 'withdrawal', 'bet', 'payout', 'bonus', 'reversal');

-- Match status enum
CREATE TYPE public.match_status AS ENUM ('upcoming', 'live', 'finished', 'postponed', 'cancelled');

-- Market status enum
CREATE TYPE public.market_status AS ENUM ('open', 'suspended', 'settled', 'void');

-- Bet type enum
CREATE TYPE public.bet_type AS ENUM ('single', 'multi');

-- Selection result enum
CREATE TYPE public.selection_result AS ENUM ('pending', 'won', 'lost', 'void', 'push');

-- ============================================================
-- COUNTRIES
-- ============================================================
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL DEFAULT '',
  phone_prefix TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries are readable by everyone" ON public.countries FOR SELECT USING (true);

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment methods are readable by everyone" ON public.payment_methods FOR SELECT USING (true);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  display_name TEXT,
  country_id UUID REFERENCES public.countries(id),
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- USER ROLES (separate table per security best practice)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- WALLETS
-- ============================================================
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  bonus_balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (bonus_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency_code)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies for users — wallet mutations go through server functions

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type tx_type NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  status tx_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- ============================================================
-- VIP TIERS
-- ============================================================
CREATE TABLE public.vip_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  level INT NOT NULL UNIQUE,
  min_wagered NUMERIC(15, 2) NOT NULL DEFAULT 0,
  min_deposits INT NOT NULL DEFAULT 0,
  benefits JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VIP tiers are readable by everyone" ON public.vip_tiers FOR SELECT USING (true);

-- ============================================================
-- USER VIP
-- ============================================================
CREATE TABLE public.user_vip (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.vip_tiers(id),
  total_wagered NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_deposited INT NOT NULL DEFAULT 0,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_vip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own VIP" ON public.user_vip FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- MATCHES (cached from SportMonks)
-- ============================================================
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id BIGINT UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_logo TEXT,
  away_logo TEXT,
  league TEXT,
  league_logo TEXT,
  sport TEXT NOT NULL DEFAULT 'football',
  status match_status NOT NULL DEFAULT 'upcoming',
  kick_off TIMESTAMPTZ NOT NULL,
  home_score INT DEFAULT 0,
  away_score INT DEFAULT 0,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_kick_off ON public.matches(kick_off);
CREATE INDEX idx_matches_external_id ON public.matches(external_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are readable by everyone" ON public.matches FOR SELECT USING (true);

-- ============================================================
-- MARKETS (betting markets per match)
-- ============================================================
CREATE TABLE public.markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  market_type TEXT NOT NULL,
  label TEXT NOT NULL,
  status market_status NOT NULL DEFAULT 'open',
  outcomes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, market_type)
);

CREATE INDEX idx_markets_match_id ON public.markets(match_id);

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Markets are readable by everyone" ON public.markets FOR SELECT USING (true);

-- ============================================================
-- BETS
-- ============================================================
CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_type bet_type NOT NULL DEFAULT 'single',
  total_odds NUMERIC(10, 2) NOT NULL,
  stake NUMERIC(15, 2) NOT NULL CHECK (stake > 0),
  potential_payout NUMERIC(15, 2) NOT NULL,
  status bet_status NOT NULL DEFAULT 'open',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bets_user_id ON public.bets(user_id);
CREATE INDEX idx_bets_status ON public.bets(status);

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bets" ON public.bets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create bets" ON public.bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- BET SELECTIONS
-- ============================================================
CREATE TABLE public.bet_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_id UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id),
  match_id UUID NOT NULL REFERENCES public.matches(id),
  outcome_key TEXT NOT NULL,
  outcome_label TEXT,
  odds NUMERIC(10, 2) NOT NULL,
  status selection_result NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bet_selections_bet_id ON public.bet_selections(bet_id);
CREATE INDEX idx_bet_selections_market_id ON public.bet_selections(market_id);

ALTER TABLE public.bet_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own selections" ON public.bet_selections FOR SELECT TO authenticated
  USING (bet_id IN (SELECT id FROM public.bets WHERE user_id = auth.uid()));
CREATE POLICY "Users can create selections" ON public.bet_selections FOR INSERT TO authenticated
  WITH CHECK (bet_id IN (SELECT id FROM public.bets WHERE user_id = auth.uid()));

-- ============================================================
-- UTILITY: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AUTO-CREATE profile + wallet on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
