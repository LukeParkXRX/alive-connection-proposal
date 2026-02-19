/**
 * ConnectionDetail — 프로필 상세 패널 (Meeting Context, Bio, Social Presence)
 * 반응형: 모바일 w-full, 데스크톱 w-[400px]
 */

import { Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ConnectionDetailProps {
  connection: any;
}

export function ConnectionDetail({ connection }: ConnectionDetailProps) {
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
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-backgroundAlt dark:bg-gray-800 rounded-2xl border border-border/10 dark:border-gray-700 flex items-center justify-center opacity-40 italic text-xs text-textSecondary dark:text-gray-500">
            Syncing links...
          </div>
          <div className="p-4 bg-backgroundAlt dark:bg-gray-800 rounded-2xl border border-border/10 dark:border-gray-700 flex items-center justify-center opacity-40 italic text-xs text-textSecondary dark:text-gray-500">
            Lock status checking...
          </div>
        </div>
      </section>
    </div>
  );
}
