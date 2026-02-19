/**
 * App — ALIVE Business NFC 웹 대시보드 루트 컴포넌트
 * 반응형 레이아웃 + 다크모드 지원
 */

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useDarkMode } from './hooks/useDarkMode';
import { useIsMobile } from './hooks/useMediaQuery';
import { Menu, User as UserIcon, MoreVertical } from 'lucide-react';

import { LoadingScreen, ErrorScreen, LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { ConnectionDetail } from './components/ConnectionDetail';
import { ChatPanel } from './components/ChatPanel';
import { EmptyState } from './components/EmptyState';

export default function App() {
  /* ---- 상태 ---- */
  const [session, setSession] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isDark, toggle: toggleDark } = useDarkMode();
  const isMobile = useIsMobile();

  /* ---- 인증 초기화 ---- */
  useEffect(() => {
    console.log("ALIVE Dashboard: Initializing...");

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log("ALIVE Dashboard: Session loaded", !!session);
        setSession(session);
      } catch (err: any) {
        console.error("ALIVE Dashboard: Auth error", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("ALIVE Dashboard: Auth state changed", _event);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ---- 연결 목록 가져오기 ---- */
  useEffect(() => {
    if (session) {
      fetchConnections();
    }
  }, [session]);

  const fetchConnections = async () => {
    console.log("ALIVE Dashboard: Fetching connections...");
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select(`
          *,
          target_user:users!interactions_target_user_id_fkey(*)
        `)
        .eq('source_user_id', session?.user?.id)
        .order('met_at', { ascending: false });

      if (error) {
        console.warn("ALIVE Dashboard: DB error or table missing", error);
        return;
      }

      if (data) {
        setConnections(data);
      }
    } catch (err) {
      console.error("ALIVE Dashboard: Fetch error", err);
    }
  };

  /* ---- 로그인 핸들러 ---- */
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  const handleGuestLogin = () => {
    console.log("ALIVE Dashboard: Entering Guest Mode");
    const guestSession = {
      user: {
        id: 'guest-user-id',
        email: 'guest@alive.internal',
        user_metadata: { full_name: 'Guest User' }
      }
    };
    setSession(guestSession);

    setConnections([
      {
        id: 'conn-1',
        met_at: new Date().toISOString(),
        location_place_name: 'ALIVE Demo Center',
        location_address: 'Seoul, South Korea',
        target_user: {
          name: 'Demo Connection',
          title: 'ALIVE Platform Lead',
          company: 'XRX Labs',
          bio: 'Welcome to the ALIVE Guest Dashboard! This is a preview of how you can manage your connections.',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
        }
      }
    ]);
  };

  const handleLogout = async () => {
    if (session?.user?.id === 'guest-user-id') {
      setSession(null);
      setConnections([]);
    } else {
      await supabase.auth.signOut();
    }
  };

  /* ---- 연결 선택 (모바일에서 사이드바 자동 닫기) ---- */
  const handleSelectConnection = (conn: any) => {
    setSelectedConnection(conn);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  /* ---- 조건부 화면 렌더링 ---- */
  if (loading) return <LoadingScreen />;

  if (error) return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;

  if (!session) return <LoginScreen onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;

  /* ---- 인증된 레이아웃 ---- */
  return (
    <div className="flex h-screen bg-background dark:bg-gray-950 overflow-hidden font-sans selection:bg-accent/20">
      {/* 사이드바 */}
      <Sidebar
        connections={connections}
        selectedConnection={selectedConnection}
        onSelectConnection={handleSelectConnection}
        searchText={searchText}
        onSearchChange={setSearchText}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isDark={isDark}
        onToggleDark={toggleDark}
      />

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col bg-backgroundAlt dark:bg-gray-900 min-w-0" role="main">
        {/* 모바일 헤더 (햄버거 메뉴) */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-950 border-b border-border/20 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-textPrimary dark:text-gray-200"
            aria-label={sidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-accent">ALIVE</h1>
        </div>

        {selectedConnection ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 컨텍스트 헤더 */}
            <header className="px-4 lg:px-8 py-4 lg:py-6 bg-white dark:bg-gray-950 border-b border-border/20 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3 lg:gap-5 min-w-0">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden bg-accent/10 dark:bg-accent/20 shadow-lg border border-accent/10 dark:border-accent/20 flex-shrink-0">
                  <img
                    src={selectedConnection.target_user?.avatar_url}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg lg:text-2xl font-extrabold tracking-tight text-textPrimary dark:text-gray-100 truncate">
                    {selectedConnection.target_user?.name}
                  </h2>
                  <p className="text-textSecondary dark:text-gray-400 font-medium text-sm truncate">
                    {selectedConnection.target_user?.title}
                    {selectedConnection.target_user?.company
                      ? ` at ${selectedConnection.target_user.company}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="p-3 bg-backgroundAlt dark:bg-gray-800 rounded-2xl hover:bg-accent/10 dark:hover:bg-accent/20 hover:text-accent transition-all text-textPrimary dark:text-gray-300 active:scale-95">
                  <UserIcon className="w-5 h-5" />
                </button>
                <button className="p-3 bg-backgroundAlt dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-textPrimary dark:text-gray-300 active:scale-95">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* 컨텐츠: 모바일 세로 스택, 데스크톱 가로 분할 */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-8 gap-4 lg:gap-8">
              <ConnectionDetail connection={selectedConnection} />
              <ChatPanel
                connectionName={selectedConnection.target_user?.name || ''}
                myUserId={session?.user?.id || ''}
                targetUserId={selectedConnection.target_user?.id || selectedConnection.id || ''}
              />
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
