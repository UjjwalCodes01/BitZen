import Link from "next/link";
import { Bot, Github, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 bg-surface-50">
      <div className="section py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">BitZen</span>
            </Link>
            <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
              Autonomous AI Agent Marketplace on Starknet. Deploy agents, trade
              services, swap BTC↔STRK, and verify identities with
              zero-knowledge proofs.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">
              Platform
            </h4>
            <div className="flex flex-col gap-2">
              <Link
                href="/agents"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Agent Marketplace
              </Link>
              <Link
                href="/services"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Service Registry
              </Link>
              <Link
                href="/swap"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                BTC ↔ STRK Swap
              </Link>
              <Link
                href="/auditors"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Auditor Staking
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">
              Resources
            </h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/UjjwalCodes01/BitZen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
              <a
                href="https://sepolia.starkscan.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Block Explorer
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} BitZen. Built for Re&#123;define&#125; Starknet
            Hackathon.
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sepolia Testnet
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
