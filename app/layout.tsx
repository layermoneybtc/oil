import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ราคาน้ำมันดิบ WTI สด",
  description: "ติดตามราคาน้ำมันดิบ WTI Futures อ้างอิงข้อมูลจาก Yahoo Finance"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
