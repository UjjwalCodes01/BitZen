"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { useAuth } from "@/contexts/AuthContext";
import { zkproof, type ZKProof } from "@/lib/api";
import { Address } from "@/components/ui/Address";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  Fingerprint,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ZKProofsPage() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const [proofs, setProofs] = useState<ZKProof[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchProofs = useCallback(async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await zkproof.getAgentProofs(address);
      setProofs(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load proofs";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address && isAuthenticated) fetchProofs();
  }, [address, isAuthenticated, fetchProofs]);

  const handleGenerate = async () => {
    if (!address) return;
    try {
      setGenerating(true);
      await zkproof.generate({
        agentAddress: address,
      });
      toast.success("ZK proof generated successfully!");
      fetchProofs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Proof generation failed";
      if (msg.includes("503") || msg.includes("circuit")) {
        toast.error("ZK circuit files not configured. Contact admin to set up circuits.");
      } else {
        toast.error(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (proofId: string) => {
    try {
      setVerifyingId(proofId);
      // Fetch the full proof to get proof data and public signals
      const fullProof = await zkproof.getStatus(proofId);
      const result = await zkproof.verify({
        proof: fullProof.proof,
        publicSignals: fullProof.publicSignals || [],
      });
      if (result.isValid) {
        toast.success("Proof verified on-chain!");
      } else {
        toast.error("Proof verification failed");
      }
      fetchProofs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const statusVariant = (status?: string) => {
    switch (status) {
      case "verified":
        return "success";
      case "generated":
        return "warning";
      case "failed":
        return "error";
      default:
        return "neutral";
    }
  };

  const StatusIcon = ({ status }: { status?: string }) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "generated":
        return <Clock className="w-5 h-5 text-amber-400" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Fingerprint className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="section py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-primary-400" />
            ZK Identity Proofs
          </h1>
          <p className="page-subtitle">
            Generate and verify zero-knowledge proofs for agent identity on Starknet
          </p>
        </div>
        {isConnected && isAuthenticated && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {generating ? "Generating..." : "Generate Proof"}
          </button>
        )}
      </div>

      {/* Not Connected State */}
      {!isConnected ? (
        <div className="card p-12 text-center">
          <Fingerprint className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-300 mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-zinc-500">
            Connect and authenticate your wallet to manage ZK identity proofs.
          </p>
        </div>
      ) : !isAuthenticated ? (
        <div className="card p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-300 mb-2">Authentication Required</h2>
          <p className="text-sm text-zinc-500">
            Click &quot;Authenticate&quot; in the wallet menu to access ZK proof features.
          </p>
        </div>
      ) : (
        <>
          {/* Info Banner */}
          <div className="card p-4 mb-6 border-primary-500/20 bg-primary-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-zinc-300">
                  ZK proofs use Garaga&apos;s Groth16 verifier on Starknet to prove agent identity
                  without revealing private data. Generated proofs are stored and can be verified on-chain.
                </p>
              </div>
            </div>
          </div>

          {/* Proofs List */}
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchProofs} />
          ) : proofs.length === 0 ? (
            <EmptyState
              icon={<Fingerprint className="w-8 h-8" />}
              title="No ZK proofs yet"
              description="Generate your first zero-knowledge identity proof to get verified on the network."
              action={
                <button onClick={handleGenerate} disabled={generating} className="btn-primary btn-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Generate Proof
                </button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {proofs.map((proof) => (
                <div key={proof.proofId} className="card p-5 flex items-center gap-4">
                  <StatusIcon status={proof.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-white">
                        Proof #{proof.proofId.slice(0, 8)}
                      </span>
                      <StatusBadge
                        label={proof.status || "unknown"}
                        variant={statusVariant(proof.status)}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <Address address={proof.agentAddress} chars={4} showCopy showExplorer={false} />
                      {proof.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(new Date(proof.createdAt * 1000).toISOString())}
                        </span>
                      )}
                    </div>
                  </div>
                  {proof.status === "generated" && (
                    <button
                      onClick={() => handleVerify(proof.proofId)}
                      disabled={verifyingId === proof.proofId}
                      className="btn-primary btn-sm"
                    >
                      {verifyingId === proof.proofId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Verify
                    </button>
                  )}
                  {proof.status === "verified" && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Refresh */}
          {proofs.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={fetchProofs}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
