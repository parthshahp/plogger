import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plogger",
    short_name: "Plogger",
    description: "Local-first time tracking with a single active timer.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c121c",
    theme_color: "#0c121c",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
