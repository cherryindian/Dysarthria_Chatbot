import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatSpeak",
  description: "Dysarthria AI Chatbot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {" "}
          <div className="flex">
            <div className="bg-black text-grey-200 max-w-[250px] h-screen overflow-y-auto md:min-w-[220px]">
              <Sidebar />
            </div>
            <div className="flex-1 bg-{#212121} h-screen overflow-hidden relative text-grey-200">
              <Header />
              {children}
            </div>
          </div>
        </SessionProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#000000", color: "#ffffff" },
          }}
        />
      </body>
    </html>
  );
}
