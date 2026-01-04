import { Transaction } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Repeat, ShoppingCart, Star } from "lucide-react";

const typeIcons: Record<string, any> = {
  deposit: ArrowDownLeft,
  withdraw: ArrowUpRight,
  buy_lot: ShoppingCart,
  sell_reward: Repeat,
  referral_reward: Star,
  upgrade: Star,
};

const typeLabels: Record<string, string> = {
  deposit: "Deposit",
  withdraw: "Withdrawal",
  buy_lot: "Lot Purchase",
  sell_reward: "Lot Sale Reward",
  referral_reward: "Referral Bonus",
  upgrade: "Package Upgrade",
};

const typeColors: Record<string, string> = {
  deposit: "text-green-600 bg-green-50",
  withdraw: "text-orange-600 bg-orange-50",
  buy_lot: "text-blue-600 bg-blue-50",
  sell_reward: "text-purple-600 bg-purple-50",
  referral_reward: "text-yellow-600 bg-yellow-50",
  upgrade: "text-pink-600 bg-pink-50",
};

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-white rounded-2xl border border-slate-100">
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const Icon = typeIcons[tx.type] || Repeat;
            const isPositive = ['deposit', 'sell_reward', 'referral_reward'].includes(tx.type);
            
            return (
              <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeColors[tx.type] || 'bg-slate-100'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{typeLabels[tx.type] || tx.type}</div>
                      <div className="text-xs text-muted-foreground">{tx.description}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`font-mono font-medium ${isPositive ? 'text-green-600' : 'text-slate-900'}`}>
                    {isPositive ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(tx.createdAt!), 'MMM d, h:mm a')}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Completed
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
