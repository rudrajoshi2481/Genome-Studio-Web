"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/config/server";

const HEALTH_CHECK_INTERVAL = 10000;
const HEALTH_CHECK_TIMEOUT = 5000;

export function ServerConnectionMonitor() {
  const wasConnectedRef = useRef<boolean | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

        const response = await fetch(`${getApiBaseUrl()}/system/health`, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          if (wasConnectedRef.current === false) {
            if (toastIdRef.current !== null) {
              toast.dismiss(toastIdRef.current);
              toastIdRef.current = null;
            }
            toast.success("Server reconnected", {
              description: "Backend server is back online.",
            });
          }
          wasConnectedRef.current = true;
        } else {
          handleDisconnected();
        }
      } catch {
        handleDisconnected();
      }
    };

    const handleDisconnected = () => {
      if (wasConnectedRef.current !== false) {
        toastIdRef.current = toast.error("Server not connected", {
          description: "Cannot reach the backend server. Retrying...",
          duration: Infinity,
        });
        wasConnectedRef.current = false;
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  return null;
}
