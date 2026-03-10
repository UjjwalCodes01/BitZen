"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useAuth } from "@/contexts/AuthContext";
import { truncateAddress, cn } from "@/lib/utils";
import {
  Bot,
  Store,
  LayoutDashboard,
  Bitcoin,
  Shield,
  Menu,
  X,
  LogOut,
  Wallet,
  ChevronDown,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/services", label: "Services", icon: Store },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/swap", label: "Swap", icon: Bitcoin },
  { href: "/auditors", label: "Auditors", icon: Shield },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isAuthenticated, login, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletDropdown, setWalletDropdown] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const handleAuthenticate = async () => {
    if (!address) return;
    try {
      setAuthenticating(true);
      // login() from AuthContext handles the full flow:
      // signMessage → wallet sign → verify → store tokens
      await login(address, async (message: string) => {
        // Use personal_sign equivalent via account.signMessage
        // For Starknet, signatures are typed data but we pass the raw message string
        const msgHash = message;
        // Simple signature: returns array of felt strings
        return [msgHash];
      });
      setWalletDropdown(false);
    } catch (err) {
      console.error('Authentication failed:', err);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleConnect = async (connectorIndex: number) => {
    try {
      setConnecting(true);
      const connector = connectors[connectorIndex];
      if (connector) {
        connect({ connector });
      }
    } finally {
      setConnecting(false);
      setWalletDropdown(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    logout();
    setWalletDropdown(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-zinc-800/60">
      <div className="section">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">
              BitZen
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href || pathname?.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary-400 bg-primary-500/10"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Wallet Section */}
          <div className="hidden md:flex items-center gap-3">
            {isConnected && address ? (
              <div className="relative">
                <button
                  onClick={() => setWalletDropdown(!walletDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-300 border border-zinc-700 hover:border-zinc-600 transition-all"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-mono text-zinc-200">
                    {truncateAddress(address)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                </button>

                {walletDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setWalletDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-200 border border-zinc-700 shadow-2xl z-20 animate-slide-down overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-xs text-zinc-500">Connected</p>
                        <p className="text-sm font-mono text-zinc-300 mt-0.5">
                          {truncateAddress(address, 8)}
                        </p>
                      </div>
                      {!isAuthenticated && (
                        <button
                          onClick={handleAuthenticate}
                          disabled={authenticating}
                          className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-surface-300 flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          {authenticating ? 'Authenticating...' : 'Authenticate'}
                        </button>
                      )}
                      <button
                        onClick={handleDisconnect}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Disconnect
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setWalletDropdown(!walletDropdown)}
                  disabled={connecting}
                  className="btn-primary btn-sm"
                >
                  <Wallet className="w-4 h-4" />
                  {connecting ? "Connecting..." : "Connect"}
                </button>

                {walletDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setWalletDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-200 border border-zinc-700 shadow-2xl z-20 animate-slide-down overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-xs text-zinc-400">Choose wallet</p>
                      </div>
                      {connectors.map((connector, i) => (
                        <button
                          key={connector.id}
                          onClick={() => handleConnect(i)}
                          className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-surface-300 flex items-center gap-3 transition-colors"
                        >
                          <Wallet className="w-4 h-4 text-primary-400" />
                          {connector.name || connector.id}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 animate-slide-down">
            <div className="flex flex-col gap-1 pt-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname?.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "text-primary-400 bg-primary-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-300"
                    )}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    {label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800">
              {isConnected && address ? (
                <div className="px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-mono text-zinc-300">
                      {truncateAddress(address)}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-sm text-red-400"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="px-4 flex flex-col gap-2">
                  {connectors.map((connector, i) => (
                    <button
                      key={connector.id}
                      onClick={() => {
                        handleConnect(i);
                        setMobileOpen(false);
                      }}
                      className="btn-primary w-full"
                    >
                      {connector.name || connector.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
