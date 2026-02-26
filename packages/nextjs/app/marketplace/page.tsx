"use client";

import type { NextPage } from "next";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  CogIcon,
} from "@heroicons/react/24/solid";
import { backendApi } from "~~/services/api/backendApi";

const Marketplace: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [minStake, setMinStake] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [allServices, setAllServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 12;

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await backendApi.listServices({
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          minStake: minStake > 0 ? minStake.toString() : undefined,
          page,
          limit: LIMIT,
        });
        const services: any[] = result?.data?.services ?? result?.data ?? [];
        const total: number = result?.data?.total ?? services.length;
        setAllServices(services);
        setTotalPages(Math.max(1, Math.ceil(total / LIMIT)));
      } catch (err: any) {
        setError(err.message || "Failed to load services");
        setAllServices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [selectedCategory, minStake, page]);

  // Filter / sort client-side (search text + verified filter)
  const filteredServices = allServices
    .filter((service) => {
      const matchesSearch =
        !searchQuery ||
        service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVerified = !verifiedOnly || service.is_verified || service.verified;
      return matchesSearch && matchesVerified;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.average_rating ?? b.rating ?? 0) - (a.average_rating ?? a.rating ?? 0);
      if (sortBy === "stake") return (parseFloat(b.total_stake ?? b.stake ?? 0)) - (parseFloat(a.total_stake ?? a.stake ?? 0));
      if (sortBy === "newest") return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      return 0;
    });

  const categories = ["all", "Finance", "Identity", "Utilities", "DeFi", "Data", "Creator"];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MARKETPLACE</h1>
          <p className="text-[var(--text-secondary)]">
            Discover and deploy AI agents on Starknet
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-muted)] absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search agents and services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)] cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)] cursor-pointer"
            >
              <option value="rating">Highest Rated</option>
              <option value="stake">Most Staked</option>
              <option value="newest">Newest</option>
            </select>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-all inline-flex items-center gap-2 ${
                showFilters
                  ? "bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white"
                  : "bg-[var(--bg-dark)] border-[var(--border-color)] hover:border-[var(--accent-purple)]"
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-[var(--border-color)] grid md:grid-cols-2 gap-6">
              {/* Min Stake Slider */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Minimum Stake: {minStake} STRK
                </label>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="100"
                  value={minStake}
                  onChange={(e) => { setMinStake(Number(e.target.value)); setPage(1); }}
                  className="w-full h-2 bg-[var(--bg-dark)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-purple)]"
                />
                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                  <span>0</span>
                  <span>2000</span>
                </div>
              </div>

              {/* Verified Only Checkbox */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-5 h-5 rounded border-[var(--border-color)] bg-[var(--bg-dark)] checked:bg-[var(--accent-purple)] cursor-pointer accent-[var(--accent-purple)]"
                  />
                  <span className="font-semibold">Show Verified Agents Only</span>
                  <ShieldCheckIcon className="w-5 h-5 text-[var(--accent-purple)]" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-[var(--text-secondary)]">
            Showing{" "}
            <span className="font-bold text-[var(--text-primary)]">
              {loading ? "..." : filteredServices.length}
            </span>{" "}
            results
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-14 w-14 rounded-2xl bg-[var(--bg-hover)] mb-4" />
                <div className="h-4 bg-[var(--bg-hover)] rounded mb-2 w-3/4" />
                <div className="h-3 bg-[var(--bg-hover)] rounded w-full mb-4" />
                <div className="h-3 bg-[var(--bg-hover)] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="card text-center py-8 border border-red-500/30">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setPage(1)}
              className="btn-outline mt-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Services Grid */}
        {!loading && !error && filteredServices.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredServices.map((service) => {
              const rating = parseFloat(service.average_rating ?? service.rating ?? 0).toFixed(1);
              const stake = parseFloat(service.total_stake ?? service.stake ?? 0).toFixed(0);
              const auditors = service.auditor_count ?? service.auditors ?? 0;
              const isVerified = service.is_verified ?? service.verified ?? false;
              return (
                <Link
                  key={service.id}
                  href={`/service/${service.id}`}
                  className="card hover:border-[var(--accent-purple)] cursor-pointer group transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl gradient-purple flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                        <CogIcon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{service.name}</h3>
                        <span className="badge badge-purple text-xs whitespace-nowrap">
                          {service.category || "Service"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                    {service.description}
                  </p>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <StarIcon className="w-4 h-4 text-[var(--accent-orange)]" />
                      <span className="font-semibold">{rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span>{stake} STRK</span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>{auditors}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Endpoint</div>
                      <div className="font-mono text-xs text-[var(--text-secondary)] truncate max-w-[140px]">
                        {service.endpoint || "—"}
                      </div>
                    </div>
                    {isVerified && (
                      <span className="badge badge-success text-xs inline-flex items-center gap-1">
                        <ShieldCheckIcon className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredServices.length === 0 && (
          <div className="card text-center py-16">
            <MagnifyingGlassIcon className="w-24 h-24 text-[var(--text-muted)] mx-auto mb-6 opacity-50" />
            <h2 className="text-2xl font-bold mb-4">No services found</h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
              No services are registered yet, or none match your filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setMinStake(0);
                setVerifiedOnly(false);
                setPage(1);
              }}
              className="btn-outline"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  p === page
                    ? "bg-[var(--accent-purple)] text-white"
                    : "bg-[var(--bg-hover)] hover:bg-[var(--bg-dark)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
