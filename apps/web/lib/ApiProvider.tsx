"use client";

import { useEffect } from "react";
import { configureApiClient } from "@repo/ui";

/**
 * ApiProvider — Configures the shared apiClient with the correct base URL
 * from the Next.js environment variable. Must be rendered early in the tree.
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    configureApiClient({
      baseUrl:
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
    });
  }, []);

  return <>{children}</>;
}
