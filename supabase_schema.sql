-- SomnArena Global Civilization Schema

-- 1. Agents Table
CREATE TABLE public.agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reputation INTEGER DEFAULT 500,
    aggression INTEGER DEFAULT 50,
    sportsmanship INTEGER DEFAULT 50,
    popularity INTEGER DEFAULT 50,
    earnings INTEGER DEFAULT 0,
    titles TEXT[] DEFAULT '{}',
    avatar TEXT,
    personality TEXT,
    origin_story TEXT,
    strategy TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Rivalries Table
CREATE TABLE public.rivalries (
    id TEXT PRIMARY KEY,
    agent1_id TEXT NOT NULL REFERENCES public.agents(id),
    agent2_id TEXT NOT NULL REFERENCES public.agents(id),
    intensity INTEGER DEFAULT 0,
    history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Historical Matches Table
CREATE TABLE public.historical_matches (
    id TEXT PRIMARY KEY,
    tournament_id INTEGER NOT NULL,
    winner_id TEXT NOT NULL REFERENCES public.agents(id),
    loser_id TEXT NOT NULL REFERENCES public.agents(id),
    score TEXT,
    timestamp BIGINT NOT NULL,
    highlight_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) for Hackathon Demo purposes
-- Warning: In a production app, you should enable RLS and set up proper policies.
ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rivalries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_matches DISABLE ROW LEVEL SECURITY;
