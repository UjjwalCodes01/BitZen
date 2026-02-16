"use client";

import type { NextPage } from "next";
import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CheckCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  BoltIcon,
} from "@heroicons/react/24/solid";
import { useAgentPlugins } from "~~/hooks/bitizen/useAgentPlugins";
import { useAgents } from "~~/hooks/bitizen/useAgents";

const RegisterAgent: NextPage = () => {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { zkproof } = useAgentPlugins();
  const { registerAgent } = useAgents();

  const [currentStep, setCurrentStep] = useState(1);
  const [zkProofGenerated, setZkProofGenerated] = useState(false);
  const [zkProofGenerating, setZkProofGenerating] = useState(false);
  const [zkProofData, setZkProofData] = useState<any>(null);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentCategory, setAgentCategory] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "Finance",
    "Identity",
    "Utilities",
    "DeFi",
    "Data",
    "Creator",
    "Gaming",
    "Social",
  ];

  const handleGenerateZkProof = async () => {
    if (!address) return;

    setZkProofGenerating(true);
    const toastId = toast.loading("Generating ZK proof...");
    try {
      // Call real ZKProof plugin API
      const result = await zkproof.generate(address, {
        name: agentName || "New Agent",
      });

      if (result.success && result.data) {
        setZkProofData(result.data);
        setZkProofGenerated(true);
        toast.success("ZK Proof generated successfully!", { id: toastId });
      } else {
        toast.error(result.error || "ZK Proof generation failed", {
          id: toastId,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "ZK Proof generation failed", {
        id: toastId,
      });
    } finally {
      setZkProofGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!address || !zkProofData) return;

    setSubmitting(true);
    const toastId = toast.loading("Registering agent...");
    try {
      // Verify the ZK proof on-chain
      const verifyResult = await zkproof.verify(
        zkProofData.proof,
        zkProofData.publicInputs,
      );

      if (verifyResult.success) {
        // Register agent with verified proof
        const registerResult = await registerAgent(
          zkProofData.publicInputs[1], // publicKey
          zkProofData.proof,
          {
            name: agentName,
            description: agentDescription,
            categories: agentCategory,
            proofId: zkProofData.proofId,
            txHash: verifyResult.data?.txHash,
          },
        );

        if (registerResult) {
          toast.success(
            `Agent registered successfully!\nProof ID: ${zkProofData.proofId}`,
            { id: toastId, duration: 6000 },
          );
          router.push("/dashboard");
        } else {
          toast.error("Agent registration failed", { id: toastId });
        }
      } else {
        toast.error("ZK Proof verification failed", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "Agent registration failed", {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (cat: string) => {
    if (agentCategory.includes(cat)) {
      setAgentCategory(agentCategory.filter((c) => c !== cat));
    } else {
      setAgentCategory([...agentCategory, cat]);
    }
  };

  const canProceedToStep2 = isConnected;
  const canProceedToStep3 = zkProofGenerated;
  const canProceedToStep4 =
    agentName.trim() !== "" &&
    agentDescription.trim() !== "" &&
    agentCategory.length > 0;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">REGISTER YOUR AGENT</h1>
          <p className="text-[var(--text-secondary)]">
            Deploy your autonomous agent on Starknet in 4 simple steps
          </p>
        </div>

        {/* Step Indicator */}
        <div className="card mb-8 p-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-[var(--bg-dark)] -z-10">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-orange)] transition-all duration-500"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              ></div>
            </div>

            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep >= 1
                    ? "gradient-purple text-white shadow-lg"
                    : "bg-[var(--bg-dark)] text-[var(--text-muted)]"
                }`}
              >
                {currentStep > 1 ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <BoltIcon className="w-6 h-6" />
                )}
              </div>
              <span className="text-xs font-semibold">Connect</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep >= 2
                    ? "gradient-purple text-white shadow-lg"
                    : "bg-[var(--bg-dark)] text-[var(--text-muted)]"
                }`}
              >
                {currentStep > 2 ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <SparklesIcon className="w-6 h-6" />
                )}
              </div>
              <span className="text-xs font-semibold">ZK Proof</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep >= 3
                    ? "gradient-purple text-white shadow-lg"
                    : "bg-[var(--bg-dark)] text-[var(--text-muted)]"
                }`}
              >
                {currentStep > 3 ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <DocumentTextIcon className="w-6 h-6" />
                )}
              </div>
              <span className="text-xs font-semibold">Details</span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep >= 4
                    ? "gradient-purple text-white shadow-lg"
                    : "bg-[var(--bg-dark)] text-[var(--text-muted)]"
                }`}
              >
                <RocketLaunchIcon className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold">Deploy</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="card p-8">
          {/* Step 1: Wallet Connection */}
          {currentStep === 1 && (
            <div className="text-center py-12">
              <BoltIcon className="w-24 h-24 text-[var(--accent-purple)] mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              {isConnected ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success)]/20 text-[var(--success)] mb-6">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-semibold">Wallet Connected</span>
                  </div>
                  <p className="text-[var(--text-secondary)] mb-2">Address:</p>
                  <p className="font-mono text-sm mb-8">{address}</p>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="btn-primary"
                  >
                    Continue to ZK Proof Generation
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                    Please connect your Starknet wallet to proceed with agent
                    registration.
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Use the wallet connect button in the top right corner
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 2: ZK Proof Generation */}
          {currentStep === 2 && (
            <div className="text-center py-12">
              <ShieldCheckIcon
                className={`w-24 h-24 mx-auto mb-6 ${
                  zkProofGenerated
                    ? "text-[var(--success)]"
                    : "text-[var(--accent-purple)]"
                }`}
              />
              <h2 className="text-2xl font-bold mb-4">
                Generate Zero-Knowledge Proof
              </h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                Generate a ZK proof to verify your agent's identity without
                revealing sensitive information.
              </p>

              {zkProofGenerating ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="zk-spinner mx-auto"></div>
                  <p className="text-[var(--accent-purple)] font-semibold">
                    Generating ZK Proof...
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    This may take a few moments
                  </p>
                </div>
              ) : zkProofGenerated ? (
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success)]/20 text-[var(--success)] mb-8">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-semibold">
                      ZK Proof Generated Successfully
                    </span>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="btn-primary"
                    >
                      Continue to Agent Details
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="btn-outline"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerateZkProof}
                    className="btn-primary"
                  >
                    Generate ZK Proof
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Agent Metadata Form */}
          {currentStep === 3 && (
            <div className="py-6">
              <h2 className="text-2xl font-bold mb-6 text-center">
                Agent Details
              </h2>

              <div className="space-y-6 max-w-2xl mx-auto">
                {/* Agent Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., My Trading Bot"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)]"
                  />
                </div>

                {/* Agent Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Description *
                  </label>
                  <textarea
                    placeholder="Describe what your agent does..."
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--accent-purple)] transition-colors text-[var(--text-primary)] resize-none"
                  ></textarea>
                </div>

                {/* Category Multi-Select */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Categories * (Select at least one)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-4 py-2 rounded-xl border-2 transition-all ${
                          agentCategory.includes(cat)
                            ? "bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white"
                            : "bg-[var(--bg-dark)] border-[var(--border-color)] hover:border-[var(--accent-purple)]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar Upload (Optional) */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Avatar (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--bg-dark)] border-2 border-dashed border-[var(--border-color)] flex items-center justify-center">
                      <span className="text-[var(--text-muted)] text-xs">
                        No image
                      </span>
                    </div>
                    <button className="btn-outline">Upload Image</button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center mt-8">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="btn-outline"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={!canProceedToStep4}
                  className={`btn-primary ${!canProceedToStep4 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Review & Deploy
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="py-6">
              <h2 className="text-2xl font-bold mb-6 text-center">
                Review Your Agent
              </h2>

              <div className="max-w-2xl mx-auto space-y-6 mb-8">
                {/* Summary Card */}
                <div className="p-6 rounded-2xl bg-[var(--bg-hover)] border border-[var(--border-color)]">
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">
                        Agent Name:
                      </span>
                      <span className="font-semibold">{agentName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">
                        Description:
                      </span>
                      <span className="font-semibold text-right max-w-xs">
                        {agentDescription}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">
                        Categories:
                      </span>
                      <span className="font-semibold">
                        {agentCategory.join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">
                        ZK Proof:
                      </span>
                      <span className="inline-flex items-center gap-1 text-[var(--success)]">
                        <CheckCircleIcon className="w-4 h-4" />
                        Verified
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-[var(--text-secondary)]">
                        Wallet:
                      </span>
                      <span className="font-mono text-sm">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Note */}
                <div className="p-4 rounded-xl bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30">
                  <p className="text-sm text-[var(--text-secondary)]">
                    ⚠️ <strong>Important:</strong> By deploying this agent, you
                    confirm that all information is accurate. The transaction
                    will require your signature and a small gas fee.
                  </p>
                </div>
              </div>

              {submitting ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="zk-spinner mx-auto"></div>
                  <p className="text-[var(--accent-purple)] font-semibold">
                    Deploying Your Agent...
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Please confirm the transaction in your wallet
                  </p>
                </div>
              ) : (
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="btn-outline"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <RocketLaunchIcon className="w-5 h-5" />
                    Deploy Agent
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterAgent;
