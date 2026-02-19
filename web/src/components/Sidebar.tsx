/**
 * Sidebar — 연결 목록 사이드바 (반응형 + 다크모드)
 * 모바일: fixed overlay 슬라이드 인/아웃
 * 데스크톱: 인라인 relative, 항상 표시
 */

import { Users, LogOut, Search, Sun, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/cn';

interface SidebarProps {
  connections: any[];
  selectedConnection: any;
  onSelectConnection: (conn: any) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function Sidebar({
  connections,
  selectedConnection,
  onSelectConnection,
  searchText,
  onSearchChange,
  onLogout,
  open,
  onClose,
  isDark,
  onToggleDark,
}: SidebarProps) {
  return (
    <>
      {/* 모바일 배경 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          // 공통 스타일
          'flex flex-col bg-white dark:bg-gray-950 border-r border-border/40 dark:border-gray-800',
          // 모바일: fixed 슬라이드
          'fixed inset-y-0 left-0 z-40 w-80 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // 데스크톱: 인라인
          'md:relative md:translate-x-0 md:transition-none'
        )}
        role="navigation"
        aria-label="연결 목록 사이드바"
      >
        {/* 헤더 */}
        <div className="p-6 border-b border-border/20 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-accent">ALIVE</h1>
            <p className="text-[10px] font-bold text-textTertiary dark:text-gray-500 uppercase tracking-wider">
              Dashboard
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* 다크모드 토글 */}
            <button
              onClick={onToggleDark}
              className="p-2.5 text-textTertiary dark:text-gray-400 hover:text-accent dark:hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/20 rounded-xl transition-all"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
              aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {/* 로그아웃 */}
            <button
              onClick={onLogout}
              className="p-2.5 text-textTertiary dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 검색 */}
        <div className="p-4">
          <div className="relative group" role="search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textTertiary dark:text-gray-500 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search people, companies..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-backgroundAlt dark:bg-gray-800 border-none rounded-2xl py-3 pl-11 pr-4 text-sm text-textPrimary dark:text-gray-200 placeholder:text-textTertiary dark:placeholder:text-gray-500 focus:ring-2 focus:ring-accent outline-none transition-all"
              aria-label="연결 검색"
            />
          </div>
        </div>

        {/* 연결 목록 */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-6 custom-scrollbar">
          {connections.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-12 h-12 bg-backgroundAlt dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-textTertiary dark:text-gray-600 opacity-20" />
              </div>
              <p className="text-xs text-textTertiary dark:text-gray-500 font-medium">
                No connections yet
              </p>
            </div>
          ) : (
            connections.map((conn) => (
              <button
                key={conn.id}
                onClick={() => onSelectConnection(conn)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectConnection(conn);
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all text-left',
                  selectedConnection?.id === conn.id
                    ? 'bg-accent text-white shadow-xl shadow-accent/20 scale-[1.02]'
                    : 'hover:bg-backgroundAlt dark:hover:bg-gray-800 active:scale-95 text-textPrimary dark:text-gray-200'
                )}
                role="button"
                tabIndex={0}
                aria-selected={selectedConnection?.id === conn.id}
                aria-label={conn.target_user?.name || 'Unknown'}
              >
                {/* 아바타 */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-accent/10 dark:bg-accent/20 border-2 border-transparent flex-shrink-0 shadow-inner">
                  {conn.target_user?.avatar_url ? (
                    <img
                      src={conn.target_user.avatar_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-full h-full flex items-center justify-center text-lg font-bold uppercase',
                        selectedConnection?.id === conn.id
                          ? 'text-white'
                          : 'text-accent'
                      )}
                    >
                      {conn.target_user?.name?.[0] || '?'}
                    </div>
                  )}
                </div>

                {/* 이름 / 직함 */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-bold truncate text-[15px]">
                      {conn.target_user?.name || 'Unknown'}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium whitespace-nowrap',
                        selectedConnection?.id === conn.id
                          ? 'text-white/70'
                          : 'text-textTertiary dark:text-gray-500'
                      )}
                    >
                      {format(new Date(conn.met_at), 'MMM d')}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-[13px] truncate font-medium',
                      selectedConnection?.id === conn.id
                        ? 'text-white/80'
                        : 'text-textSecondary dark:text-gray-400'
                    )}
                  >
                    {conn.target_user?.title || 'Connection'}
                  </div>
                </div>
              </button>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}
