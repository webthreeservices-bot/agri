import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { ethers } from "ethers";

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "agritrade-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  };

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "walletAddress", passwordField: "signature" },
      async (walletAddress, signature, done) => {
        try {
          const user = await storage.getUserByWallet(walletAddress);
          if (!user) return done(null, false, { message: "User not found" });

          // Signature verification logic
          const message = "Login to AgriTrade";
          const recoveredAddress = ethers.verifyMessage(message, signature);

          if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return done(null, false, { message: "Invalid signature" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json(info);
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({ user, token: req.sessionID });
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { walletAddress, signature, sponsorAddress } = req.body;

      const existingUser = await storage.getUserByWallet(walletAddress);
      if (existingUser) return res.status(400).json({ message: "User already exists" });

      // Verify signature for registration
      const message = "Login to AgriTrade";
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(400).json({ message: "Invalid signature" });
      }

      const user = await storage.createUser({
        walletAddress,
        sponsorAddress: sponsorAddress || "0x0000000000000000000000000000000000000000",
        balance: "0",
        packageLevel: 0,
        dailyBuyAmount: "0",
        totalLotsBought: 0,
        directReferrals: 0,
        upgradePackageWallet: "0",
        consecutiveTradeDays: 0
      });

      // Update sponsor referral count
      const sponsor = await storage.getUserByWallet(sponsorAddress);
      if (sponsor) {
        await storage.updateUser(sponsor.id, { directReferrals: sponsor.directReferrals + 1 });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ user, token: req.sessionID });
      });
    } catch (err) {
      next(err);
    }
  });



  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.get("/api/user/me", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
