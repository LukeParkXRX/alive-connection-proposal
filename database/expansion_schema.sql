-- =====================================================
-- ALIVE Connection - Expansion Schema
-- =====================================================

-- 1. Extend Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_view_count INTEGER DEFAULT 0;

-- 2. Connections Table (Relationship Logic)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);

CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);

-- 3. Messages Table (Lightweight Chat)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at ASC);

-- 4. Profile View Logs (Analytics)
CREATE TABLE IF NOT EXISTS profile_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to increment view count
CREATE OR REPLACE FUNCTION increment_profile_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET profile_view_count = profile_view_count + 1 
    WHERE id = NEW.viewed_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_increment_profile_view
    AFTER INSERT ON profile_views
    FOR EACH ROW EXECUTE FUNCTION increment_profile_view_count();

-- 5. RLS Policies for Expansion
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Connections: Can see own requests/responses
CREATE POLICY connections_select ON connections FOR SELECT
    USING (requester_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) 
           OR receiver_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Messages: Can see own messages
CREATE POLICY messages_select ON messages FOR SELECT
    USING (sender_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) 
           OR receiver_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Profile views: Insertable by anyone, readable by the viewed user
CREATE POLICY profile_views_insert ON profile_views FOR INSERT WITH CHECK (TRUE);
CREATE POLICY profile_views_select ON profile_views FOR SELECT 
    USING (viewed_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
