'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useBackendAuth } from '~~/hooks/bitizen/useBackendAuth';

export const Navbar = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isAuthenticated, login, logout } = useBackendAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleConnectWallet = async () => {
    if (!isConnected && connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else if (isConnected && !isAuthenticated) {
      await login();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    logout();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--bg-obsidian)]/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-lg gradient-purple flex items-center justify-center font-bold text-xl group-hover:glow-purple transition-all">
              BZ
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)] hidden sm:block">
              BitZen
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/marketplace"
              className="text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors font-medium"
            >
              Marketplace
            </Link>
            <Link
              href="/swap"
              className="text-[var(--text-secondary)] hover:text-[var(--accent-orange)] transition-colors font-medium"
            >
              Swap
            </Link>
            {isConnected && (
              <>
                <Link
                  href="/dashboard"
                  className="text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/sessions"
                  className="text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors font-medium"
                >
                  Sessions
                </Link>
              </>
            )}
          </div>

          {/* Wallet Connect Button */}
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button onClick={handleConnectWallet} className="btn-primary">
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                {!isAuthenticated && (
                  <button onClick={login} className="btn-outline text-sm">
                    Sign In
                  </button>
                )}
                <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"></div>
                  <span className="text-sm text-[var(--text-primary)] font-mono">
                    {formatAddress(address!)}
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
                  title="Disconnect"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-[var(--text-secondary)] hover:text-[var(--accent-purple)]"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border-color)]">
            <div className="flex flex-col space-y-4">
              <Link
                href="/marketplace"
                className="text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Marketplace
              </Link>
              <Link
                href="/swap"
                className="text-[var(--text-secondary)] hover:text-[var(--accent-orange)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Swap
              </Link>
              {isConnected && (
                <>
                  <Link
                    href="/dashboard"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/sessions"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sessions
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
