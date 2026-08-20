import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniX — All-in-One Personal AI",
  description: "Chat, voice call, image generation, slides, video, vision, memory aur chat history — sab aik hi jagah. Made by Abbas Hussain.",
  keywords: ["AI", "chatbot", "voice", "image generation", "Pakistan", "Abbas Hussain"],
  authors: [{ name: "Abbas Hussain" }],
  openGraph: {
    title: "OmniX — All-in-One Personal AI",
    description: "Your personal AI assistant for chat, voice, images, slides and more",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white">{children}</body>
    </html>
  );
}
