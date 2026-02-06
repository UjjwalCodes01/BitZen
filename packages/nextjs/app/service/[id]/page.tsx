"use client";

import type { NextPage } from "next";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  StarIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BookmarkIcon,
  ShareIcon,
  PlusIcon,
  XMarkIcon,
  LockClosedIcon,
} from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

const ServiceDetail: NextPage = () => {
  const params = useParams();
  const serviceId = params?.id;

  const [activeTab, setActiveTab] = useState<
    "overview" | "reviews" | "auditors" | "activity"
  >("overview");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");

  // Mock service data
  const service = {
    id: serviceId,
    name: "ZK Passport Agent",
    category: "Identity",
    provider: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
    description: `Generate and verify zero-knowledge identity proofs on Starknet. This agent enables privacy-preserving identity verification without revealing sensitive personal information.

## Features
- **Zero-Knowledge Proofs**: Generate cryptographic proofs without exposing data
- **Cross-Chain Compatibility**: Works with multiple blockchain networks
- **Fast Verification**: Verify proofs in milliseconds
- **Privacy First**: No personal data stored on-chain

## Use Cases
- KYC/AML compliance without data exposure
- Age verification for restricted content
- Credential verification for job applications
- Anonymous voting systems

## API Endpoints
\`\`\`
POST /api/generate-proof
POST /api/verify-proof
GET /api/proof-status/:id
\`\`\`

## Integration Example
\`\`\`typescript
import { ZKPassport } from '@bitizen/agents';

const agent = new ZKPassport();
const proof = await agent.generateProof({
  credential: 'age_over_18',
  secret: userSecret
});
\`\`\``,
    rating: 4.8,
    totalReviews: 127,
    stake: 850,
    auditors: 12,
    verified: true,
    status: "active",
    price: "0.5 STRK/call",
    totalCalls: 3420,
    integrations: 45,
    uptime: "99.8%",
  };

  // Mock reviews
  const reviews = [
    {
      id: 1,
      author: "0xabc...def",
      rating: 5,
      date: "Jan 28, 2026",
      content:
        "Excellent service! ZK proofs generated instantly and verification is super fast. Highly recommend for any privacy-focused application.",
      helpful: 12,
    },
    {
      id: 2,
      author: "0x123...456",
      rating: 4,
      date: "Jan 25, 2026",
      content:
        "Great agent overall. Documentation could be more detailed, but the API is straightforward to use.",
      helpful: 8,
    },
    {
      id: 3,
      author: "0x789...abc",
      rating: 5,
      date: "Jan 22, 2026",
      content:
        "Game-changer for our KYC process. No more storing sensitive user data!",
      helpful: 15,
    },
  ];

  // Mock auditors
  const auditors = [
    {
      address: "0x1234567890abcdef",
      stake: 250,
      since: "Jan 15, 2026",
    },
    {
      address: "0xfedcba0987654321",
      stake: 180,
      since: "Jan 18, 2026",
    },
    {
      address: "0xabcdef1234567890",
      stake: 150,
      since: "Jan 20, 2026",
    },
  ];

  // Mock activity
  const activity = [
    {
      id: 1,
      type: "Service Call",
      details: "Generate ZK proof requested",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "Review",
      details: "New 5-star review submitted",
      time: "5 hours ago",
    },
    {
      id: 3,
      type: "Stake",
      details: "150 STRK staked by auditor",
      time: "1 day ago",
    },
    {
      id: 4,
      type: "Service Call",
      details: "Verify ZK proof requested",
      time: "1 day ago",
    },
  ];

  const ratingDistribution = [
    { stars: 5, count: 89, percentage: 70 },
    { stars: 4, count: 28, percentage: 22 },
    { stars: 3, count: 7, percentage: 6 },
    { stars: 2, count: 2, percentage: 1.5 },
    { stars: 1, count: 1, percentage: 0.5 },
  ];

  const handleSubmitReview = () => {
    // TODO: Submit review
    setShowReviewModal(false);
    setReviewRating(5);
    setReviewText("");
  };

  const handleStake = () => {
    // TODO: Submit stake
    setShowStakeModal(false);
    setStakeAmount("");
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Back Button */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-[var(--accent-purple)] hover:underline mb-6"
        >
          ← Back to Marketplace
        </Link>

        {/* Hero Section */}
        <div className="card mb-8 p-8 border-2 border-[var(--accent-purple)]/30">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left: Icon & Name */}
            <div className="md:col-span-2">
              <div className="flex items-start gap-6 mb-4">
                <div className="w-24 h-24 rounded-2xl gradient-purple flex items-center justify-center shadow-lg flex-shrink-0">
                  <LockClosedIcon className="w-12 h-12 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{service.name}</h1>
                    {service.verified && (
                      <span className="badge badge-success inline-flex items-center gap-1">
                        <ShieldCheckIcon className="w-4 h-4" />
                        Verified
                      </span>
                    )}
                  </div>
                  <span className="badge badge-purple mb-3">
                    {service.category}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <StarIcon className="w-5 h-5 text-[var(--accent-orange)]" />
                      <span className="font-bold">{service.rating}</span>
                      <span className="text-[var(--text-secondary)]">
                        ({service.totalReviews} reviews)
                      </span>
                    </div>
                    <div className="text-[var(--text-secondary)]">•</div>
                    <div className="text-[var(--text-secondary)]">
                      Provider:{" "}
                      <span className="font-mono text-xs">
                        {service.provider.slice(0, 10)}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Stats & Actions */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-color)]">
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Price
                </div>
                <div className="text-2xl font-bold text-[var(--accent-orange)]">
                  {service.price}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
                  <PlusIcon className="w-5 h-5" />
                  Use Service
                </button>
                <button className="p-3 rounded-xl border-2 border-[var(--border-color)] hover:border-[var(--accent-purple)] transition-colors">
                  <BookmarkIcon className="w-5 h-5 text-[var(--accent-purple)]" />
                </button>
                <button className="p-3 rounded-xl border-2 border-[var(--border-color)] hover:border-[var(--accent-purple)] transition-colors">
                  <ShareIcon className="w-5 h-5 text-[var(--accent-purple)]" />
                </button>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border-color)]">
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Total Stake
              </div>
              <div className="font-bold text-lg">{service.stake} STRK</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Auditors
              </div>
              <div className="font-bold text-lg">{service.auditors}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Total Calls
              </div>
              <div className="font-bold text-lg">
                {service.totalCalls.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Uptime
              </div>
              <div className="font-bold text-lg text-[var(--success)]">
                {service.uptime}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="card mb-8 p-0 overflow-hidden">
          <div className="flex border-b border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "overview"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "hover:bg-[var(--bg-hover)]"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "reviews"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "hover:bg-[var(--bg-hover)]"
              }`}
            >
              Reviews
            </button>
            <button
              onClick={() => setActiveTab("auditors")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "auditors"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "hover:bg-[var(--bg-hover)]"
              }`}
            >
              Auditors
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "activity"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "hover:bg-[var(--bg-hover)]"
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="card prose prose-invert max-w-none">
            <div
              className="text-[var(--text-primary)]"
              dangerouslySetInnerHTML={{
                __html: service.description
                  .split("\n")
                  .map((line) => {
                    if (line.startsWith("## ")) {
                      return `<h2 class="text-2xl font-bold mt-8 mb-4 text-[var(--accent-purple)]">${line.slice(3)}</h2>`;
                    }
                    if (line.startsWith("- ")) {
                      return `<li class="text-[var(--text-secondary)]">${line.slice(2)}</li>`;
                    }
                    if (line.startsWith("**")) {
                      return `<p class="text-[var(--text-secondary)]">${line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>')}</p>`;
                    }
                    if (line.startsWith("```")) {
                      return line.includes("```typescript")
                        ? '<pre class="bg-[var(--bg-dark)] p-4 rounded-xl overflow-x-auto"><code class="text-sm">'
                        : "</code></pre>";
                    }
                    if (line.trim() === "") {
                      return "<br />";
                    }
                    return `<p class="text-[var(--text-secondary)]">${line}</p>`;
                  })
                  .join(""),
              }}
            />
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            <div className="card mb-8 p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Rating Distribution */}
                <div>
                  <h3 className="text-2xl font-bold mb-6">
                    Rating Distribution
                  </h3>
                  <div className="space-y-3">
                    {ratingDistribution.map((dist) => (
                      <div key={dist.stars} className="flex items-center gap-3">
                        <span className="text-sm w-8">{dist.stars}★</span>
                        <div className="flex-1 bg-[var(--bg-dark)] rounded-full h-3">
                          <div
                            className="bg-[var(--accent-orange)] h-3 rounded-full"
                            style={{ width: `${dist.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-[var(--text-secondary)] w-12">
                          {dist.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--bg-hover)]">
                  <div className="text-6xl font-bold text-[var(--accent-orange)] mb-2">
                    {service.rating}
                  </div>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        className="w-6 h-6 text-[var(--accent-orange)]"
                      />
                    ))}
                  </div>
                  <div className="text-[var(--text-secondary)]">
                    {service.totalReviews} reviews
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowReviewModal(true)}
                className="btn-primary w-full mt-6"
              >
                Write a Review
              </button>
            </div>

            {/* Review Cards */}
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm">
                          {review.author}
                        </span>
                        <span className="text-[var(--text-muted)] text-xs">
                          •
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                          {review.date}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) =>
                          star <= review.rating ? (
                            <StarIcon
                              key={star}
                              className="w-4 h-4 text-[var(--accent-orange)]"
                            />
                          ) : (
                            <StarOutline
                              key={star}
                              className="w-4 h-4 text-[var(--text-muted)]"
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-[var(--text-secondary)] mb-3">
                    {review.content}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <button className="text-[var(--accent-purple)] hover:underline">
                      Helpful ({review.helpful})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "auditors" && (
          <div>
            <div className="card mb-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Become an Auditor</h3>
                  <p className="text-[var(--text-secondary)]">
                    Stake STRK tokens to help verify this service and earn
                    rewards
                  </p>
                </div>
                <button
                  onClick={() => setShowStakeModal(true)}
                  className="btn-primary"
                >
                  Stake as Auditor
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="text-2xl font-bold mb-6">
                Current Auditors ({auditors.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                        AUDITOR ADDRESS
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                        STAKE AMOUNT
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-secondary)]">
                        STAKED SINCE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditors.map((auditor, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm">
                            {auditor.address}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-[var(--accent-orange)]">
                            {auditor.stake} STRK
                          </span>
                        </td>
                        <td className="py-4 px-4 text-[var(--text-secondary)]">
                          {auditor.since}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="card">
            <h3 className="text-2xl font-bold mb-6">Recent Activity</h3>
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-purple)]/20 flex items-center justify-center">
                      <ClockIcon className="w-5 h-5 text-[var(--accent-purple)]" />
                    </div>
                    <div>
                      <div className="font-semibold">{item.type}</div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {item.details}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="card max-w-2xl w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Write a Review</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        {star <= reviewRating ? (
                          <StarIcon className="w-10 h-10 text-[var(--accent-orange)]" />
                        ) : (
                          <StarOutline className="w-10 h-10 text-[var(--text-muted)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Your Review
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with this service..."
                    rows={6}
                    className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)] resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={!reviewText.trim()}
                  className={`btn-primary flex-1 ${!reviewText.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stake Modal */}
        {showStakeModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Stake as Auditor</h3>
                <button
                  onClick={() => setShowStakeModal(false)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Stake STRK tokens to become an auditor for this service.
                Auditors help verify service quality and earn rewards.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Stake Amount (STRK)
                </label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                />
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-2">
                  <span>Min: 50 STRK</span>
                  <span>Max: 1000 STRK</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowStakeModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStake}
                  disabled={!stakeAmount || Number(stakeAmount) < 50}
                  className={`btn-primary flex-1 ${
                    !stakeAmount || Number(stakeAmount) < 50
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Stake Tokens
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetail;
