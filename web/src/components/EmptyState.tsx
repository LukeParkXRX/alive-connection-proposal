/**
 * EmptyState — 연결이 선택되지 않았을 때의 빈 상태 화면
 */

import { Users } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 text-center" role="status" aria-label="연결을 선택하세요">
      <div className="relative">
        <div className="absolute inset-0 bg-accent rounded-full blur-[80px] opacity-10 animate-pulse" />
        <Users className="w-24 h-24 mb-2 opacity-5 relative text-textPrimary dark:text-gray-100" />
      </div>
      <div>
        <p className="text-2xl font-black text-textPrimary dark:text-gray-100 tracking-tight mb-2">
          Your Professional Network
        </p>
        <p className="text-textSecondary dark:text-gray-400 max-w-sm font-medium">
          Select a contact from the sidebar to view their full profile, location
          context, and messaging history.
        </p>
      </div>
    </div>
  );
}
