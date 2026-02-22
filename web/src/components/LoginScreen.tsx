/**
 * LoginScreen — 로그인, 로딩, 에러 화면 컴포넌트
 */

import { useState } from 'react';
import { Users, AlertCircle, ShieldCheck } from 'lucide-react';

/* ---------- 로딩 화면 ---------- */
export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background dark:bg-gray-950" role="status" aria-label="로딩 중">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4" />
      <p className="text-textTertiary dark:text-gray-500 text-sm animate-pulse">
        Initializing ALIVE Dashboard...
      </p>
    </div>
  );
}

/* ---------- 에러 화면 ---------- */
export function ErrorScreen({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-red-50 dark:bg-red-950/30 p-4" role="alert">
      <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
      <h1 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
        Configuration Error
      </h1>
      <p className="text-red-600 dark:text-red-400 text-center max-w-md mb-6">
        {error}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-red-600 text-white rounded-xl font-semibold transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
      >
        Retry
      </button>
    </div>
  );
}

/* ---------- 로그인 화면 ---------- */
interface LoginScreenProps {
  onLogin: () => void;
  onGuestLogin: () => void;
  onEmailLogin: (email: string, password: string) => void;
}

export function LoginScreen({ onLogin, onGuestLogin, onEmailLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onEmailLogin(email, password);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-backgroundAlt dark:bg-gray-950 p-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-border/20 dark:border-gray-800" role="form" aria-label="로그인 폼">
        {/* 로고 아이콘 */}
        <div className="w-20 h-20 bg-accent/10 dark:bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-accent" />
        </div>

        <h1 className="text-3xl font-bold mb-2 tracking-tight text-textPrimary dark:text-gray-100">
          ALIVE
        </h1>
        <p className="text-textSecondary dark:text-gray-400 mb-8 text-sm leading-relaxed px-4">
          Manage your NFC connections and network from your desktop.
        </p>

        {/* Google OAuth 버튼 */}
        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-border/50 dark:border-gray-700 py-3.5 px-4 rounded-2xl font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98] border-b-2 mb-4 text-textPrimary dark:text-gray-200"
          aria-label="Google 로그인"
        >
          <img
            src="https://www.google.com/favicon.ico"
            className="w-5 h-5"
            alt="Google"
          />
          Continue with Google
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border/30 dark:bg-gray-700"></div>
          <span className="text-xs text-textTertiary dark:text-gray-500 uppercase tracking-wider font-semibold">
            or
          </span>
          <div className="flex-1 h-px bg-border/30 dark:bg-gray-700"></div>
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleEmailSubmit} className="space-y-3 mb-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-backgroundAlt dark:bg-gray-800 border border-border/50 dark:border-gray-700 text-textPrimary dark:text-gray-200 placeholder:text-textTertiary dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-backgroundAlt dark:bg-gray-800 border border-border/50 dark:border-gray-700 text-textPrimary dark:text-gray-200 placeholder:text-textTertiary dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            required
          />
          <button
            type="submit"
            className="w-full bg-accent/10 dark:bg-accent/20 text-accent py-3.5 px-4 rounded-2xl font-semibold hover:bg-accent/20 dark:hover:bg-accent/30 transition-all active:scale-[0.98] border border-accent/30 dark:border-accent/40"
          >
            Sign In / Sign Up
          </button>
        </form>

        {/* 게스트 로그인 버튼 */}
        <button
          onClick={onGuestLogin}
          className="w-full flex items-center justify-center gap-3 bg-accent text-white py-3.5 px-4 rounded-2xl font-semibold shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all active:scale-[0.98]"
          aria-label="게스트 로그인"
        >
          <ShieldCheck className="w-5 h-5" />
          Explore as Guest
        </button>

        <p className="mt-8 text-[10px] text-textTertiary dark:text-gray-600 uppercase tracking-widest font-bold">
          PC Management Console
        </p>
      </div>
    </div>
  );
}
