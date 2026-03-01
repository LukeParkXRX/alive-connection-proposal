/**
 * ConnectionDetail — 프로필 상세 패널 (Meeting Context, Bio, Social Presence)
 * 반응형: 모바일 w-full, 데스크톱 w-[400px]
 */

import { memo } from 'react';
import { Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ConnectionDetailProps {
  connection: any;
}

export const ConnectionDetail = memo(function ConnectionDetail({ connection }: ConnectionDetailProps) {
  return (
    <div className="w-full lg:w-[400px] space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-shrink-0">
      {/* Meeting Context 섹션 */}
      <section className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-border/20 dark:border-gray-800">
        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-textTertiary dark:text-gray-500 mb-5">
          Meeting Context
        </h3>
        <div className="space-y-4">
          {/* 날짜/시간 */}
          <div className="flex items-center gap-4 group">
            <div className="p-2.5 bg-accent/5 dark:bg-accent/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all text-accent">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-textTertiary dark:text-gray-500 uppercase">
                Date &amp; Time
              </p>
              <p className="font-semibold text-textPrimary dark:text-gray-100">
                {format(new Date(connection.met_at), 'PPPPp')}
              </p>
            </div>
          </div>

          {/* 장소 */}
          <div className="flex items-center gap-4 group">
            <div className="p-2.5 bg-accent/5 dark:bg-accent/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-all text-accent">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-textTertiary dark:text-gray-500 uppercase">
                Location
              </p>
              <p className="font-semibold text-textPrimary dark:text-gray-100">
                {connection.location_place_name || 'Personal Interaction'}
              </p>
              {connection.location_address && (
                <p className="text-xs text-textSecondary dark:text-gray-400 mt-0.5">
                  {connection.location_address}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bio 섹션 */}
      <section className="bg-white dark:bg-gray-900 p-7 rounded-[2.5rem] shadow-sm border border-border/20 dark:border-gray-800">
        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-textTertiary dark:text-gray-500 mb-4">
          Bio
        </h3>
        <p className="text-textSecondary dark:text-gray-400 leading-relaxed italic text-[15px]">
          {connection.target_user?.bio ||
            'No personal bio available for this contact.'}
        </p>
      </section>

      {/* Social Presence 섹션 */}
      <section className="bg-white dark:bg-gray-900 p-7 rounded-[2.5rem] shadow-sm border border-border/20 dark:border-gray-800">
        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-textTertiary dark:text-gray-500 mb-4">
          Social Presence
        </h3>
        {connection.target_user?.social_links || connection.target_user?.linkedin || connection.target_user?.website ? (
          <div className="space-y-2">
            {connection.target_user?.linkedin && (
              <a href={connection.target_user.linkedin} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-backgroundAlt dark:bg-gray-800 rounded-xl hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors group">
                <span className="text-sm">💼</span>
                <span className="text-sm font-medium text-textPrimary dark:text-gray-200 group-hover:text-accent truncate">LinkedIn</span>
              </a>
            )}
            {connection.target_user?.website && (
              <a href={connection.target_user.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-backgroundAlt dark:bg-gray-800 rounded-xl hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors group">
                <span className="text-sm">🌐</span>
                <span className="text-sm font-medium text-textPrimary dark:text-gray-200 group-hover:text-accent truncate">Website</span>
              </a>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-textTertiary dark:text-gray-500 font-medium">
              소셜 링크가 아직 등록되지 않았습니다
            </p>
            <p className="text-[10px] text-textTertiary dark:text-gray-600 mt-1">
              MVP 2에서 프로필 사진 · 소셜 링크 동기화 예정
            </p>
          </div>
        )}
      </section>
    </div>
  );
});
