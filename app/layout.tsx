import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMS OTP Service",
  description: "Personal SMS OTP microservice by Soah",
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
