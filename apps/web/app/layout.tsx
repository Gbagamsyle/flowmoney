import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@flowmoney/ui/lib/utils";
import "@flowmoney/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "FlowMoney",
    template: "%s | FlowMoney",
  },
  description:
    "FlowMoney helps you understand cash flow, plan around irregular income, and spend with confidence.",
  applicationName: "FlowMoney",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FlowMoney" },
  icons: {
    icon: [{ url: "/flowmoney-icon_1.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/flowmoney-icon_1.png",
    apple: "/pwa/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: [{media:"(prefers-color-scheme: light)",color:"#fafafa"},{media:"(prefers-color-scheme: dark)",color:"#0a0a0a"}] };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", geistMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <ClerkProvider>
          <ThemeProvider><PwaProvider>{children}</PwaProvider></ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}