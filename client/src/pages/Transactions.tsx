import { useTransactions } from "@/hooks/use-transactions";
import { TransactionsTable } from "@/components/TransactionsTable";
import { Loader2 } from "lucide-react";

export default function TransactionsPage() {
  const { transactions, isLoadingTransactions } = useTransactions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Transaction History</h1>
        <p className="text-slate-500">View all your deposits, withdrawals, and trading rewards.</p>
      </div>

      {isLoadingTransactions ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin w-8 h-8 text-primary" />
        </div>
      ) : (
        <TransactionsTable transactions={transactions || []} />
      )}
    </div>
  );
}
