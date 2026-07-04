import type { Metadata } from "next";
import { Poppins, Young_Serif, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { CommandDialogComponent } from "@/components/command_dialog/Command_Dialog"
import { ServerConnectionMonitor } from "@/components/ServerConnectionMonitor"
import { RadixCleanupProvider } from "@/components/RadixCleanupProvider"
import { ThemeProvider } from "@/components/ThemeProvider"
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-young-serif",
  display: "swap",
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Genome Studio",
  description: "Genome Studio",
  icons: {
    icon: [
      { url: '/light_GS.svg', media: '(prefers-color-scheme: light)' },
      { url: '/dark_GS.svg', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      <style>{`:root { --font-jetbrains-mono: var(--font-jetbrains-mono); }`}</style>
      </head>
      <body
        className={`${poppins.variable} ${youngSerif.variable} ${sourceSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
          <AuthProvider>
            <RadixCleanupProvider />
            <ServerConnectionMonitor />
            <CommandDialogComponent />
            {children}
            <Toaster position="bottom-center" richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
