import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Shadowfax Rider Payout Arrears",
  description: "Shadowfax Amazon Rider Payout Arrears Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plexMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
