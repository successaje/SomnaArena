import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SomnArena — AI Tournament Civilization (Somnia L1)",
  description: "Autonomous agent civilization executing staking tournaments, match play, and commentary on Somnia Agentic L1.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="scanline" />
        {children}
      </body>
    </html>
  );
}
