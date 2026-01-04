import { useAuth } from "@/hooks/use-auth";
import { useTrading } from "@/hooks/use-trading";
import { useTransactions } from "@/hooks/use-transactions";
import { useQuery } from "@tanstack/react-query";
import { ActiveLots } from "@/components/ActiveLots";
import { TransactionsTable } from "@/components/TransactionsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Loader2, Plus, ArrowRight, Wallet, Copy, Crown, TrendingUp, Users, Info, CheckCircle2, Lock, ArrowDownLeft, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ethers } from "ethers";

const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";
const ADMIN_WALLET = "0xb416D5C1D8a7546F5Be3FA550374868d90d79615";
const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

const packages = Array.from({ length: 12 }, (_, i) => ({
  level: i + 1,
  limit: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600][i],
  cost: [20, 50, 100, 200, 300, 400, 500, 800, 1200, 1600, 2000, 2500][i],
}));

const REFERRAL_LEVELS = [
  { level: 1, reward: "6%", req: 1 },
  { level: 2, reward: "3%", req: 1 },
  { level: 3, reward: "2%", req: 2 },
  { level: 4, reward: "2%", req: 2 },
  { level: 5, reward: "2%", req: 3 },
  { level: 6, reward: "1%", req: 3 },
  { level: 7, reward: "1%", req: 4 },
  { level: 8, reward: "1%", req: 4 },
  { level: 9, reward: "1%", req: 5 },
  { level: 10, reward: "1%", req: 5 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: config } = useQuery<any>({
    queryKey: ["/api/admin/config"],
  });

  const { activeLots, isLoadingLots, upgrade, isUpgrading } = useTrading();
  const { transactions, isLoadingTransactions, withdraw, isWithdrawing, deposit } = useTransactions();
  const { toast } = useToast();

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState("0");
  const [isDepositing, setIsDepositing] = useState(false);
  const depositAddress = config?.depositWallet || ADMIN_WALLET;

  useEffect(() => {
    const fetchBalance = async () => {
      if (typeof window.ethereum !== "undefined" && user?.walletAddress) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
          const balance = await contract.balanceOf(user.walletAddress);
          const decimals = await contract.decimals();
          setWalletBalance(ethers.formatUnits(balance, decimals));
        } catch (error) {
          console.error("Error fetching USDT balance:", error);
        }
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [user?.walletAddress]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address copied to clipboard" });
  };

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount))) {
      toast({ title: "Invalid Amount", description: "Please enter a valid deposit amount", variant: "destructive" });
      return;
    }
    
    setIsDepositing(true);
    try {
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      const decimals = await contract.decimals();
      const amount = ethers.parseUnits(depositAmount, decimals);

      const tx = await contract.transfer(depositAddress, amount);
      toast({ title: "Transaction Sent", description: "Waiting for blockchain confirmation..." });
      await tx.wait();

      // Fix: Record in backend (assuming deposit hook doesn't accept txHash if LSP says so, or we need to update it)
      await deposit({ userId: user!.id, amount: Number(depositAmount) });
      
      toast({ title: "Deposit Successful", description: "Funds have been added to your balance." });
      setIsDepositOpen(false);
      setDepositAmount("");
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast({ 
        title: "Deposit Failed", 
        description: error.reason || error.message || "Transaction failed or cancelled", 
        variant: "destructive" 
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const currentPackage = packages.find(p => p.level === user?.packageLevel);
  const nextPackage = packages.find(p => p.level === (user?.packageLevel || 0) + 1);

  if (!user) return null;

  const copyReferral = () => {
    const url = `${window.location.origin}/auth?sponsor=${user.walletAddress}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Referral Link Copied!" });
  };

  const handleWithdraw = () => {
    withdraw({ amount: Number(withdrawAmount), address: withdrawAddress }, {
      onSuccess: () => {
        setIsWithdrawOpen(false);
        setWithdrawAmount("");
        setWithdrawAddress("");
        toast({ title: "Withdrawal Requested", description: "Your request has been submitted for admin approval." });
      }
    });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back to your trading center</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <ArrowDownLeft className="w-4 h-4 mr-2" /> Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Deposit USDT / USDC (BEP20)</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Network</p>
                  <p className="text-sm font-bold text-slate-900 bg-amber-100 text-amber-800 px-3 py-1 rounded-full inline-block">BNB Smart Chain (BEP20)</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Official Deposit Address</label>
                    <span className="text-xs font-bold text-slate-400">Balance: {parseFloat(walletBalance).toFixed(2)} USDT</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-4 rounded-xl border border-slate-700 font-mono text-xs text-white break-all shadow-inner">
                    {depositAddress}
                    <Button variant="ghost" size="icon" className="shrink-0 text-slate-400 hover:text-white" onClick={() => copyToClipboard(depositAddress)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Amount to Deposit</label>
                  <Input 
                    placeholder="Enter amount" 
                    type="number" 
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)} 
                    className="h-12 text-lg"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <strong>Instructions:</strong> Clicking below will initiate a transfer from your connected wallet to the platform admin wallet.
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <strong>Warning:</strong> Ensure you are using the <strong>BEP20</strong> network. Other networks will result in permanent loss.
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" 
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount}
                >
                  {isDepositing ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                  Confirm & Deposit Now
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="default">
                <Wallet className="w-4 h-4 mr-2" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-500">Platform Balance</span>
                    <span className="text-xs font-bold text-slate-400">Withdrawal</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-2xl font-bold text-primary">${parseFloat(user.balance).toFixed(2)}</div>
                    <div className="text-sm font-medium text-slate-600 pb-1">{parseFloat(walletBalance).toFixed(2)} USDT</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient Address</label>
                  <Input 
                    placeholder="0x..." 
                    value={withdrawAddress} 
                    onChange={e => setWithdrawAddress(e.target.value)} 
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleWithdraw} 
                  disabled={isWithdrawing || !withdrawAmount || !withdrawAddress}
                >
                  {isWithdrawing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                  Submit Withdrawal Request
                </Button>
                <p className="text-[10px] text-center text-slate-400">Requests are processed within 24-48 hours after admin approval.</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-slate-100 shadow-sm col-span-1 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Crown className="w-48 h-48" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Current Package</div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-display font-bold text-slate-900">
                    {user.packageLevel === 0 ? "No Package" : `Level ${user.packageLevel} Trader`}
                  </h3>
                  {user.packageLevel > 0 && (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
              
              {nextPackage && (
                <Button 
                  variant="premium" 
                  size="sm" 
                  onClick={() => upgrade(undefined)}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                  Upgrade to Lvl {nextPackage.level} (${nextPackage.cost})
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Direct Referrals</div>
                <div className="text-xl font-bold text-slate-900">{user.directReferrals}</div>
                <div className="text-[10px] text-slate-400">Min 5 for Autofill</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Upgrade Wallet</div>
                <div className="text-xl font-bold text-primary">${parseFloat(user.upgradePackageWallet).toFixed(2)}</div>
                <div className="text-[10px] text-slate-400">Autofill Income</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Consecutive Trades</div>
                <div className="text-xl font-bold text-slate-900">{user.consecutiveTradeDays} Days</div>
                <div className="text-[10px] text-slate-400">Min 2 for Withdraw</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Referral Level</div>
                <div className="text-xl font-bold text-slate-900">
                  {user.directReferrals >= 5 ? "10" : user.directReferrals >= 4 ? "7-8" : user.directReferrals >= 3 ? "5-6" : user.directReferrals >= 2 ? "3-4" : user.directReferrals >= 1 ? "1-2" : "0"}
                </div>
                <div className="text-[10px] text-slate-400">Eligible Levels</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 font-medium">Level Completion Progress</span>
                  <span className="text-slate-900 font-bold">{user.totalLotsBought} / 225 Trades</span>
                </div>
                <Progress value={(user.totalLotsBought / 225) * 100} className="h-2" />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-slate-400">
                    Package Level: {user.packageLevel} / 12
                  </p>
                  <p className="text-xs font-bold text-primary">
                    {225 - user.totalLotsBought} trades remaining for cycle
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-700">Your Referral Link</span>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={`${window.location.origin}/auth?sponsor=${user.walletAddress}`} className="bg-slate-50 font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyReferral()}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-rows-2 gap-6">
          <Card className="p-6 border-slate-100 shadow-sm flex flex-col justify-center bg-gradient-to-br from-primary to-primary/80 text-white">
            <div className="text-white/80 text-sm font-medium mb-1">Daily Buy Limit</div>
            <div className="text-3xl font-display font-bold">
              ${parseFloat(user.dailyBuyAmount).toFixed(0)} 
              <span className="text-lg text-white/60 font-normal"> / {currentPackage?.limit || 0}</span>
            </div>
            <div className="mt-2 text-xs text-white/60 bg-white/10 inline-block px-2 py-1 rounded w-fit">
              Resets every 24h
            </div>
          </Card>

          <Card className="p-6 border-slate-100 shadow-sm flex flex-col justify-center">
            <div className="text-slate-500 text-sm font-medium mb-1">Active Positions</div>
            <div className="text-3xl font-display font-bold text-slate-900">
              {activeLots?.length || 0}
            </div>
            <div className="mt-2 text-xs text-green-600 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Auto-matching active
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-display font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                10-Level Referral Income
              </CardTitle>
              <CardDescription>Earn rewards from your growing network</CardDescription>
            </div>
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
              My Directs: <span className="text-primary">{user.directReferrals}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y divide-slate-100">
            {REFERRAL_LEVELS.map((level) => {
              const isUnlocked = user.directReferrals >= level.req;
              return (
                <div key={level.level} className={cn(
                  "p-4 transition-colors relative group",
                  isUnlocked ? "bg-white" : "bg-slate-50/50 opacity-60"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Level {level.level}</span>
                    {isUnlocked ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                  <div className="text-xl font-display font-bold text-slate-900">{level.reward}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Req: {level.req} Direct{level.req > 1 ? 's' : ''}
                  </div>
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-all flex items-center justify-center">
                      <div className="bg-white px-2 py-1 rounded shadow-sm text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Need {level.req} Directs
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-display text-slate-900">Active Lots</h2>
          <Button variant="link" asChild className="p-0 h-auto font-semibold">
            <a href="/trading">Buy More Lots <ArrowRight className="w-4 h-4 ml-1" /></a>
          </Button>
        </div>
        
        {isLoadingLots ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <ActiveLots lots={activeLots || []} />
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold font-display text-slate-900 mb-4">Recent Activity</h2>
        {isLoadingTransactions ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <TransactionsTable transactions={transactions || []} />
        )}
      </div>
    </div>
  );
}
