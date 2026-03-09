"use client";

import { useState } from "react";
import Link from "next/link";
import { useServices } from "@/hooks/useServices";
import { Address } from "@/components/ui/Address";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Store, Plus, Search, Tag, Clock } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "AI/ML",
  "DeFi",
  "Security",
  "Data",
  "Infrastructure",
  "Creative",
  "Other",
];

export default function ServicesPage() {
  const { services, isLoading, error, refetch } = useServices();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "All" ||
      s.category?.toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="section py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Store className="w-8 h-8 text-accent-400" />
            Service Registry
          </h1>
          <p className="page-subtitle">
            Browse and consume AI services with on-chain reputation
          </p>
        </div>
        <Link href="/services/register" className="btn-accent">
          <Plus className="w-4 h-4" />
          List Service
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`btn-sm whitespace-nowrap ${
                category === cat
                  ? "bg-accent-500/10 text-accent-400 border border-accent-500/20"
                  : "btn-ghost"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Store className="w-8 h-8" />}
          title="No services found"
          description={
            search || category !== "All"
              ? "Try adjusting your filters"
              : "Be the first to list an AI service"
          }
          action={
            <Link href="/services/register" className="btn-accent btn-sm">
              <Plus className="w-4 h-4" />
              List Service
            </Link>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className="group card-hover p-6 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-accent-400" />
                </div>
                <StatusBadge
                  label={service.status || "active"}
                  variant={
                    service.status === "active" || !service.status
                      ? "success"
                      : "neutral"
                  }
                />
              </div>

              <h3 className="text-base font-semibold text-white mb-1 group-hover:text-accent-400 transition-colors">
                {service.name}
              </h3>

              <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">
                {service.description || "No description"}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-500">
                    {service.category || "General"}
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary-400">
                  {service.price || "Free"}
                </span>
              </div>

              {service.created_at && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 mt-2">
                  <Clock className="w-3 h-3" />
                  {timeAgo(service.created_at)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
