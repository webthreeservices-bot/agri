import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  sponsorAddress: text("sponsor_address"), // Required for registration
  balance: numeric("balance", { precision: 20, scale: 2 }).default("0").notNull(),
  packageLevel: integer("package_level").default(0).notNull(), // 0 = None, 1-12
  dailyBuyAmount: numeric("daily_buy_amount", { precision: 20, scale: 2 }).default("0").notNull(),
  lastBuyDate: timestamp("last_buy_date"),
  totalLotsBought: integer("total_lots_bought").default(0).notNull(), 
  directReferrals: integer("direct_referrals").default(0).notNull(),
  upgradePackageWallet: numeric("upgrade_package_wallet", { precision: 20, scale: 2 }).default("0").notNull(),
  lastWithdrawalAt: timestamp("last_withdrawal_at"),
  consecutiveTradeDays: integer("consecutive_trade_days").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: integer("type").notNull(), // 1, 2, 3, 4
  buyPrice: numeric("buy_price", { precision: 20, scale: 2 }).notNull(),
  sellPrice: numeric("sell_price", { precision: 20, scale: 2 }).notNull(), // buyPrice * 1.3
  packageLevel: integer("package_level").default(1).notNull(),
  status: text("status").notNull().default("active"), // 'active', 'sold'
  createdAt: timestamp("created_at").defaultNow(),
  soldAt: timestamp("sold_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'deposit', 'withdraw', 'buy_lot', 'sell_reward', 'upgrade', 'referral_reward'
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"), // 'pending', 'completed', 'rejected'
  description: text("description"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const globalState = pgTable("global_state", {
  id: serial("id").primaryKey(),
  totalLot1Buys: integer("total_lot1_buys").default(0).notNull(),
  autofillPool: numeric("autofill_pool", { precision: 20, scale: 2 }).default("0").notNull(),
});

export const autofillDistributions = pgTable("autofill_distributions", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  distributedAt: timestamp("distributed_at").defaultNow(),
  recipientsCount: integer("recipients_count").notNull(),
});

export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  packages: text("packages").notNull(), // JSON string of package configurations
  referralRewards: text("referral_rewards").notNull(), // JSON string of reward percentages
  referralRequirements: text("referral_requirements").notNull(), // JSON string of direct referral counts
  withdrawalMinDays: integer("withdrawal_min_days").default(2).notNull(),
  adminWallet: text("admin_wallet").default("0xb416D5C1D8a7546F5Be3FA550374868d90d79615").notNull(),
  depositWallet: text("deposit_wallet").default("0x8dc184d5dfae5dba51ea03b291f081058b4484b2").notNull(),
  withdrawalWallet: text("withdrawal_wallet").default("0xd10f1b960bd66a9cbd48380a545ab637d42ed407").notNull(),
  maxTradesBeforeReferral: integer("max_trades_before_referral").default(225).notNull(),
  referralInterval: integer("referral_interval").default(20).notNull(),
});

// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  lots: many(lots),
  transactions: many(transactions),
}));

export const lotsRelations = relations(lots, ({ one }) => ({
  user: one(users, {
    fields: [lots.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, balance: true, dailyBuyAmount: true, lastBuyDate: true, totalLotsBought: true });
export const insertLotSchema = createInsertSchema(lots).omit({ id: true, createdAt: true, soldAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lot = typeof lots.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type SystemConfig = typeof systemConfig.$inferSelect;

export type LoginRequest = {
  walletAddress: string;
  signature: string;
  sponsorAddress?: string; // Optional if logging in, required if registering
};

export type BuyLotRequest = {
  type: 1 | 2 | 3 | 4;
};

export type WithdrawRequest = {
  amount: number;
  address: string;
};

// Package Configuration Type (not in DB, just helper)
export type PackageConfig = {
  level: number;
  activation: number;
  lots: [number, number, number, number]; // Prices for Lot 1, 2, 3, 4
  limit: number;
};
