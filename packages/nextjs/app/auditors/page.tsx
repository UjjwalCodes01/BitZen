"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useStakes } from "@/hooks/useAuditors";
import { useServices } from "@/hooks/useServices";
import { auditors as auditorsApi } from "@/lib/api";
import { Address } from "@/components/ui/Address";
import { TxLink } from "@/components/ui/TxLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState } from "@/components/ui/States";
import {
  Shield,
  Plus,
  Minus,
  Wallet,
  Coins,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { cn, formatCrypto, timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AuditorsPage() {
  const { address, isConnected } = useAccount();
  const { stakes, isLoading, error, refetch } = useStakes(address);
  const { services } = useServices();
  const [stakeModal, setStakeModal] = useState(false);
  const [stakeForm, setStakeForm] = useState({ serviceId: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleStake = async () => {
    if (!isConnected) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!stakeForm.serviceId || !stakeForm.amount) {
      toast.error("Fill in all fields");
      return;
    }
    try {
      setSubmitting(true);
      await auditorsApi.stake({
        service_id: stakeForm.serviceId,
        amount: stakeForm.amount,
      });
      toast.success("Staked successfully!");
      setStakeModal(false);
      setStakeForm({ serviceId: "", amount: "" });
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Staking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnstake = async (serviceId: string) => {
    if (!isConnected) return;
    try {
      await auditorsApi.unstake({ service_id: serviceId });
      toast.success("Unstaked successfully!");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unstake failed");
    }
  };

  const totalStaked = stakes.reduce(
    (sum, s) => sum + parseFloat(s.amount || "0"),
    0
  );

  if (!isConnected) {
    return (
      <div className="section py-20">
        <EmptyState
          icon={<Wallet className="w-8 h-8" />}
          title="Connect Your Wallet"
          description="Connect your Starknet wallet to manage auditor stakes"
        />
      </div>
    );
  }

  return (
    <div className="section py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            Auditor Staking
          </h1>
          <p className="page-subtitle">
            Stake STRK to audit services and earn rewards
          </p>
        </div>
        <button onClick={() => setStakeModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Stake on Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Staked</p>
              <p className="text-xl font-bold text-white">
                {formatCrypto(totalStaked, "STRK")}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Active Stakes</p>
              <p className="text-xl font-bold text-white">{stakes.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Services Audited</p>
              <p className="text-xl font-bold text-white">
                {new Set(stakes.map((s) => s.service_id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stakes List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white">Your Stakes</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            Loading stakes...
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={refetch} />
          </div>
        ) : stakes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Shield className="w-8 h-8" />}
              title="No active stakes"
              description="Stake STRK on services to start auditing and earning rewards"
              action={
                <button
                  onClick={() => setStakeModal(true)}
                  className="btn-primary btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Stake Now
                </button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {stakes.map((stake, i) => (
              <div
                key={stake.id || i}
                className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Service #{String(stake.service_id ?? "").slice(0, 8) || "—"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-semibold text-primary-400">
                        {formatCrypto(stake.amount || "0", "STRK")}
                      </span>
                      {stake.tx_hash && (
                        <TxLink hash={stake.tx_hash} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={stake.status || "active"}
                    variant={stake.status === "active" || !stake.status ? "success" : "neutral"}
                    pulse={stake.status === "active" || !stake.status}
                  />
                  <button
                    onClick={() => handleUnstake(stake.service_id)}
                    className="btn-danger btn-sm"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    Unstake
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stake Modal */}
      <Modal
        isOpen={stakeModal}
        onClose={() => setStakeModal(false)}
        title="Stake on Service"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Select Service
            </label>
            <select
              value={stakeForm.serviceId}
              onChange={(e) =>
                setStakeForm({ ...stakeForm, serviceId: e.target.value })
              }
              className="select"
            >
              <option value="">Choose a service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Stake Amount (STRK)
            </label>
            <input
              type="number"
              value={stakeForm.amount}
              onChange={(e) =>
                setStakeForm({ ...stakeForm, amount: e.target.value })
              }
              placeholder="100"
              className="input"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStakeModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleStake}
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? "Staking..." : "Stake"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
