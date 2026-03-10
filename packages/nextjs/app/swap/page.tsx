"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { bitcoin } from "@/lib/api";
import {
  ArrowRightLeft,
  ArrowDown,
  RefreshCw,
  TrendingUp,
  Loader2,
  CheckCircle,
  Clock,
  Bitcoin as BtcIcon,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatCrypto, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const TOKENS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "text-amber-400" },
  { symbol: "STRK", name: "Starknet", icon: "◆", color: "text-accent-400" },
];

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const { rates, isLoading: ratesLoading, error: ratesError, refetch: refreshRates } = useExchangeRates();
  const [fromToken, setFromToken] = useState("BTC");
  const [toToken, setToToken] = useState("STRK");
  const [amount, setAmount] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState("");

  // Calculate estimated output
  useEffect(() => {
    if (!amount || !rates || isNaN(parseFloat(amount))) {
      setEstimatedOutput("");
      return;
    }
    const key = `${fromToken}_${toToken}`;
    const reverseKey = `${toToken}_${fromToken}`;
    let rate = rates[key];
    if (!rate && rates[reverseKey]) {
      rate = 1 / rates[reverseKey];
    }
    if (rate) {
      setEstimatedOutput((parseFloat(amount) * rate).toFixed(6));
    }
  }, [amount, fromToken, toToken, rates]);

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
    setEstimatedOutput("");
  };

  const handleSwap = async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      setSwapping(true);
      const result = await bitcoin.executeSwap({
        fromCurrency: fromToken,
        toCurrency: toToken,
        amount,
        destinationAddress: address,
      });
      toast.success(`Swap initiated! ID: ${result.swapId}`);
      setAmount("");
      setEstimatedOutput("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Swap failed"
      );
    } finally {
      setSwapping(false);
    }
  };

  const getTokenConfig = (symbol: string) =>
    TOKENS.find((t) => t.symbol === symbol) || TOKENS[0];

  return (
    <div className="section py-10">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="page-title flex items-center justify-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-amber-400" />
            Token Swap
          </h1>
          <p className="page-subtitle">Cross-chain swaps powered by Garden Finance</p>
        </div>

        {/* Live Rates Bar */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {rates && (
                <>
                  <span className="text-xs text-zinc-500">BTC</span>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(rates.BTC_USD)}
                  </span>
                </>
              )}
              {!rates && !ratesLoading && (
                <span className="text-xs text-amber-400">Rates unavailable</span>
              )}
              {rates && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Live
                </div>
              )}
            </div>
            <button
              onClick={() => refreshRates()}
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Refresh rates"
            >
              <RefreshCw className={cn("w-4 h-4", ratesLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Garden Finance / Rate Availability Warning */}
        {ratesError && (
          <div className="card p-4 mb-6 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300 mb-1">Exchange rates unavailable</p>
                <p className="text-xs text-zinc-400">
                  Live price data from CoinGecko is temporarily unavailable. Swap execution
                  through Garden Finance may also be limited. Please try again later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Swap Card */}
        <div className="card p-6">
          {/* From */}
          <div className="mb-2">
            <label className="text-xs text-zinc-500 mb-2 block">You send</label>
            <div className="flex items-center gap-3 bg-surface-100 rounded-xl p-4 border border-zinc-800">
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="bg-transparent text-white font-semibold text-lg border-none outline-none appearance-none cursor-pointer"
              >
                {TOKENS.filter((t) => t.symbol !== toToken).map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-surface-200">
                    {t.icon} {t.symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-right text-2xl font-bold text-white outline-none placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={handleFlip}
              className="w-10 h-10 rounded-xl bg-surface-300 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-primary-500/50 hover:bg-surface-400 transition-all"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* To */}
          <div className="mt-2 mb-6">
            <label className="text-xs text-zinc-500 mb-2 block">You receive</label>
            <div className="flex items-center gap-3 bg-surface-100 rounded-xl p-4 border border-zinc-800">
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="bg-transparent text-white font-semibold text-lg border-none outline-none appearance-none cursor-pointer"
              >
                {TOKENS.filter((t) => t.symbol !== fromToken).map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-surface-200">
                    {t.icon} {t.symbol}
                  </option>
                ))}
              </select>
              <p className="flex-1 text-right text-2xl font-bold text-zinc-400">
                {estimatedOutput || "0.0"}
              </p>
            </div>
          </div>

          {/* Rate Info */}
          {amount && estimatedOutput && (
            <div className="rounded-xl bg-surface-100 border border-zinc-800 p-3 mb-6 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Rate</span>
                <span className="text-zinc-300">
                  1 {fromToken} = {formatCrypto(parseFloat(estimatedOutput) / parseFloat(amount))} {toToken}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Network</span>
                <span className="text-zinc-300">Starknet Sepolia</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Provider</span>
                <span className="text-zinc-300">Garden Finance</span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={swapping || !isConnected || !amount}
            className="btn-primary w-full btn-lg"
          >
            {swapping ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Swap...
              </>
            ) : !isConnected ? (
              "Connect Wallet"
            ) : !amount ? (
              "Enter Amount"
            ) : (
              <>
                <ArrowRightLeft className="w-5 h-5" />
                Swap {fromToken} → {toToken}
              </>
            )}
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: BtcIcon, label: "Cross-chain", desc: "BTC ↔ STRK" },
            { icon: CheckCircle, label: "Non-custodial", desc: "On-chain" },
            { icon: Clock, label: "Estimated", desc: "~10 min" },
          ].map((item) => (
            <div
              key={item.label}
              className="card p-3 flex flex-col items-center text-center"
            >
              <item.icon className="w-4 h-4 text-primary-400 mb-1.5" />
              <p className="text-xs font-medium text-zinc-300">{item.label}</p>
              <p className="text-xs text-zinc-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
