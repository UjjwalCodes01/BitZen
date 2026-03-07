"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount } from "@starknet-react/core";
import { useService, useReviews, useReputation } from "@/hooks/useServices";
import { Address } from "@/components/ui/Address";
import { TxLink } from "@/components/ui/TxLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StarRating } from "@/components/ui/StarRating";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { services as servicesApi } from "@/lib/api";
import {
  Store,
  ArrowLeft,
  Tag,
  Star,
  MessageSquare,
  Calendar,
  Shield,
  Send,
} from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ServiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { address, isConnected } = useAccount();
  const { service, isLoading, error } = useService(id);
  const { reviews, isLoading: reviewsLoading, refetch: refetchReviews } = useReviews(id);
  const { reputation } = useReputation(id);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!isConnected) {
      toast.error("Connect your wallet to submit a review");
      return;
    }
    try {
      setSubmitting(true);
      await servicesApi.submitReview(id, reviewForm);
      toast.success("Review submitted!");
      setReviewModal(false);
      setReviewForm({ rating: 5, comment: "" });
      refetchReviews();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading service..." />;
  if (error || !service)
    return (
      <div className="section py-10">
        <ErrorState message={error || "Service not found"} />
      </div>
    );

  return (
    <div className="section py-10">
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Services
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-accent-500/10 flex items-center justify-center shrink-0">
                <Store className="w-7 h-7 text-accent-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">
                    {service.name}
                  </h1>
                  <StatusBadge
                    label={service.status || "active"}
                    variant="success"
                    pulse
                  />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <Tag className="w-3.5 h-3.5" />
                    {service.category || "General"}
                  </span>
                  <span className="text-primary-400 font-semibold">
                    {service.price || "Free"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {service.description || "No description provided"}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                Provider:{" "}
                <Address
                  address={service.provider_address}
                  chars={4}
                  showCopy
                  showExplorer
                />
              </span>
              {service.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(service.created_at)}
                </span>
              )}
              {service.tx_hash && (
                <TxLink hash={service.tx_hash} label="On-chain" />
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent-400" />
                Reviews
              </h2>
              <button
                onClick={() => setReviewModal(true)}
                className="btn-accent btn-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Write Review
              </button>
            </div>

            {reviewsLoading ? (
              <div className="p-6 text-center text-sm text-zinc-500">
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Star className="w-8 h-8" />}
                  title="No reviews yet"
                  description="Be the first to review this service"
                  action={
                    <button
                      onClick={() => setReviewModal(true)}
                      className="btn-accent btn-sm"
                    >
                      Write Review
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {reviews.map((review, i) => (
                  <div key={review.id || i} className="px-6 py-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} />
                        <Address
                          address={review.reviewer_address}
                          chars={3}
                          showCopy={false}
                          showExplorer={false}
                          className="text-xs"
                        />
                      </div>
                      {review.created_at && (
                        <span className="text-xs text-zinc-600">
                          {timeAgo(review.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reputation Card */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-400" />
              Reputation Score
            </h3>

            {reputation ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">
                    {reputation.score?.toFixed(1) || "—"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    out of 100
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Average Rating</span>
                    <StarRating
                      rating={reputation.average_rating || 0}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Total Reviews</span>
                    <span className="text-zinc-300">
                      {reputation.total_reviews || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center">
                No reputation data yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModal}
        onClose={() => setReviewModal(false)}
        title="Write a Review"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() =>
                    setReviewForm({ ...reviewForm, rating: star })
                  }
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= reviewForm.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Comment
            </label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, comment: e.target.value })
              }
              placeholder="Share your experience..."
              className="textarea"
              rows={4}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setReviewModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={submitting || !reviewForm.comment.trim()}
              className="btn-accent flex-1"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
