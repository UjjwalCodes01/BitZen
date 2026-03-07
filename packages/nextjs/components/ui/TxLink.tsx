"use client";

import { explorerLink } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface TxLinkProps {
  hash: string;
  label?: string;
  className?: string;
}

export function TxLink({ hash, label, className = "" }: TxLinkProps) {
  if (!hash) return null;

  const short = `${hash.slice(0, 8)}...${hash.slice(-6)}`;

  return (
    <a
      href={explorerLink(hash, "tx")}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors font-mono ${className}`}
    >
      {label || short}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
