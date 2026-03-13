import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuminAudio – Self-Hosted TTS",
  description: "Self-hosted text-to-speech powered by Chatterbox TTS with voice cloning",
  icons: {
    icon: [{ url: "/luminaudio-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
