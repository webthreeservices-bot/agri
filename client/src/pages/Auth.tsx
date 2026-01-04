import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Wallet, ArrowRight, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthPage() {
  const { user, connectWallet, isConnecting, demoLogin } = useAuth();
  const [sponsor, setSponsor] = useState("");
  const [, setLocation] = useLocation();
  
  // Parse URL for sponsor param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sponsorParam = params.get("sponsor");
    if (sponsorParam) setSponsor(sponsorParam);
  }, []);

  // Redirect if logged in
  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  const handleConnect = () => {
    connectWallet(sponsor || undefined);
  };

  const handleDemoLogin = () => {
    demoLogin();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.png" 
                alt="AgriTrade Logo" 
                className="w-16 h-16 rounded-xl object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/identicon/svg?seed=agritrade";
                }}
              />
              <span className="font-display font-bold text-2xl tracking-tight">AgriTrade</span>
            </div>
          <Button variant="outline" className="hidden sm:flex" onClick={() => window.open('https://metamask.io', '_blank')}>
            Get Wallet
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row pt-16">
        {/* Left Content */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 py-12 lg:py-0 bg-slate-50/50">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl mx-auto w-full space-y-8"
          >
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-primary text-sm font-semibold mb-6">
                Next Gen Trading Platform
              </span>
              <h1 className="text-4xl sm:text-6xl font-display font-bold leading-tight text-slate-900 mb-6">
                Trade Smarter,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  Profit Faster.
                </span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Join the world's most advanced decentralized trading ecosystem. 
                Auto-matching queues, instant settlements, and community rewards powered by blockchain technology.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Sponsor Address (Optional)</label>
                <Input 
                  placeholder="0x..." 
                  value={sponsor} 
                  onChange={(e) => setSponsor(e.target.value)}
                  className="h-12 text-base font-mono bg-slate-50 border-slate-200 focus:border-primary focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">Required only for new registrations.</p>
              </div>

              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transition-all"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-5 w-5" />
                    Connect Wallet
                  </>
                )}
              </Button>

              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 px-2">OR</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <Button 
                variant="outline"
                size="lg" 
                className="w-full h-14 text-lg font-semibold border-slate-300"
                onClick={handleDemoLogin}
                disabled={isConnecting}
              >
                <Loader2 className="mr-2 h-5 w-5" /> Demo Login
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200">
              <div className="text-center">
                <div className="font-display font-bold text-2xl text-slate-900">12k+</div>
                <div className="text-sm text-slate-500">Active Users</div>
              </div>
              <div className="text-center border-l border-slate-200">
                <div className="font-display font-bold text-2xl text-slate-900">$4M+</div>
                <div className="text-sm text-slate-500">Volume Traded</div>
              </div>
              <div className="text-center border-l border-slate-200">
                <div className="font-display font-bold text-2xl text-slate-900">0%</div>
                <div className="text-sm text-slate-500">Platform Fees</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Visual */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 mix-blend-overlay" />
          
          <div className="relative z-10 grid gap-8 max-w-md">
            {[
              { icon: ShieldCheck, title: "Secure & Transparent", desc: "Built on immutable smart contracts with audited security." },
              { icon: TrendingUp, title: "High Yield Trading", desc: "Advanced algorithms optimize your trading positions automatically." },
              { icon: Users, title: "Community Driven", desc: "Earn rewards by growing the ecosystem with our referral program." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="flex gap-4 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <item.icon className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{item.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
