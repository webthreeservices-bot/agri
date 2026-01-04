import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Home, PieChart, Wallet, Settings } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_WALLET = "0xb416D5C1D8a7546F5Be3FA550374868d90d79615";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isAdmin = user?.walletAddress?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: PieChart, label: "Trading", href: "/trading" },
    { icon: Wallet, label: "Transactions", href: "/transactions" },
    ...(isAdmin ? [{ icon: Settings, label: "Admin Panel", href: "/admin" }] : []),
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent skew-y-6 transform-gpu" />
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
        
        <main className="relative z-10 container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 shadow-sm flex-shrink-0 z-20 sticky top-0 md:h-screen">
        <div className="p-6 flex flex-col gap-4">
          <img 
            src="/logo.png" 
            alt="AgriTrade Logo" 
            className="w-32 h-32 rounded-2xl object-contain self-start"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/identicon/svg?seed=agritrade";
            }}
          />
          <div>
            <h1 className="font-display font-bold text-2xl leading-tight">AgriTrade</h1>
            <p className="text-sm text-muted-foreground font-medium">Crypto Platform</p>
          </div>
        </div>

        <div className="px-4 py-2">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">My Balance</div>
            <div className="text-2xl font-display font-bold text-primary">
              ${parseFloat(user.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate font-mono bg-white px-2 py-1 rounded border inline-block max-w-full">
              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group
                  ${isActive 
                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}>
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100">
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect Wallet
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
