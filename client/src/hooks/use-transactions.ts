import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type WithdrawRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useTransactions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const transactionsQuery = useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawRequest) => {
      const res = await fetch(api.transactions.withdraw.path, {
        method: api.transactions.withdraw.method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.transactions.withdraw.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to withdraw");
      }
      return api.transactions.withdraw.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({
        title: "Withdrawal Initiated",
        description: "Your funds are on the way!",
      });
    },
    onError: (error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async (data: { userId: number, amount: number }) => {
      const res = await fetch(api.transactions.deposit.path, {
        method: api.transactions.deposit.method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Deposit failed");
      return api.transactions.deposit.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: "Deposit Simulated" });
    }
  });

  return {
    transactions: transactionsQuery.data,
    isLoadingTransactions: transactionsQuery.isLoading,
    withdraw: withdrawMutation.mutate,
    isWithdrawing: withdrawMutation.isPending,
    deposit: depositMutation.mutate, // Dev only
  };
}
