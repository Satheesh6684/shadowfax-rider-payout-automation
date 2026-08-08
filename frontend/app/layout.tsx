import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shadowfax Rider Payout Arrears",
  description: "Shadowfax Amazon Rider Payout Arrears Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
