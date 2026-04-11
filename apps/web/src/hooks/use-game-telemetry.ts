import { useCallback, useRef } from 'react';
import { API_ROUTES, RecommendationEventType, type ApiResponse } from '@gamehub/shared';
import { apiClient } from '../lib/api-client';

type TelemetryEventType = 'impression' | 'open_details' | 'add_to_library' | 'dismiss' | 'hide';

interface TelemetryEvent {
  rawgId: number;
  type: TelemetryEventType;
  title?: string;
}

const BATCH_SIZE = 10;
const FLUSH_MS = 100;

export function useGameTelemetry() {
  const queueRef = useRef<TelemetryEvent[]>([]);
  const timerRef = useRef<number | null>(null);

  const flush = useCallback(async function flushQueue() {
    const batch = queueRef.current.splice(0, BATCH_SIZE);
    if (batch.length === 0) {
      timerRef.current = null;
      return;
    }

    await Promise.allSettled(
      batch.map((event) =>
        apiClient.post<ApiResponse<{ dismissed: boolean }>>(API_ROUTES.DISCOVER.FEEDBACK, {
          rawgId: event.rawgId,
          title: event.title,
          reason: `event:${event.type}`,
          eventType:
            event.type === 'impression'
              ? RecommendationEventType.IMPRESSION
              : event.type === 'open_details'
                ? RecommendationEventType.OPEN_DETAILS
                : event.type === 'add_to_library'
                  ? RecommendationEventType.ADD_TO_LIBRARY
                  : event.type === 'hide'
                    ? RecommendationEventType.HIDE
                    : RecommendationEventType.DISMISS,
        }),
      ),
    );

    if (queueRef.current.length > 0) {
      timerRef.current = window.setTimeout(() => {
        void flushQueue();
      }, FLUSH_MS);
      return;
    }

    timerRef.current = null;
  }, []);

  const enqueue = useCallback(
    (event: TelemetryEvent) => {
      queueRef.current.push(event);

      if (queueRef.current.length >= BATCH_SIZE) {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        void flush();
        return;
      }

      if (timerRef.current === null) {
        timerRef.current = window.setTimeout(() => {
          void flush();
        }, FLUSH_MS);
      }
    },
    [flush],
  );

  return {
    sendImpression: (rawgId: number, title?: string) => enqueue({ rawgId, title, type: 'impression' }),
    sendOpenDetails: (rawgId: number, title?: string) => enqueue({ rawgId, title, type: 'open_details' }),
    sendAddToLibrary: (rawgId: number, title?: string) => enqueue({ rawgId, title, type: 'add_to_library' }),
    sendDismiss: (rawgId: number, title?: string) => enqueue({ rawgId, title, type: 'dismiss' }),
    sendHide: (rawgId: number, title?: string) => enqueue({ rawgId, title, type: 'hide' }),
    flush,
  };
}
