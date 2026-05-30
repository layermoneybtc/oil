import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live WTI Crude Oil Price",
  description: "Track WTI Crude Oil Futures prices using Yahoo Finance data"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
