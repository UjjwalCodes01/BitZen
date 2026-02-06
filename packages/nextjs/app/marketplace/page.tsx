'use client';

import type { NextPage } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  CogIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  BoltIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

const Marketplace: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [minStake, setMinStake] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Mock services data
  const allServices = [
    {
      id: 1,
      name: 'ZK Passport Agent',
      category: 'Identity',
      description: 'Generate and verify zero-knowledge identity proofs on Starknet',
      rating: 4.8,
      stake: 850,
      auditors: 12,
      verified: true,
      icon: LockClosedIcon,
      price: '0.5 STRK/call',
    },
    {
      id: 2,
      name: 'Bitcoin Swap Bot',
      category: 'Finance',
      description: 'Automated BTC ↔ STRK swaps via Garden Finance protocol',
      rating: 4.9,
      stake: 1200,
      auditors: 18,
      verified: true,
      icon: CurrencyDollarIcon,
      price: '0.3 STRK/swap',
    },
    {
      id: 3,
      name: 'Oracle Agent',
      category: 'Data',
      description: 'Real-time price feeds and off-chain data aggregation',
      rating: 4.5,
      stake: 650,
      auditors: 8,
      verified: false,
      icon: ChartBarIcon,
      price: '0.2 STRK/query',
    },
    {
      id: 4,
      name: 'Session Manager',
      category: 'Utilities',
      description: 'Create and manage autonomous session keys for your agent',
      rating: 4.7,
      stake: 720,
      auditors: 10,
      verified: true,
      icon: BoltIcon,
      price: '1 STRK/month',
    },
    {
      id: 5,
      name: 'DeFi Arbitrage Bot',
      category: 'Finance',
      description: 'Automated arbitrage opportunities across Starknet DEXs',
      rating: 4.6,
      stake: 980,
      auditors: 15,
      verified: true,
      icon: BuildingLibraryIcon,
      price: '5% profit share',
    },
    {
      id: 6,
      name: 'NFT Minter Agent',
      category: 'Creator',
      description: 'Batch mint NFTs with customizable metadata on Starknet',
      rating: 4.3,
      stake: 420,
      auditors: 6,
      verified: false,
      icon: PaintBrushIcon,
      price: '0.8 STRK/mint',
    },
    {
      id: 7,
      name: 'Smart Wallet Guardian',
      category: 'Utilities',
      description: 'Advanced wallet security with multi-sig and spending limits',
      rating: 4.9,
      stake: 1500,
      auditors: 22,
      verified: true,
      icon: ShieldCheckIcon,
      price: '2 STRK/month',
    },
    {
      id: 8,
      name: 'Yield Optimizer',
      category: 'DeFi',
      description: 'Maximize yields across lending protocols automatically',
      rating: 4.7,
      stake: 1100,
      auditors: 16,
      verified: true,
      icon: ChartBarIcon,
      price: '3% profit share',
    },
    {
      id: 9,
      name: 'Identity Verifier',
      category: 'Identity',
      description: 'KYC and identity verification with privacy preservation',
      rating: 4.4,
      stake: 550,
      auditors: 7,
      verified: false,
      icon: LockClosedIcon,
      price: '1 STRK/verification',
    },
  ];

  // Filter and sort services
  const filteredServices = allServices
    .filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      const matchesStake = service.stake >= minStake;
      const matchesVerified = !verifiedOnly || service.verified;
      return matchesSearch && matchesCategory && matchesStake && matchesVerified;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'stake') return b.stake - a.stake;
      if (sortBy === 'newest') return b.id - a.id;
      return 0;
    });

  const categories = ['all', 'Finance', 'Identity', 'Utilities', 'DeFi', 'Data', 'Creator'];

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
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)] cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
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
                  ? 'bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white'
                  : 'bg-[var(--bg-dark)] border-[var(--border-color)] hover:border-[var(--accent-purple)]'
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
                  onChange={(e) => setMinStake(Number(e.target.value))}
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
            Showing <span className="font-bold text-[var(--text-primary)]">{filteredServices.length}</span> results
          </p>
        </div>

        {/* Services Grid */}
        {filteredServices.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredServices.map((service) => {
              const IconComponent = service.icon;
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
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{service.name}</h3>
                        <span className="badge badge-purple text-xs whitespace-nowrap">
                          {service.category}
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
                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <StarIcon className="w-4 h-4 text-[var(--accent-orange)]" />
                      <span className="font-semibold">{service.rating}</span>
                    </div>

                    {/* Stake */}
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span>{service.stake} STRK</span>
                    </div>

                    {/* Auditors */}
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>{service.auditors}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Price</div>
                      <div className="font-bold text-sm text-[var(--accent-orange)]">{service.price}</div>
                    </div>
                    {service.verified && (
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
        ) : (
          /* Empty State */
          <div className="card text-center py-16">
            <MagnifyingGlassIcon className="w-24 h-24 text-[var(--text-muted)] mx-auto mb-6 opacity-50" />
            <h2 className="text-2xl font-bold mb-4">No services found</h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setMinStake(0);
                setVerifiedOnly(false);
              }}
              className="btn-outline"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Pagination (Mock) */}
        {filteredServices.length > 0 && (
          <div className="flex justify-center gap-2">
            <button className="px-4 py-2 rounded-xl bg-[var(--accent-purple)] text-white font-semibold">
              1
            </button>
            <button className="px-4 py-2 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-dark)] transition-colors">
              2
            </button>
            <button className="px-4 py-2 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-dark)] transition-colors">
              3
            </button>
            <button className="px-4 py-2 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-dark)] transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
