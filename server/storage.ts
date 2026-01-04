import { db, pool } from "./db";
import { users, lots, transactions, globalState, systemConfig, autofillDistributions, type User, type InsertUser, type Lot, type Transaction, type SystemConfig } from "@shared/schema";
import { eq, sql, and, asc } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

export interface IStorage {
  sessionStore: session.Store;
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Lots
  createLot(userId: number, type: number, buyPrice: string, sellPrice: string, packageLevel: number): Promise<Lot>;
  getOldestActiveLot(type: number): Promise<Lot | undefined>;
  getOldestActiveLots(type: number, limit: number): Promise<Lot[]>;
  updateLotStatus(id: number, status: string, soldAt?: Date): Promise<Lot>;
  getUserLots(userId: number): Promise<Lot[]>;

  // Transactions
  createTransaction(tx: { userId: number, type: string, amount: string, description?: string, txHash?: string, status?: string }): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getPendingWithdrawals(): Promise<Transaction[]>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction>;

  // Global State
  getGlobalState(): Promise<{ totalLot1Buys: number, autofillPool: string }>;
  incrementLot1Buys(): Promise<number>;
  addToAutofillPool(amount: string): Promise<void>;
  resetAutofillPool(): Promise<void>;

  // Autofill Distribution
  createAutofillDistribution(amount: string, count: number): Promise<void>;
  getEligibleAutofillUsers(): Promise<User[]>;

  // System Config
  getSystemConfig(): Promise<SystemConfig>;
  updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new (connectPgSimple(session))({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user;
  }

  async createUser(insertUser: any): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      directReferrals: insertUser.directReferrals || 0,
      upgradePackageWallet: insertUser.upgradePackageWallet || "0",
      consecutiveTradeDays: insertUser.consecutiveTradeDays || 0
    }).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async createLot(userId: number, type: number, buyPrice: string, sellPrice: string, packageLevel: number): Promise<Lot> {
    const [lot] = await db.insert(lots).values({
      userId,
      type,
      buyPrice,
      sellPrice,
      packageLevel,
      status: 'active'
    }).returning();
    return lot;
  }

  async getOldestActiveLot(type: number): Promise<Lot | undefined> {
    const [lot] = await db.select()
      .from(lots)
      .where(and(eq(lots.type, type), eq(lots.status, 'active')))
      .orderBy(asc(lots.createdAt)) // FIFO
      .limit(1);
    return lot;
  }

  async getOldestActiveLots(type: number, limit: number): Promise<Lot[]> {
    return await db.select()
      .from(lots)
      .where(and(eq(lots.type, type), eq(lots.status, 'active')))
      .orderBy(asc(lots.createdAt)) // FIFO
      .limit(limit);
  }

  async updateLotStatus(id: number, status: string, soldAt?: Date): Promise<Lot> {
    const [lot] = await db.update(lots)
      .set({ status, soldAt: soldAt || new Date() })
      .where(eq(lots.id, id))
      .returning();
    return lot;
  }

  async getUserLots(userId: number): Promise<Lot[]> {
    return await db.select().from(lots).where(eq(lots.userId, userId));
  }

  async createTransaction(tx: { userId: number, type: string, amount: string, description?: string, txHash?: string, status?: string }): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(tx).returning();
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId));
  }

  async getPendingWithdrawals(): Promise<Transaction[]> {
    return await db.select().from(transactions).where(and(eq(transactions.type, 'withdraw'), eq(transactions.status, 'pending')));
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction> {
    const [tx] = await db.update(transactions).set({ status }).where(eq(transactions.id, id)).returning();
    return tx;
  }

  async getGlobalState(): Promise<{ totalLot1Buys: number, autofillPool: string, id: number }> {
    let [state] = await db.select().from(globalState).limit(1);
    if (!state) {
      [state] = await db.insert(globalState).values({ totalLot1Buys: 0, autofillPool: "0" }).returning();
    }
    return state;
  }

  async incrementLot1Buys(): Promise<number> {
    let state = await this.getGlobalState();
    const [updated] = await db.update(globalState)
      .set({ totalLot1Buys: sql`${globalState.totalLot1Buys} + 1` })
      .where(eq(globalState.id, state.id))
      .returning();
    return updated.totalLot1Buys;
  }

  async addToAutofillPool(amount: string): Promise<void> {
    const state = await this.getGlobalState();
    await db.update(globalState)
      .set({ autofillPool: sql`${globalState.autofillPool} + ${amount}` })
      .where(eq(globalState.id, state.id));
  }

  async resetAutofillPool(): Promise<void> {
    const state = await this.getGlobalState();
    await db.update(globalState)
      .set({ autofillPool: "0" })
      .where(eq(globalState.id, state.id));
  }

  async createAutofillDistribution(amount: string, count: number): Promise<void> {
    await db.insert(autofillDistributions).values({ amount, recipientsCount: count });
  }

  async getEligibleAutofillUsers(): Promise<User[]> {
    return await db.select().from(users).where(sql`${users.directReferrals} >= 5`);
  }

  async getSystemConfig(): Promise<SystemConfig> {
    let [config] = await db.select().from(systemConfig).limit(1);
    if (!config) {
      console.log("No system config found, creating defaults...");
      const defaultPackages = [
        { level: 1, activation: 20, lots: [10, 15, 22.50, 33.75], limit: 225 },
        { level: 2, activation: 50, lots: [20, 30, 45, 67.50], limit: 225 },
        { level: 3, activation: 100, lots: [30, 45, 67.50, 101.25], limit: 225 },
        { level: 4, activation: 200, lots: [40, 60, 90, 135], limit: 225 },
        { level: 5, activation: 500, lots: [50, 75, 112.50, 168.75], limit: 225 },
        { level: 6, activation: 600, lots: [60, 90, 135, 202.50], limit: 225 },
        { level: 7, activation: 800, lots: [70, 105, 157.50, 236.25], limit: 225 },
        { level: 8, activation: 1000, lots: [80, 120, 180, 270], limit: 225 },
        { level: 9, activation: 1200, lots: [90, 135, 202.50, 303.75], limit: 225 },
        { level: 10, activation: 1500, lots: [100, 150, 225, 337.50], limit: 225 },
        { level: 11, activation: 2000, lots: [110, 165, 247.50, 371.25], limit: 225 },
        { level: 12, activation: 2500, lots: [120, 180, 270, 405], limit: 225 },
      ];
      const defaultRewards = [0.06, 0.03, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01];
      const defaultRequirements = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];

      [config] = await db.insert(systemConfig).values({
        packages: JSON.stringify(defaultPackages),
        referralRewards: JSON.stringify(defaultRewards),
        referralRequirements: JSON.stringify(defaultRequirements),
        withdrawalMinDays: 2,
        adminWallet: "0xb416D5C1D8a7546F5Be3FA550374868d90d79615",
        depositWallet: "0x8dc184d5dfae5dba51ea03b291f081058b4484b2",
        withdrawalWallet: "0xd10f1b960bd66a9cbd48380a545ab637d42ed407",
        maxTradesBeforeReferral: 225,
        referralInterval: 20
      }).onConflictDoUpdate({
        target: systemConfig.id,
        set: {
          maxTradesBeforeReferral: 225,
          referralInterval: 20,
          depositWallet: "0x8dc184d5dfae5dba51ea03b291f081058b4484b2",
          withdrawalWallet: "0xd10f1b960bd66a9cbd48380a545ab637d42ed407"
        }
      }).returning();
    }
    return config;
  }

  async updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = await this.getSystemConfig();
    const [updated] = await db.update(systemConfig)
      .set(updates)
      .where(eq(systemConfig.id, config.id))
      .returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getActiveLotCountByType(type: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(lots)
      .where(and(eq(lots.type, type), eq(lots.status, 'active')));
    return result?.count || 0;
  }

  async getActiveLotCountsByAllTypes(): Promise<Record<number, number>> {
    const results = await db.select({ type: lots.type, count: sql<number>`count(*)` })
      .from(lots)
      .where(eq(lots.status, 'active'))
      .groupBy(lots.type);

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    results.forEach((r) => {
      counts[r.type] = r.count;
    });
    return counts;
  }
}

export const storage = new DatabaseStorage();
