/**
 * Date Format Utilities
 *
 * HandshakeSuccess 등에서 사용하는 날짜/시간 포맷 함수
 */

import { format } from 'date-fns';

/** "h:mm a" 형식 (예: "3:42 PM") */
export function formatTime(isoString: string): string {
  return format(new Date(isoString), 'h:mm a');
}

/** "MMM d, yyyy" 형식 (예: "Feb 25, 2026") */
export function formatDate(isoString: string): string {
  return format(new Date(isoString), 'MMM d, yyyy');
}
