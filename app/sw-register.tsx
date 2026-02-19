"use client";

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if ("serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Registration failure should not block app usage.
        });
      };

      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
