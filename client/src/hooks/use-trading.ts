import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type BuyLotRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/queryClient";

export function useTrading() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const lotsQuery = useQuery({
    queryKey: [api.trading.getLots.path],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}${api.trading.getLots.path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch lots");
      return api.trading.getLots.responses[200].parse(await res.json());
    },
  });

  const buyLotMutation = useMutation({
    mutationFn: async (data: BuyLotRequest) => {
      const res = await fetch(`${API_BASE_URL}${api.trading.buyLot.path}`, {
        method: api.trading.buyLot.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.trading.buyLot.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to buy lot");
      }
      return api.trading.buyLot.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.trading.getLots.path] });
      queryClient.invalidateQueries({ queryKey: [api.trading.getQueueCounts.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });

      toast({
        title: "Purchase Successful!",
        description: data.message,
        className: "bg-green-500 text-white border-none",
      });

      if (data.soldLot) {
        toast({
          title: "Lot Sold!",
          description: `You just sold a lot for profit! Balance updated.`,
          className: "bg-accent text-white border-none mt-2",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}${api.trading.upgrade.path}`, {
        method: api.trading.upgrade.method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.trading.upgrade.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to upgrade");
      }
      return api.trading.upgrade.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({
        title: "Upgrade Successful!",
        description: data.message,
        className: "bg-purple-600 text-white border-none",
      });
    },
    onError: (error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    activeLots: lotsQuery.data,
    isLoadingLots: lotsQuery.isLoading,
    buyLot: buyLotMutation.mutate,
    isBuying: buyLotMutation.isPending,
    upgrade: upgradeMutation.mutate,
    isUpgrading: upgradeMutation.isPending,
  };
}
