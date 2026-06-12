import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeInitializer } from "./ThemeInitializer";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NeuralFlow — Local AI Workflow Builder",
  description:
    "Build powerful AI pipelines visually — no coding required. Runs entirely on your device using Ollama.",
  keywords: ["AI", "workflow", "automation", "Ollama", "local AI", "no-code"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} antialiased`}
        style={{ fontFamily: "var(--font-sans)", background: "var(--nf-bg-primary)", color: "var(--nf-text-primary)" }}
        suppressHydrationWarning
      >
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
