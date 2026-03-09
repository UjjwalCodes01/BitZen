"use client";

import { useState } from "react";
import { truncateAddress, copyToClipboard, explorerLink } from "@/lib/utils";
import { Copy, Check, ExternalLink } from "lucide-react";

interface AddressProps {
  address: string;
  chars?: number;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
}

export function Address({
  address,
  chars = 4,
  showCopy = true,
  showExplorer = true,
  className = "",
}: AddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono text-zinc-300">
        {truncateAddress(address, chars)}
      </span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Copy address"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
      {showExplorer && (
        <a
          href={explorerLink(address, "contract")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-primary-400 transition-colors"
          title="View on explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </span>
  );
}
