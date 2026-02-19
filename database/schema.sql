-- =====================================================
-- ALIVE Connection - Supabase Database Schema
-- =====================================================
-- Designed for future Graph DB / Ontology expansion
-- Node-Edge pattern: Users (Nodes) + Interactions (Edges)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- For geospatial queries

-- =====================================================
-- 1. USER NODE - Core Identity
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Auth link (Supabase Auth)
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic Identity
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    company VARCHAR(255),
    title VARCHAR(255),

    -- Social Links (JSONB for flexibility)
    -- Structure: { "email": "...", "phone": "...", "linkedin": "...", etc. }
    social_links JSONB DEFAULT '{}'::JSONB,

    -- Profile Settings
    default_mode VARCHAR(20) DEFAULT 'business' CHECK (default_mode IN ('business', 'casual')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    -- For future ontology expansion
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Index for common queries
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_company ON users(company);
CREATE INDEX idx_users_updated_at ON users(updated_at DESC);

-- =====================================================
-- 2. PROFILE CARDS - Public facing identities
-- =====================================================
-- Users can have multiple cards for different contexts
CREATE TABLE profile_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Card Configuration
    name VARCHAR(100) NOT NULL,  -- e.g., "Business", "Personal", "Investor"
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('business', 'casual', 'custom')),
    is_default BOOLEAN DEFAULT FALSE,

    -- Display Override (null = use user's default)
    display_name VARCHAR(255),
    display_title VARCHAR(255),
    display_company VARCHAR(255),
    display_avatar_url TEXT,

    -- Visible Links (subset of user's social_links)
    -- Keys to show from user's social_links
    visible_link_keys TEXT[] DEFAULT ARRAY['email', 'phone', 'linkedin'],

    -- Custom Links (card-specific overrides)
    custom_links JSONB DEFAULT '{}'::JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profile_cards_user_id ON profile_cards(user_id);
CREATE INDEX idx_profile_cards_default ON profile_cards(user_id, is_default) WHERE is_default = TRUE;

-- =====================================================
-- 3. INTERACTION NODE (THE EDGE) - Connection Events
-- =====================================================
-- This is the core "edge" in our relationship graph
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- The Edge: Source -> Target
    source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Prevent self-connection and ensure unique edges
    CONSTRAINT no_self_connection CHECK (source_user_id != target_user_id),

    -- When and Where
    met_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Location Data (separate columns for indexing + JSONB for flexibility)
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_point GEOGRAPHY(POINT, 4326),  -- PostGIS for geospatial queries
    location_address TEXT,
    location_place_name VARCHAR(255),  -- e.g., "Moscone Center"
    location_city VARCHAR(255),
    location_country VARCHAR(255),

    -- Context
    event_context VARCHAR(500),  -- e.g., "TechCrunch Disrupt 2026"

    -- User Notes
    memo TEXT,
    voice_memo_url TEXT,

    -- Tags for categorization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Relationship status (for future features)
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- For future ontology expansion (e.g., relationship type, strength score)
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Critical indexes for interaction queries
CREATE INDEX idx_interactions_source ON interactions(source_user_id);
CREATE INDEX idx_interactions_target ON interactions(target_user_id);
CREATE INDEX idx_interactions_met_at ON interactions(met_at DESC);
CREATE INDEX idx_interactions_location ON interactions USING GIST(location_point);
CREATE INDEX idx_interactions_tags ON interactions USING GIN(tags);
CREATE INDEX idx_interactions_status ON interactions(status);

-- Composite index for timeline queries
CREATE INDEX idx_interactions_timeline ON interactions(source_user_id, met_at DESC);

-- =====================================================
-- 4. HANDSHAKE LOGS - NFC Exchange History
-- =====================================================
-- Raw log of all NFC exchanges (for analytics, debugging)
CREATE TABLE handshake_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Participants
    initiator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Result
    interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,

    -- Technical Details
    protocol_version VARCHAR(20),
    initiator_device_id VARCHAR(255),
    receiver_device_id VARCHAR(255),

    -- Raw payload (for debugging)
    raw_payload JSONB,

    -- Timing
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER  -- How long the exchange took
);

CREATE INDEX idx_handshake_logs_timestamp ON handshake_logs(timestamp DESC);
CREATE INDEX idx_handshake_logs_success ON handshake_logs(success);

-- =====================================================
-- 5. VOICE MEMOS - Attached to interactions
-- =====================================================
CREATE TABLE voice_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Audio file
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,

    -- Transcription (STT)
    transcription TEXT,
    transcription_status VARCHAR(20) DEFAULT 'pending'
        CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_memos_interaction ON voice_memos(interaction_id);
CREATE INDEX idx_voice_memos_user ON voice_memos(user_id);

-- =====================================================
-- 6. VIEWS - Convenient Query Interfaces
-- =====================================================

-- View: My Connections with latest interaction
CREATE VIEW v_my_connections AS
SELECT
    i.source_user_id AS my_user_id,
    u.id AS connection_user_id,
    u.name AS connection_name,
    u.avatar_url AS connection_avatar,
    u.company AS connection_company,
    u.title AS connection_title,
    u.social_links AS connection_social_links,
    i.id AS latest_interaction_id,
    i.met_at,
    i.location_place_name,
    i.location_city,
    i.event_context,
    i.memo,
    i.tags
FROM interactions i
JOIN users u ON u.id = i.target_user_id
WHERE i.status = 'active';

-- View: Timeline with full context
CREATE VIEW v_timeline AS
SELECT
    i.*,
    source_user.name AS my_name,
    target_user.name AS connection_name,
    target_user.avatar_url AS connection_avatar,
    target_user.company AS connection_company,
    target_user.title AS connection_title
FROM interactions i
JOIN users source_user ON source_user.id = i.source_user_id
JOIN users target_user ON target_user.id = i.target_user_id
WHERE i.status = 'active'
ORDER BY i.met_at DESC;

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_cards_updated_at
    BEFORE UPDATE ON profile_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at
    BEFORE UPDATE ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create geography point from lat/lng
CREATE OR REPLACE FUNCTION set_location_point()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_interactions_location_point
    BEFORE INSERT OR UPDATE ON interactions
    FOR EACH ROW EXECUTE FUNCTION set_location_point();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

-- Users: Can read any user, but only update own
CREATE POLICY users_select ON users FOR SELECT USING (TRUE);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Profile Cards: Owner only
CREATE POLICY profile_cards_all ON profile_cards FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Interactions: Can see own (as source or target)
CREATE POLICY interactions_select ON interactions FOR SELECT
    USING (
        source_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR target_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Interactions: Can only insert/update as source
CREATE POLICY interactions_insert ON interactions FOR INSERT
    WITH CHECK (source_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY interactions_update ON interactions FOR UPDATE
    USING (source_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Voice Memos: Owner only
CREATE POLICY voice_memos_all ON voice_memos FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- =====================================================
-- 9. SAMPLE DATA (for development)
-- =====================================================
-- Uncomment to seed test data

/*
INSERT INTO users (id, name, bio, company, title, social_links) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Alice Kim', 'AI Researcher', 'TechCorp', 'Senior Engineer',
     '{"email": "alice@techcorp.com", "linkedin": "https://linkedin.com/in/alicekim", "phone": "+1-555-0101"}'),
    ('22222222-2222-2222-2222-222222222222', 'Bob Johnson', 'Startup Founder', 'InnovateLabs', 'CEO',
     '{"email": "bob@innovatelabs.com", "twitter": "https://twitter.com/bobjohnson", "phone": "+1-555-0102"}');

INSERT INTO interactions (source_user_id, target_user_id, met_at, location_place_name, location_city, event_context, memo) VALUES
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     '2026-02-14 14:30:00+00', 'Venetian Expo', 'Las Vegas', 'CES 2026', 'Discussed AI partnership opportunities');
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================
