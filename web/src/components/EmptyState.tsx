/**
 * EmptyState — 연결이 선택되지 않았을 때의 상태 화면
 * MVP1 완료 상태 + 주요 기능 요약 표시
 */

import { Users, Bluetooth, MapPin, MessageCircle, BarChart3 } from 'lucide-react';

const MVP1_FEATURES = [
  { icon: Bluetooth, label: 'BLE 양방향 교환', status: 'done' as const },
  { icon: MapPin, label: 'GPS 자동 기록', status: 'done' as const },
  { icon: MessageCircle, label: '실시간 메시징', status: 'done' as const },
  { icon: BarChart3, label: '관계 그래프', status: 'next' as const },
];

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-12 text-center" role="status" aria-label="연결을 선택하세요">
      <div className="relative">
        <div className="absolute inset-0 bg-accent rounded-full blur-[80px] opacity-10 animate-pulse" />
        <Users className="w-20 h-20 mb-2 opacity-10 relative text-textPrimary dark:text-gray-100" />
      </div>
      <div>
        <p className="text-2xl font-black text-textPrimary dark:text-gray-100 tracking-tight mb-2">
          ALIVE Connection
        </p>
        <p className="text-textSecondary dark:text-gray-400 max-w-md font-medium leading-relaxed">
          사이드바에서 연결을 선택하면 만남의 맥락, 프로필, 채팅 기록을 확인할 수 있습니다.
        </p>
      </div>

      {/* MVP1 기능 현황 */}
      <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
        {MVP1_FEATURES.map(({ icon: Icon, label, status }) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-left text-sm font-medium transition-all ${
              status === 'done'
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-accent/5 dark:bg-accent/10 border-accent/20 dark:border-accent/30 text-accent'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
            {status === 'next' && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider opacity-70">Next</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-textTertiary dark:text-gray-600 font-semibold uppercase tracking-widest">
        MVP 1 Complete · v0.1.0
      </p>
    </div>
  );
}
