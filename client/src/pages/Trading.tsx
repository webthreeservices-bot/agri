import { useAuth } from "@/hooks/use-auth";
import { useTrading } from "@/hooks/use-trading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/queryClient";

interface QueueData {
  buy: number;
  sell: number;
}

const NFT_IMAGES = [
  "/lots/lot1.png",
  "/lots/lot2.png",
  "/lots/lot3.png",
  "/lots/lot4.png",
];

const getLotPrices = (level: number) => {
  const lvl = Math.max(1, level);
  const multiplier = lvl;

  return [
    { type: 1, price: 10 * multiplier },
    { type: 2, price: 15 * multiplier },
    { type: 3, price: 22.5 * multiplier },
    { type: 4, price: 33.75 * multiplier },
  ];
};

export default function Trading() {
  const { user } = useAuth();
  const { buyLot, isBuying } = useTrading();
  const [queueCounts, setQueueCounts] = useState<Record<number, QueueData>>({
    1: { buy: 0, sell: 0 },
    2: { buy: 0, sell: 0 },
    3: { buy: 0, sell: 0 },
    4: { buy: 0, sell: 0 }
  });

  const queueQuery = useQuery({
    queryKey: [api.trading.getQueueCounts.path],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}${api.trading.getQueueCounts.path}`);
      if (!res.ok) throw new Error("Failed to fetch queue counts");
      const data = await res.json();
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    if (queueQuery.data) {
      setQueueCounts({
        1: queueQuery.data['1'],
        2: queueQuery.data['2'],
        3: queueQuery.data['3'],
        4: queueQuery.data['4'],
      });
    }
  }, [queueQuery.data]);

  if (!user) return null;

  const lotOptions = getLotPrices(user.packageLevel);
  const canBuy = user.packageLevel > 0;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Trading Market</h1>
        <p className="text-slate-500">Purchase lots to enter the global auto-matching queue.</p>
      </div>

      {!canBuy && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-orange-800">Account Activation Required</h3>
            <p className="text-sm text-orange-700 mt-1">
              You must purchase a package to start trading.
              <Link href="/" className="underline ml-1 font-semibold hover:text-orange-900">Go to Dashboard</Link> to upgrade.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {lotOptions.map((lot) => (
          <div
            key={lot.type}
            className={`bg-blue-50 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 ${!canBuy ? 'opacity-50 pointer-events-none' : 'hover:shadow-lg'
              }`}
            data-testid={`card-lot-${lot.type}`}
          >
            {/* NFT Image */}
            <div className="w-32 h-32 rounded-xl overflow-hidden mb-4 bg-white border-2 border-slate-200">
              <img
                src={NFT_IMAGES[lot.type - 1]}
                alt={`Dragon NFT ${lot.type}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title */}
            <h3 className="font-bold text-slate-900 mb-2" data-testid={`text-title-lot-${lot.type}`}>Dragon NFT</h3>

            {/* Price */}
            <div className="text-3xl font-display font-bold text-slate-900 mb-6" data-testid={`text-price-${lot.type}`}>
              ${Number(lot.price).toFixed(2)}
            </div>

            {/* Buy Button */}
            <Button
              className="w-24 bg-amber-400 text-slate-900 hover:bg-amber-500 font-bold mb-3 h-10"
              onClick={() => buyLot({ type: lot.type as any })}
              disabled={isBuying || !canBuy}
              data-testid={`button-buy-lot-${lot.type}`}
            >
              {isBuying ? <Loader2 className="animate-spin w-4 h-4" /> : "Buy"}
            </Button>

            {/* Queue Count */}
            <div className="text-center">
              <p className="text-xs text-slate-600 font-medium">Global Queue</p>
              <div className="flex flex-col gap-1">
                <div className="flex justify-center items-center gap-2">
                  <span className="text-sm text-green-600 font-semibold">Buy:</span>
                  <span className="text-lg font-bold text-slate-900" data-testid={`text-queue-buy-${lot.type}`}>
                    {queueCounts[lot.type]?.buy || 0}
                  </span>
                </div>
                <div className="flex justify-center items-center gap-2">
                  <span className="text-sm text-red-600 font-semibold">Sell:</span>
                  <span className="text-lg font-bold text-slate-900" data-testid={`text-queue-sell-${lot.type}`}>
                    {queueCounts[lot.type]?.sell || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-2xl p-8 mt-12 border-2 border-blue-100">
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-4">Auto-Matching Explained</h2>
        <p className="text-slate-700 leading-relaxed">
          When you purchase a trading lot, it enters a global FIFO (First-In-First-Out) queue. Your lot is automatically sold when liquidity is available, returning your principal + 30% profit directly to your wallet balance. No manual intervention needed.
        </p>
      </div>
    </div>
  );
}
