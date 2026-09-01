import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Micro-Expression Investigator Console",
  description:
    "Real-time, on-device micro-expression recognition for investigative interviewing. CNN + LSTM pipeline detecting Ekman-7 universal emotions, micro-expression spikes, and emotional-leakage risk. No frames leave your browser.",
  keywords: [
    "micro-expression recognition",
    "facial emotion recognition",
    "Ekman-7",
    "investigative interviewing",
    "deception detection",
    "CNN",
    "LSTM",
    "face-api.js",
    "on-device AI",
  ],
  authors: [{ name: "Investigator Console" }],
  openGraph: {
    title: "Micro-Expression Investigator Console",
    description:
      "Real-time, on-device micro-expression recognition — CNN + LSTM over the 7 Ekman universal emotions, with micro-spike and emotional-leakage analysis.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Micro-Expression Investigator Console",
    description:
      "Real-time, on-device micro-expression recognition — CNN + LSTM over the 7 Ekman universal emotions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
