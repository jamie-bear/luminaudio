import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuminAudio – Text to Speech",
  description: "Convert text to lifelike speech using Resemble.ai Chatterbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
