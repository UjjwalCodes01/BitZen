import type { Metadata } from "next";
import "@/styles/globals.css";
import { StarknetProvider } from "@/contexts/StarknetProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "BitZen — AI Agent Marketplace on Starknet",
  description:
    "Deploy autonomous AI agents, trade services, swap BTC↔STRK, and verify identities with zero-knowledge proofs — all on Starknet.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <StarknetProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#18181b",
                  color: "#f4f4f5",
                  border: "1px solid #27272a",
                  borderRadius: "12px",
                  fontSize: "14px",
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#18181b" },
                },
                error: {
                  iconTheme: { primary: "#ef4444", secondary: "#18181b" },
                },
              }}
            />
          </AuthProvider>
        </StarknetProvider>
      </body>
    </html>
  );
}
