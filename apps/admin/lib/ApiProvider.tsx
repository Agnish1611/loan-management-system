"use client";

import { useEffect } from "react";
import { configureApiClient } from "@repo/ui";

export function ApiProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    configureApiClient({
      baseUrl:
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
    });
  }, []);

  return <>{children}</>;
}
