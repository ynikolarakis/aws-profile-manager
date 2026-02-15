import { useEffect, useRef } from "react";
import { useStore } from "@/store";

export function useSSE() {
  const handleSSE = useStore((s) => s.handleSSE);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const es = new EventSource("/api/events");
      esRef.current = es;

      const eventTypes = ["term", "identity", "services", "cost_data", "cost_badge", "sso_status", "sso_accounts"];

      for (const type of eventTypes) {
        es.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            handleSSE(type, data);
          } catch {
            // ignore parse errors
          }
        });
      }

      es.onerror = () => {
        es.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      esRef.current?.close();
    };
  }, [handleSSE]);
}
