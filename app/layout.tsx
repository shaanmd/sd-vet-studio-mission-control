import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SD VetStudio Mission Control",
  description: "One-click access to every tool, file, and resource across SD VetStudio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
