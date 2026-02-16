"use client";

import type { NextPage } from "next";
import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import {
  ArrowsUpDownIcon,
  CurrencyDollarIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  LinkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { useAgentPlugins } from "~~/hooks/bitizen/useAgentPlugins";

const Swap: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { bitcoin } = useAgentPlugins();

  const [fromToken, setFromToken] = useState<"BTC" | "STRK">("BTC");
  const [toToken, setToToken] = useState<"BTC" | "STRK">("STRK");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(45230); // 1 BTC = 45,230 STRK
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [hasQuote, setHasQuote] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [swapId, setSwapId] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Mock balances
  const btcBalance = "0.05234";
  const strkBalance = "1,245.67";

  // Fetch real exchange rates on mount
  useEffect(() => {
    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const result = await bitcoin.getExchangeRates();
        if (result.success && result.data) {
          setExchangeRate(result.data.BTC_STRK);
        }
      } catch (error) {
        console.error("Failed to fetch rates:", error);
      } finally {
        setRatesLoading(false);
      }
    };
    fetchRates();
  }, [bitcoin]);

  // Mock recent swaps
  const recentSwaps = [
    {
      id: 1,
      from: "BTC",
      to: "STRK",
      amount: "0.001 BTC",
      received: "45.23 STRK",
      status: "completed",
      time: "2 hours ago",
    },
    {
      id: 2,
      from: "STRK",
      to: "BTC",
      amount: "100 STRK",
      received: "0.00221 BTC",
      status: "completed",
      time: "1 day ago",
    },
    {
      id: 3,
      from: "BTC",
      to: "STRK",
      amount: "0.005 BTC",
      received: "226.15 STRK",
      status: "pending",
      time: "3 days ago",
    },
  ];

  const handleFlipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (value && !isNaN(Number(value))) {
      const numValue = Number(value);
      if (fromToken === "BTC") {
        setToAmount((numValue * exchangeRate).toFixed(2));
      } else {
        setToAmount((numValue / exchangeRate).toFixed(8));
      }
    } else {
      setToAmount("");
    }
    setHasQuote(false);
  };

  const handleGetQuote = async () => {
    if (!fromAmount || Number(fromAmount) <= 0) return;

    setQuoteLoading(true);
    try {
      // Call real Bitcoin plugin API
      const result = await bitcoin.getQuote(fromToken, toToken, fromAmount);

      if (result.success && result.data) {
        const quote = result.data;
        setQuoteData(quote);
        setQuoteId(quote.quoteId);
        setToAmount(quote.total.toFixed(fromToken === "BTC" ? 2 : 8));
        setHasQuote(true);
      } else {
        console.error("Failed to get quote:", result.error);
        alert("Failed to get quote. Please try again.");
      }
    } catch (error) {
      console.error("Failed to get quote:", error);
      alert("Failed to get quote. Please try again.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!quoteId || !address) return;

    setSwapping(true);
    try {
      // Call real Bitcoin plugin API to execute swap
      const result = await bitcoin.executeSwap(
        fromToken,
        toToken,
        fromAmount,
        toToken === "BTC" ? btcAddress || "" : address,
      );

      if (result.success && result.data) {
        const swap = result.data;
        setSwapId(swap.swapId);
        alert(
          `Swap initiated! Swap ID: ${swap.swapId}\nStatus: ${swap.status}\nEstimated completion: ${new Date(swap.estimatedCompletion).toLocaleString()}`,
        );

        // Reset form
        setFromAmount("");
        setToAmount("");
        setHasQuote(false);
        setQuoteId(null);
        setQuoteData(null);
      } else {
        console.error("Swap failed:", result.error);
        alert("Swap failed. Please try again.");
      }
    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed. Please try again.");
    } finally {
      setSwapping(false);
    }
  };

  // Calculate fees from quote data
  const networkFee = quoteData
    ? `${(quoteData.fee * 0.3).toFixed(8)} ${toToken}`
    : "0.0001 BTC";
  const gardenFee = "0.3%";
  const totalFees = quoteData
    ? `${quoteData.fee.toFixed(8)} ${toToken}`
    : fromToken === "BTC"
      ? "0.00015 BTC"
      : "0.68 STRK";

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">TOKEN SWAP</h1>
          <p className="text-[var(--text-secondary)]">
            Atomic swaps between Bitcoin and Starknet via Garden Finance
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Swap Widget (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="card p-8">
              {/* Swap Interface */}
              <div className="mb-6">
                {/* From Token */}
                <div className="mb-2">
                  <label className="block text-sm font-semibold mb-2">
                    From
                  </label>
                  <div className="p-4 rounded-2xl bg-[var(--bg-hover)] border-2 border-[var(--border-color)] focus-within:border-[var(--accent-purple)] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="number"
                        placeholder="0.0"
                        value={fromAmount}
                        onChange={(e) => handleFromAmountChange(e.target.value)}
                        className="text-2xl font-bold bg-transparent border-none outline-none text-[var(--text-primary)] w-full"
                      />
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-dark)]">
                        {fromToken === "BTC" ? (
                          <CurrencyDollarIcon className="w-6 h-6 text-[var(--accent-orange)]" />
                        ) : (
                          <BoltIcon className="w-6 h-6 text-[var(--accent-purple)]" />
                        )}
                        <span className="font-bold">{fromToken}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                      <span>
                        Balance:{" "}
                        {fromToken === "BTC" ? btcBalance : strkBalance}
                      </span>
                      <button className="text-[var(--accent-purple)] hover:underline font-semibold">
                        MAX
                      </button>
                    </div>
                  </div>
                </div>

                {/* Flip Button */}
                <div className="flex justify-center -my-4 relative z-10">
                  <button
                    onClick={handleFlipTokens}
                    className="w-12 h-12 rounded-full bg-[var(--bg-card)] border-2 border-[var(--accent-purple)] flex items-center justify-center hover:bg-[var(--accent-purple)] transition-all group shadow-lg"
                  >
                    <ArrowsUpDownIcon className="w-6 h-6 text-[var(--accent-purple)] group-hover:text-white" />
                  </button>
                </div>

                {/* To Token */}
                <div className="mt-2">
                  <label className="block text-sm font-semibold mb-2">To</label>
                  <div className="p-4 rounded-2xl bg-[var(--bg-hover)] border-2 border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="number"
                        placeholder="0.0"
                        value={toAmount}
                        readOnly
                        className="text-2xl font-bold bg-transparent border-none outline-none text-[var(--text-primary)] w-full cursor-not-allowed"
                      />
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-dark)]">
                        {toToken === "BTC" ? (
                          <CurrencyDollarIcon className="w-6 h-6 text-[var(--accent-orange)]" />
                        ) : (
                          <BoltIcon className="w-6 h-6 text-[var(--accent-purple)]" />
                        )}
                        <span className="font-bold">{toToken}</span>
                      </div>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      Balance: {toToken === "BTC" ? btcBalance : strkBalance}
                    </div>
                  </div>
                </div>
              </div>

              {/* Exchange Rate & Fees */}
              {hasQuote && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-color)]">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">
                        Exchange Rate:
                      </span>
                      <span className="font-semibold">
                        1 BTC = {exchangeRate.toLocaleString()} STRK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">
                        Network Fee:
                      </span>
                      <span className="font-semibold">{networkFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">
                        Garden Finance Fee:
                      </span>
                      <span className="font-semibold">{gardenFee}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] font-bold">
                        Total Fees:
                      </span>
                      <span className="font-bold text-[var(--accent-orange)]">
                        {totalFees}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isConnected ? (
                <button
                  className="btn-primary w-full opacity-50 cursor-not-allowed"
                  disabled
                >
                  Connect Wallet First
                </button>
              ) : !btcAddress ? (
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                >
                  <LinkIcon className="w-5 h-5" />
                  Link Bitcoin Address
                </button>
              ) : !hasQuote ? (
                <button
                  onClick={handleGetQuote}
                  disabled={
                    !fromAmount || Number(fromAmount) <= 0 || quoteLoading
                  }
                  className={`btn-primary w-full ${
                    !fromAmount || Number(fromAmount) <= 0 || quoteLoading
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {quoteLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Getting Quote...
                    </span>
                  ) : (
                    "Get Quote"
                  )}
                </button>
              ) : (
                <button
                  onClick={handleExecuteSwap}
                  disabled={swapping}
                  className={`btn-primary w-full ${swapping ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {swapping ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Executing Swap...
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      <BoltIcon className="w-5 h-5" />
                      Execute Swap
                    </span>
                  )}
                </button>
              )}

              {/* Info Banner */}
              <div className="mt-6 p-4 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30 flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-[var(--accent-purple)] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--text-secondary)]">
                  <strong>How it works:</strong> Swaps are powered by{" "}
                  <span className="text-[var(--accent-orange)] font-semibold">
                    Garden Finance
                  </span>
                  , enabling atomic cross-chain swaps between Bitcoin and
                  Starknet. Your funds never leave your custody.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - BTC Address & Recent Swaps (1/3 width) */}
          <div className="space-y-6">
            {/* BTC Address Card */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4">BITCOIN ADDRESS</h3>
              {btcAddress ? (
                <div>
                  <div className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--success)]/30 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircleIcon className="w-5 h-5 text-[var(--success)]" />
                      <span className="text-sm font-semibold text-[var(--success)]">
                        Linked
                      </span>
                    </div>
                    <p className="font-mono text-sm break-all">{btcAddress}</p>
                  </div>
                  <button
                    onClick={() => setBtcAddress(null)}
                    className="text-sm text-[var(--error)] hover:underline"
                  >
                    Unlink Address
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Link your Bitcoin address to enable swaps
                  </p>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="btn-outline w-full text-center inline-flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link Address
                  </button>
                </div>
              )}
            </div>

            {/* Recent Swaps */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4">RECENT SWAPS</h3>
              <div className="space-y-3">
                {recentSwaps.map((swap) => (
                  <div
                    key={swap.id}
                    className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-color)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {swap.from} → {swap.to}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          swap.status === "completed"
                            ? "bg-[var(--success)]/20 text-[var(--success)]"
                            : "bg-[var(--warning)]/20 text-[var(--warning)]"
                        }`}
                      >
                        {swap.status}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      <div>Sent: {swap.amount}</div>
                      <div>Received: {swap.received}</div>
                      <div className="text-[var(--text-muted)]">
                        {swap.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Volume */}
            <div className="card border-2 border-[var(--accent-orange)]/30">
              <h3 className="text-sm text-[var(--text-secondary)] mb-2">
                TOTAL SWAP VOLUME
              </h3>
              <div className="text-2xl font-bold text-[var(--accent-orange)] mb-1">
                0.0125 BTC
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                ≈ 565.38 STRK
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-8">
          <div className="card">
            <h3 className="text-2xl font-bold mb-6 text-center">
              How Garden Finance Swaps Work
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full gradient-purple flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h4 className="font-bold mb-2">Lock Funds</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Your funds are locked in a secure atomic swap contract
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full gradient-orange flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h4 className="font-bold mb-2">Cross-Chain Verification</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Garden Finance verifies transactions on both chains
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--success)] flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold mb-2">Receive Tokens</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Funds are released to your wallet atomically
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Link BTC Address Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full p-8">
              <h3 className="text-2xl font-bold mb-4">Link Bitcoin Address</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Enter your Bitcoin address to enable swaps. Make sure you
                control this address.
              </p>
              <input
                type="text"
                placeholder="bc1q... or 1... or 3..."
                className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)] mb-6"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    setBtcAddress(e.currentTarget.value);
                    setShowLinkModal(false);
                  }
                }}
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement
                      ?.previousElementSibling as HTMLInputElement;
                    if (input?.value) {
                      setBtcAddress(input.value);
                      setShowLinkModal(false);
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  Link Address
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Swap;
