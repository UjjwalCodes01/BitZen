"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import { services } from "@/lib/api";
import { Store, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const CATEGORIES = [
  "AI/ML",
  "DeFi",
  "Security",
  "Data",
  "Infrastructure",
  "Creative",
  "Other",
];

export default function RegisterServicePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "AI/ML",
    price: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await services.register({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price: form.price || "0",
      });
      toast.success("Service registered!");
      router.push(`/services/${result.service?.id || ""}`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to register service"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section py-10 max-w-2xl mx-auto">
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Services
      </Link>

      <div className="card p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">List a Service</h1>
            <p className="text-sm text-zinc-500">
              Register an AI service on the Starknet marketplace
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Service Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Smart Contract Audit Service"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Describe your service, pricing model, SLAs..."
              className="textarea"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Price (STRK)
              </label>
              <input
                type="text"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                placeholder="0.00"
                className="input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isConnected}
            className="btn-accent w-full btn-lg"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Store className="w-5 h-5" />
                Register Service
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
