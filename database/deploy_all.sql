-- =====================================================
-- ALIVE Connection - 전체 스키마 (기존 테이블 초기화 후 재생성)
-- =====================================================

-- 기존 테이블/뷰 삭제 (순서 중요: 의존성 역순)
DROP VIEW IF EXISTS v_timeline CASCADE;
DROP VIEW IF EXISTS v_my_connections CASCADE;
DROP TABLE IF EXISTS voice_memos CASCADE;
DROP TABLE IF EXISTS handshake_logs CASCADE;
DROP TABLE IF EXISTS profile_views CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS profile_cards CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_location_point() CASCADE;
DROP FUNCTION IF EXISTS increment_profile_view_count() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 1. USERS
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    company VARCHAR(255),
    title VARCHAR(255),
    gender VARCHAR(20),
    profile_view_count INTEGER DEFAULT 0,
    social_links JSONB DEFAULT '{}'::JSONB,
    default_mode VARCHAR(20) DEFAULT 'business' CHECK (default_mode IN ('business', 'casual')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_company ON users(company);

-- =====================================================
-- 2. PROFILE CARDS
-- =====================================================
CREATE TABLE profile_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('business', 'casual', 'custom')),
    is_default BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(255),
    display_title VARCHAR(255),
    display_company VARCHAR(255),
    display_avatar_url TEXT,
    visible_link_keys TEXT[] DEFAULT ARRAY['email', 'phone', 'linkedin'],
    custom_links JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. INTERACTIONS
-- =====================================================
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT no_self_connection CHECK (source_user_id != target_user_id),
    met_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_point GEOGRAPHY(POINT, 4326),
    location_address TEXT,
    location_place_name VARCHAR(255),
    location_city VARCHAR(255),
    location_country VARCHAR(255),
    event_context VARCHAR(500),
    memo TEXT,
    voice_memo_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_interactions_source ON interactions(source_user_id);
CREATE INDEX idx_interactions_target ON interactions(target_user_id);
CREATE INDEX idx_interactions_met_at ON interactions(met_at DESC);
CREATE INDEX idx_interactions_location ON interactions USING GIST(location_point);
CREATE INDEX idx_interactions_tags ON interactions USING GIN(tags);
CREATE INDEX idx_interactions_timeline ON interactions(source_user_id, met_at DESC);

-- =====================================================
-- 4. HANDSHAKE LOGS
-- =====================================================
CREATE TABLE handshake_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    protocol_version VARCHAR(20),
    initiator_device_id VARCHAR(255),
    receiver_device_id VARCHAR(255),
    raw_payload JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER
);

-- =====================================================
-- 5. VOICE MEMOS
-- =====================================================
CREATE TABLE voice_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    transcription TEXT,
    transcription_status VARCHAR(20) DEFAULT 'pending'
        CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. CONNECTIONS
-- =====================================================
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);

-- =====================================================
-- 7. MESSAGES
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. PROFILE VIEWS
-- =====================================================
CREATE TABLE profile_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. VIEWS
-- =====================================================
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
    i.met_at, i.location_place_name, i.location_city,
    i.event_context, i.memo, i.tags
FROM interactions i
JOIN users u ON u.id = i.target_user_id
WHERE i.status = 'active';

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
-- 10. FUNCTIONS & TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profile_cards_updated_at BEFORE UPDATE ON profile_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interactions_updated_at BEFORE UPDATE ON interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION set_location_point()
RETURNS TRIGGER AS $$ BEGIN
    IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
    END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_interactions_location_point BEFORE INSERT OR UPDATE ON interactions FOR EACH ROW EXECUTE FUNCTION set_location_point();

CREATE OR REPLACE FUNCTION increment_profile_view_count()
RETURNS TRIGGER AS $$ BEGIN
    UPDATE users SET profile_view_count = profile_view_count + 1 WHERE id = NEW.viewed_id;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tr_increment_profile_view AFTER INSERT ON profile_views FOR EACH ROW EXECUTE FUNCTION increment_profile_view_count();

-- =====================================================
-- 11. RLS (Row Level Security)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY users_select ON users FOR SELECT USING (TRUE);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Profile Cards
CREATE POLICY profile_cards_all ON profile_cards FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Interactions
CREATE POLICY interactions_select ON interactions FOR SELECT
    USING (source_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR target_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY interactions_insert ON interactions FOR INSERT
    WITH CHECK (source_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY interactions_update ON interactions FOR UPDATE
    USING (source_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Voice Memos
CREATE POLICY voice_memos_all ON voice_memos FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Connections
CREATE POLICY connections_select ON connections FOR SELECT
    USING (requester_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
           OR receiver_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Messages
CREATE POLICY messages_select ON messages FOR SELECT
    USING (sender_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
           OR receiver_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Profile Views
CREATE POLICY profile_views_insert ON profile_views FOR INSERT WITH CHECK (TRUE);
CREATE POLICY profile_views_select ON profile_views FOR SELECT
    USING (viewed_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- =====================================================
-- 12. AUTH → USERS 자동 생성 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, name, social_links)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
    jsonb_build_object('email', COALESCE(NEW.email, ''))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DONE
