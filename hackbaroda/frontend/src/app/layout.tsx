import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeedbackHub — AI-Powered Omni-Channel Analysis",
  description:
    "Memory-Augmented RAG Continuous Feedback Analysis powered by Gemini, LangGraph, and Supabase",
  keywords: [
    "feedback",
    "AI",
    "agent",
    "sentiment",
    "analysis",
    "RAG",
    "omni-channel",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="noise">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
