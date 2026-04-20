'use client';

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { contractAddress, abi } from '../constants/contract';
import { sepolia } from 'wagmi/chains';
import { Rocket, Wallet, Plus, Coins, Calendar, Image as ImageIcon, ExternalLink, ShieldCheck, TrendingUp, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });
  const { writeContract, isPending: isWriting } = useWriteContract();

  // State for new campaign form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target: '',
    deadline: '',
    image: '',
  });

  // Read Campaigns from contract - Explicitly set chainId to Sepolia so it works for users who haven't connected their wallet yet
  const { data: campaigns, isError, isLoading, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: abi,
    functionName: 'getCampaigns',
    chainId: sepolia.id,
  }) as { data: any[], isError: boolean, isLoading: boolean, refetch: () => void };

  // Track status of current transaction
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Effect to refetch when tx is confirmed
  React.useEffect(() => {
    if (isConfirmed && txHash) {
      refetch();
      setTxHash(undefined);
    }
  }, [isConfirmed, txHash, refetch]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: abi,
        functionName: 'createCampaign',
        args: [
          address,
          formData.title,
          formData.description,
          parseEther(formData.target),
          BigInt(deadlineTimestamp),
          formData.image
        ],
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
          alert("Campaign creation submitted! Waiting for confirmation...");
          setFormData({ title: '', description: '', target: '', deadline: '', image: '' });
        },
        onError: (err) => {
          console.error(err);
          alert("Failed to create campaign. Check console.");
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const donate = (id: number) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    const amount = prompt("Enter amount to donate (in ETH):");
    if (!amount || isNaN(Number(amount))) return;

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: abi,
      functionName: 'donateToCampaign',
      args: [BigInt(id)],
      value: parseEther(amount),
    }, {
      onSuccess: (hash) => {
        setTxHash(hash);
        alert("Donation submitted! Waiting for confirmation...");
      },
      onError: (err) => {
        console.error(err);
        alert("Donation failed. Check console.");
      }
    });
  };

  return (
    <div className="space-y-12">
      {/* Header / Navbar */}
      <nav className="flex items-center justify-between pb-8 border-b border-white/5 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            <Rocket className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fundora</h1>
            <p className="text-xs text-zinc-500 font-medium">DECENTRALIZED FUNDRAISING</p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-sm font-medium text-zinc-100">
                  {balanceData ? formatEther(balanceData.value).substring(0, 6) : "0"} {balanceData?.symbol}
                </p>
                <p className="text-xs text-zinc-500">{address?.substring(0, 6)}...{address?.substring(address.length - 4)}</p>
              </div>
              <button
                onClick={() => disconnect()}
                className="glass px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 border border-white/10 transition-all active:scale-95 flex items-center gap-2"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Show only the first MetaMask connector if multiple injected ones exist, or just the first available connector */}
              {(() => {
                const metamaskConnector = connectors.find(c => c.name === 'MetaMask');
                const connectorToShow = metamaskConnector || connectors[0];
                
                return connectorToShow ? (
                  <button
                    key={connectorToShow.id}
                    onClick={() => connect({ connector: connectorToShow })}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-[0_4px_20px_rgba(79,70,229,0.2)] transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect {connectorToShow.name === 'Injected' ? 'MetaMask' : connectorToShow.name}
                  </button>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600/5 border border-indigo-500/10 p-12 lg:p-20 text-center animate-slide-up">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-50" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Validated on {chainId === 11155111 ? "Sepolia" : chainId === 80002 ? "Polygon Amoy" : "Unknown"}
          </div>
          <h2 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">The future of <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent italic"> decentralized</span> giving</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Secure, transparent, and built on Smart Contracts. Launch your dream or fund the next big idea without intermediaries.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <a href="#create" className="bg-white text-black px-8 py-3.5 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95">Start a Campaign</a>
            <a href="#explore" className="glass px-8 py-3.5 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95">Explore Ideas</a>
          </div>
        </div>
      </section>

      {/* Create Section */}
      <div id="create" className="grid lg:grid-cols-2 gap-12 items-start py-10">
        <div className="space-y-6 animate-slide-left">
          <div className="space-y-2">
            <h3 className="text-3xl font-bold">Have a project?</h3>
            <p className="text-zinc-500">Share your vision with the world. Set your target and deadline, and let the community support you.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-5 rounded-3xl space-y-2">
              <TrendingUp className="text-indigo-400 w-5 h-5" />
              <h4 className="font-bold">Zero Platform Fees</h4>
              <p className="text-xs text-zinc-500">Keep 100% of your raised funds.</p>
            </div>
            <div className="glass p-5 rounded-3xl space-y-2">
              <ShieldCheck className="text-green-400 w-5 h-5" />
              <h4 className="font-bold">Verified on Chain</h4>
              <p className="text-xs text-zinc-500">Payments are secure & direct.</p>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-2xl relative animate-slide-right">
          <form onSubmit={handleCreateCampaign} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Campaign Title
              </label>
              <input
                required
                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                placeholder="Give your project a name"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5" /> Target (ETH)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                  placeholder="0.10"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Deadline
                </label>
                <input
                  required
                  type="date"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" /> Cover Image URL
              </label>
              <input
                required
                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                placeholder="https://images.unsplash.com/..."
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">Project Description</label>
              <textarea
                required
                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 min-h-[120px] transition-all"
                placeholder="What are you building?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <button
              disabled={isWriting || isConfirming}
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-5 rounded-2xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isWriting ? "Confirming in Wallet..." : isConfirming ? "Confirming on Chain..." : <><Plus className="w-5 h-5" /> Launch Campaign</>}
            </button>
          </form>
        </div>
      </div>

      {/* Campaigns Explorer */}
      <section id="explore" className="space-y-8 py-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-3xl font-bold tracking-tight">Active Campaigns</h3>
            <p className="text-zinc-500">Live projects awaiting your support on the blockchain.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 rounded-[2rem] bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((c: any, i: number) => {
              const raised = Number(formatEther(c.amountCollected));
              const goal = Number(formatEther(c.target));
              const percent = Math.min((raised / goal) * 100, 100);
              const daysLeft = Math.ceil((Number(c.deadline) * 1000 - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <div key={i} className="group glass rounded-[2rem] overflow-hidden flex flex-col hover:-translate-y-2 transition-all duration-300">
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={c.image || "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2071&auto=format&fit=crop"}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 glass px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                      Live Goal
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold truncate">{c.title}</h4>
                      <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-indigo-400">{raised.toFixed(3)} ETH Raised</span>
                        <span className="text-zinc-500">Goal: {goal.toFixed(2)} ETH</span>
                      </div>

                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500 transition-all duration-1000"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold">{daysLeft > 0 ? daysLeft : 0}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Days Left</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-bold">{percent.toFixed(0)}%</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Funded</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => donate(i)}
                        className="flex-1 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
                      >
                        Donate Now
                      </button>
                      <button className="p-4 glass rounded-2xl text-zinc-400 hover:text-white transition-all transform group-hover:rotate-12">
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass p-20 rounded-[2.5rem] text-center space-y-4">
            <Rocket className="w-12 h-12 text-zinc-700 mx-auto" />
            <h4 className="text-xl font-bold">No campaigns found</h4>
            <p className="text-zinc-500">Be the first to launch a dream on our platform.</p>
            <div className="pt-4">
              <a href="#create" className="text-indigo-400 font-bold hover:underline">Start Creating →</a>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="font-bold tracking-tight text-zinc-400">Fundora</span>
        </div>
        <p className="text-xs text-zinc-600 font-medium tracking-wide font-mono">
          DEPLOYED AT: {contractAddress}
        </p>
        <div className="flex gap-8 text-sm font-bold text-zinc-600">
          <a href="https://prakashauditorblog.hashnode.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-indigo-400">Blog</a>
          <a href="https://github.com/pky1987" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-indigo-400">GitHub</a>
        </div>
      </footer>

      {/* Modern Animations */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        
        .animate-fade-in { animation: fadeIn 0.8s ease-out; }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }
        .animate-slide-left { animation: slideLeft 0.8s ease-out forwards; }
        .animate-slide-right { animation: slideRight 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}
