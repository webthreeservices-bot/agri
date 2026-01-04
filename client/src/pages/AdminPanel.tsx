import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, Wallet, CheckCircle2, XCircle, Users, RefreshCw, Search, Edit2, ShieldAlert, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDistributing, setIsDistributing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: config, isLoading: isLoadingConfig } = useQuery<any>({
    queryKey: ["/api/admin/config"],
  });

  const { data: allUsers, isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: pendingWithdrawals, isLoading: isLoadingWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals/pending"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest("POST", "/api/admin/config", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
      toast({ title: "Configuration updated successfully" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated successfully" });
      setSelectedUser(null);
    },
  });

  const depositMutation = useMutation({
    mutationFn: async ({ walletAddress, amount }: { walletAddress: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/transactions/deposit", { walletAddress, amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Deposit successful" });
    },
  });

  const approveWithdrawal = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Withdrawal Approved" });
    },
  });

  const rejectWithdrawal = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Withdrawal Rejected", description: "Funds refunded to user balance" });
    },
  });

  const distributeAutofill = useMutation({
    mutationFn: async () => {
      setIsDistributing(true);
      const res = await apiRequest("POST", "/api/admin/distribute-autofill");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
      toast({ title: "Distribution Successful", description: data.message });
      setIsDistributing(false);
    },
    onError: (error: any) => {
      toast({ title: "Distribution Failed", description: error.message, variant: "destructive" });
      setIsDistributing(false);
    }
  });

  const filteredUsers = allUsers?.filter((u: any) => 
    u.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toString() === searchTerm
  );

  if (!user) return null;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Admin Control Panel</h1>
          <p className="text-slate-500">System configuration and management</p>
        </div>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="withdrawals" className="gap-2">
            <Wallet className="w-4 h-4" /> Withdrawals
            {pendingWithdrawals && pendingWithdrawals.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingWithdrawals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="autofill" className="gap-2">Autofill</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Users</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><RefreshCw className="w-4 h-4" /> Config</TabsTrigger>
          <TabsTrigger value="deposit" className="gap-2"><Database className="w-4 h-4" /> Quick Deposit</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Withdrawal Requests</CardTitle>
              <CardDescription>Review and process user withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWithdrawals ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                          No pending withdrawal requests
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingWithdrawals?.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">#{tx.userId}</TableCell>
                          <TableCell className="text-red-600 font-bold">${Math.abs(parseFloat(tx.amount)).toFixed(2)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{tx.description}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => approveWithdrawal.mutate(tx.id)}
                              disabled={approveWithdrawal.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => rejectWithdrawal.mutate(tx.id)}
                              disabled={rejectWithdrawal.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autofill">
          <Card className="border-green-100 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-green-800">Global Autofill Pool</CardTitle>
              <CardDescription>Current balance ready for distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-display font-bold text-green-700">
                ${config?.autofillPool ? parseFloat(config.autofillPool).toFixed(2) : "0.00"}
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => distributeAutofill.mutate()}
                disabled={isDistributing || (config?.autofillPool && parseFloat(config.autofillPool) <= 0)}
              >
                {isDistributing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Distribute to Eligible Users
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Modify user balances and package levels</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search address or ID..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Referrals</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs">#{u.id}</TableCell>
                        <TableCell className="font-mono text-xs">{u.walletAddress.slice(0, 6)}...{u.walletAddress.slice(-4)}</TableCell>
                        <TableCell className="font-bold">${parseFloat(u.balance).toFixed(2)}</TableCell>
                        <TableCell>Lvl {u.packageLevel}</TableCell>
                        <TableCell>{u.directReferrals}</TableCell>
                        <TableCell className="text-right">
                          <Dialog open={selectedUser?.id === u.id} onOpenChange={(open) => !open && setSelectedUser(null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(u)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit User #{u.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Balance ($)</label>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    defaultValue={u.balance} 
                                    id={`edit-bal-${u.id}`}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Package Level (0-12)</label>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    max="12"
                                    defaultValue={u.packageLevel} 
                                    id={`edit-level-${u.id}`}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                                <Button onClick={() => {
                                  const bal = (document.getElementById(`edit-bal-${u.id}`) as HTMLInputElement).value;
                                  const level = (document.getElementById(`edit-level-${u.id}`) as HTMLInputElement).value;
                                  updateUserMutation.mutate({ 
                                    id: u.id, 
                                    updates: { 
                                      balance: bal,
                                      packageLevel: parseInt(level) || 0,
                                    } 
                                  });
                                }}>Save Changes</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Global platform settings</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConfig ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Admin Wallet Address</label>
                      <div className="flex gap-2">
                        <Input 
                          id="admin-wallet-input"
                          defaultValue={config.adminWallet}
                          className="bg-slate-50 font-mono text-xs" 
                        />
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const val = (document.getElementById("admin-wallet-input") as HTMLInputElement).value;
                            updateConfigMutation.mutate({ adminWallet: val });
                          }}
                        >
                          Update
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-500">Central admin wallet for permissions.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Company Deposit Wallet</label>
                      <div className="flex gap-2">
                        <Input 
                          id="deposit-wallet-input"
                          defaultValue={config.depositWallet}
                          className="bg-slate-50 font-mono text-xs" 
                        />
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const val = (document.getElementById("deposit-wallet-input") as HTMLInputElement).value;
                            updateConfigMutation.mutate({ depositWallet: val });
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Company Withdrawal Wallet</label>
                      <div className="flex gap-2">
                        <Input 
                          id="withdrawal-wallet-input"
                          defaultValue={config.withdrawalWallet}
                          className="bg-slate-50 font-mono text-xs" 
                        />
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const val = (document.getElementById("withdrawal-wallet-input") as HTMLInputElement).value;
                            updateConfigMutation.mutate({ withdrawalWallet: val });
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Withdrawal Min Days</label>
                      <Input 
                        type="number"
                        defaultValue={config.withdrawalMinDays}
                        onBlur={(e) => updateConfigMutation.mutate({ withdrawalMinDays: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Max Trades Before Referral Mandatory</label>
                      <Input 
                        type="number"
                        defaultValue={config.maxTradesBeforeReferral}
                        onBlur={(e) => updateConfigMutation.mutate({ maxTradesBeforeReferral: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Referral Interval (Trades per Referral)</label>
                      <Input 
                        type="number"
                        defaultValue={config.referralInterval}
                        onBlur={(e) => updateConfigMutation.mutate({ referralInterval: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Package Config (JSON)</label>
                    <textarea
                      className="w-full h-64 p-4 font-mono text-sm bg-slate-50 rounded-md border"
                      defaultValue={JSON.stringify(JSON.parse(config.packages), null, 2)}
                      onBlur={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateConfigMutation.mutate({ packages: parsed });
                        } catch (err) {
                          toast({ variant: "destructive", title: "Invalid JSON" });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposit">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-primary h-5 w-5" />
                <CardTitle>Quick Manual Deposit</CardTitle>
              </div>
              <CardDescription>Instant credit to user account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Wallet Address</label>
                  <Input id="admin-deposit-wallet" placeholder="0x..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ($)</label>
                  <Input id="admin-deposit-amount" type="number" placeholder="Enter amount" />
                </div>
              </div>
              <Button 
                className="w-full h-12"
                onClick={() => {
                  const wallet = document.getElementById("admin-deposit-wallet") as HTMLInputElement;
                  const amt = document.getElementById("admin-deposit-amount") as HTMLInputElement;
                  if (wallet.value && amt.value) {
                    depositMutation.mutate({ walletAddress: wallet.value.trim(), amount: parseFloat(amt.value) });
                    wallet.value = "";
                    amt.value = "";
                  }
                }}
              >
                Confirm Deposit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
