import { useCallback } from 'react';

export const useTimeFormatter = () => {
  const normalizeTimestamp = (ts?: string) => (ts?.endsWith('Z') ? ts : ts ? ts + 'Z' : '');

  const formatTime = useCallback((timestamp?: string) => {
    if (!timestamp) return '';
    const isoTs = normalizeTimestamp(timestamp);
    const date = new Date(isoTs);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kathmandu',
    }).format(date);
  }, []);

  return { formatTime };
};
