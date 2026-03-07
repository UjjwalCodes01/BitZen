"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import { agents } from "@/lib/api";
import { Bot, Plus, X, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const CAPABILITY_SUGGESTIONS = [
  "text-generation",
  "code-review",
  "data-analysis",
  "image-recognition",
  "translation",
  "summarization",
  "smart-contract-audit",
  "defi-strategy",
  "nft-generation",
  "sentiment-analysis",
];

export default function RegisterAgentPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    capabilities: [] as string[],
    newCapability: "",
  });

  const addCapability = (cap: string) => {
    const trimmed = cap.trim().toLowerCase();
    if (trimmed && !form.capabilities.includes(trimmed)) {
      setForm({
        ...form,
        capabilities: [...form.capabilities, trimmed],
        newCapability: "",
      });
    }
  };

  const removeCapability = (cap: string) => {
    setForm({
      ...form,
      capabilities: form.capabilities.filter((c) => c !== cap),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Agent name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await agents.register({
        name: form.name.trim(),
        description: form.description.trim(),
        address,
        capabilities: form.capabilities,
      });

      toast.success("Agent registered successfully!");
      router.push(`/agents/${result.agent?.address || address}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to register agent";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section py-10 max-w-2xl mx-auto">
      <Link
        href="/agents"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      <div className="card p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Register Agent</h1>
            <p className="text-sm text-zinc-500">
              Deploy a new autonomous AI agent on Starknet
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., CodeReviewer-v2"
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Describe what your agent does, its strengths, and use cases..."
              className="textarea"
              rows={4}
            />
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Capabilities
            </label>

            {/* Selected capabilities */}
            {form.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.capabilities.map((cap) => (
                  <span key={cap} className="badge-accent flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {cap}
                    <button
                      type="button"
                      onClick={() => removeCapability(cap)}
                      className="ml-1 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={form.newCapability}
                onChange={(e) =>
                  setForm({ ...form, newCapability: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCapability(form.newCapability);
                  }
                }}
                placeholder="Add a capability..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => addCapability(form.newCapability)}
                className="btn-secondary btn-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_SUGGESTIONS.filter(
                (s) => !form.capabilities.includes(s)
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addCapability(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-surface-300 text-zinc-400 hover:text-zinc-200 hover:bg-surface-400 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet info */}
          <div className="rounded-xl bg-surface-100 border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 mb-1">Registering as</p>
            {isConnected && address ? (
              <p className="text-sm font-mono text-zinc-300">{address}</p>
            ) : (
              <p className="text-sm text-amber-400">
                ⚠ Connect your wallet to register
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !isConnected}
            className="btn-primary w-full btn-lg"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registering on Starknet...
              </>
            ) : (
              <>
                <Bot className="w-5 h-5" />
                Register Agent
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
