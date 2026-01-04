import { Lot } from "@shared/schema";
import { format } from "date-fns";
import { Timer, TrendingUp } from "lucide-react";

export function ActiveLots({ lots }: { lots: Lot[] }) {
  if (lots.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Timer className="w-6 h-6 text-slate-300" />
        </div>
        <h3 className="text-sm font-medium text-slate-900">No Active Lots</h3>
        <p className="text-sm text-slate-500 mt-1">Purchase lots to start earning</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {lots.map((lot) => (
        <div key={lot.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity`}>
            <TrendingUp className="w-24 h-24 text-primary" />
          </div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary mb-1">
                LOT TYPE {lot.type}
              </span>
              <div className="text-xs text-slate-400">ID: #{lot.id}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Value</div>
              <div className="text-lg font-bold text-slate-900">
                ${parseFloat(lot.buyPrice).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-slate-50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Target Sell Price</span>
              <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                ${parseFloat(lot.sellPrice).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-slate-500">Purchased</span>
              <span className="text-slate-700 font-mono text-xs">
                {format(new Date(lot.createdAt!), 'MMM d, HH:mm')}
              </span>
            </div>
          </div>
          
          {/* Progress bar visual */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
            <div className="h-full bg-primary/50 w-1/3 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
