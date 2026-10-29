import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meridian | Enterprise Intelligence",
  description:
    "An AI-powered enterprise knowledge platform for discovering insights across internal documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}