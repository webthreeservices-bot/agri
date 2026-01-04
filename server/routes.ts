import { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { BuyLotRequest, WithdrawRequest } from "@shared/schema";
import { ZodError } from "zod";
import { log } from "./index";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Health check endpoint for Render
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    const config = await storage.getSystemConfig();
    if (req.user!.walletAddress.toLowerCase() !== config.adminWallet.toLowerCase()) {
      return res.status(403).send("Admin access required");
    }
    next();
  }

  app.get("/api/trading/lots", requireAuth, async (req, res) => {
    const lots = await storage.getUserLots(req.user!.id);
    res.json(lots);
  });

  app.get("/api/transactions", requireAuth, async (req, res) => {
    const txs = await storage.getUserTransactions(req.user!.id);
    res.json(txs);
  });

  app.post("/api/trading/buy", requireAuth, async (req, res) => {
    const user = req.user!;
    const { type } = req.body as BuyLotRequest;

    if (user.packageLevel === 0) return res.status(400).json({ message: "Activate a package first" });

    const config = await storage.getSystemConfig();
    const packages = JSON.parse(config.packages);
    const pkg = packages.find((p: any) => p.level === user.packageLevel);
    const price = pkg.lots[type - 1];

    // Check trade limits and referral requirements
    const totalTrades = user.totalLotsBought;
    if (totalTrades >= config.maxTradesBeforeReferral) {
      const requiredReferrals = Math.floor((totalTrades - config.maxTradesBeforeReferral) / config.referralInterval) + 1;
      if (user.directReferrals < requiredReferrals) {
        return res.status(400).json({
          message: `Referral required! You need ${requiredReferrals} direct referrals to continue trading after ${config.maxTradesBeforeReferral} trades (1 referral per ${config.referralInterval} trades).`
        });
      }
    }

    if (parseFloat(user.balance) < price) return res.status(400).json({ message: "Insufficient balance" });

    // Check daily limit
    const today = new Date().toDateString();
    const lastBuyDate = user.lastBuyDate ? new Date(user.lastBuyDate).toDateString() : null;
    let dailyBuy = lastBuyDate === today ? parseFloat(user.dailyBuyAmount) : 0;

    if (dailyBuy + price > pkg.limit) return res.status(400).json({ message: "Daily buy limit reached" });

    // 1. Deduct balance and update daily limit
    const newBal = parseFloat(user.balance) - price;
    await storage.updateUser(user.id, {
      balance: newBal.toString(),
      dailyBuyAmount: (dailyBuy + price).toString(),
      lastBuyDate: new Date(),
      totalLotsBought: user.totalLotsBought + 1,
      consecutiveTradeDays: lastBuyDate !== today ? user.consecutiveTradeDays + 1 : user.consecutiveTradeDays
    });

    // 2. 5% Autofill pool deduction
    const autofillAmt = price * 0.05;
    await storage.addToAutofillPool(autofillAmt.toString());

    // 3. Create lot
    const sellPrice = (price * 1.3).toString();
    const lot = await storage.createLot(user.id, type, price.toString(), sellPrice, user.packageLevel);

    // 4. Create transaction
    await storage.createTransaction({
      userId: user.id,
      type: "buy_lot",
      amount: (-price).toString(),
      description: `Bought Lot ${type} (${user.packageLevel})`
    });

    // 5. Check if matching is triggered (FIFO)
    // For every 2 lots of type X, one lot of type X is sold
    if (type === 1) {
      const totalBuys = await storage.incrementLot1Buys();
      if (totalBuys % 2 === 0) {
        const oldest = await storage.getOldestActiveLot(1);
        if (oldest) {
          // Sell the oldest lot
          await storage.updateLotStatus(oldest.id, "sold");
          const seller = await storage.getUser(oldest.userId);
          if (seller) {
            const reward = parseFloat(oldest.sellPrice);
            await storage.updateUser(seller.id, { balance: (parseFloat(seller.balance) + reward).toString() });
            await storage.createTransaction({
              userId: seller.id,
              type: "sell_reward",
              amount: reward.toString(),
              description: `Lot 1 Sold`
            });
          }
        }
      }
    }

    res.json({ lot, balance: newBal });
  });

  app.post("/api/trading/upgrade", requireAuth, async (req, res) => {
    const user = req.user!;
    const config = await storage.getSystemConfig();
    const packages = JSON.parse(config.packages);
    const nextLevel = user.packageLevel + 1;
    const pkg = packages.find((p: any) => p.level === nextLevel);

    if (!pkg) return res.status(400).json({ message: "Max level reached" });
    if (parseFloat(user.balance) < pkg.activation) return res.status(400).json({ message: "Insufficient balance" });

    const newBal = parseFloat(user.balance) - pkg.activation;
    await storage.updateUser(user.id, {
      balance: newBal.toString(),
      packageLevel: nextLevel,
      totalLotsBought: 0 // Reset for new level cycle
    });

    await storage.createTransaction({
      userId: user.id,
      type: "upgrade",
      amount: (-pkg.activation).toString(),
      description: `Upgraded to Level ${nextLevel}`
    });

    res.json({ level: nextLevel, balance: newBal });
  });

  app.post("/api/transactions/withdraw", requireAuth, async (req, res) => {
    const { amount, address } = req.body as WithdrawRequest;
    const user = req.user!;

    if (parseFloat(user.balance) < amount) return res.status(400).json({ message: "Insufficient balance" });
    if (user.consecutiveTradeDays < 2) return res.status(400).json({ message: "Minimum 2 consecutive trade days required" });

    const newBal = parseFloat(user.balance) - amount;
    await storage.updateUser(user.id, {
      balance: newBal.toString(),
      lastWithdrawalAt: new Date()
    });

    await storage.createTransaction({
      userId: user.id,
      type: "withdraw",
      amount: (-amount).toString(),
      status: "pending",
      description: `Withdrawal request to ${address}`
    });

    res.json({ message: "Withdrawal request submitted for approval" });
  });

  app.post("/api/transactions/deposit", requireAdmin, async (req, res) => {
    const { walletAddress, amount, txHash } = req.body;
    const targetUser = await storage.getUserByWallet(walletAddress);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const newBal = parseFloat(targetUser.balance) + amount;
    await storage.updateUser(targetUser.id, { balance: newBal.toString() });

    await storage.createTransaction({
      userId: targetUser.id,
      type: "deposit",
      amount: amount.toString(),
      txHash,
      description: "External USDT Deposit"
    });

    res.json({ balance: newBal });
  });

  // Admin Withdrawal Management
  app.get("/api/admin/withdrawals/pending", requireAdmin, async (req, res) => {
    const withdrawals = await storage.getPendingWithdrawals();
    res.json(withdrawals);
  });

  app.post("/api/admin/withdrawals/:id/approve", requireAdmin, async (req, res) => {
    const txId = parseInt(req.params.id);
    const tx = await storage.updateTransactionStatus(txId, "completed");
    res.json({ message: "Withdrawal approved", tx });
  });

  app.post("/api/admin/withdrawals/:id/reject", requireAdmin, async (req, res) => {
    const txId = parseInt(req.params.id);
    const tx = await storage.updateTransactionStatus(txId, "rejected");
    const user = await storage.getUser(tx.userId);
    if (user) {
      const refundAmount = Math.abs(parseFloat(tx.amount));
      await storage.updateUser(user.id, { balance: (parseFloat(user.balance) + refundAmount).toString() });
    }
    res.json({ message: "Withdrawal rejected and funds refunded", tx });
  });

  // Admin Routes
  app.get("/api/admin/config", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getSystemConfig();
      res.json(config);
    } catch (error: any) {
      console.error(`Admin config fetch error: ${error.message}`);
      res.status(500).json({ message: "Failed to fetch system config" });
    }
  });

  app.post("/api/admin/config", requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      if (updates.packages && typeof updates.packages !== 'string') {
        updates.packages = JSON.stringify(updates.packages);
      }
      if (updates.referralRewards && typeof updates.referralRewards !== 'string') {
        updates.referralRewards = JSON.stringify(updates.referralRewards);
      }
      if (updates.referralRequirements && typeof updates.referralRequirements !== 'string') {
        updates.referralRequirements = JSON.stringify(updates.referralRequirements);
      }

      const config = await storage.updateSystemConfig(updates);
      res.json(config);
    } catch (error: any) {
      console.error(`Admin config update error: ${error.message}`);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.updateUser(id, req.body);
    res.json(user);
  });

  app.post("/api/admin/distribute-autofill", requireAdmin, async (req, res) => {
    const state = await storage.getGlobalState();
    const poolAmt = parseFloat(state.autofillPool);

    if (poolAmt <= 0) return res.status(400).json({ message: "Autofill pool is empty" });

    const eligibleUsers = await storage.getEligibleAutofillUsers();
    if (eligibleUsers.length === 0) return res.status(400).json({ message: "No eligible users (5+ referrals)" });

    const perUserAmt = poolAmt / eligibleUsers.length;

    for (const user of eligibleUsers) {
      const newWallet = parseFloat(user.upgradePackageWallet) + perUserAmt;
      await storage.updateUser(user.id, { upgradePackageWallet: newWallet.toString() });
      await storage.createTransaction({
        userId: user.id,
        type: "referral_reward",
        amount: perUserAmt.toString(),
        description: "Monthly Global Autofill Distribution"
      });
    }

    await storage.resetAutofillPool();
    await storage.createAutofillDistribution(poolAmt.toString(), eligibleUsers.length);

    res.json({ message: `Distributed $${poolAmt.toFixed(2)} to ${eligibleUsers.length} users` });
  });

  const httpServer = createServer(app);
  return httpServer;
}
