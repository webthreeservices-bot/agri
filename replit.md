# AgriTrade - Centralized Crypto Trading Platform

## Overview

AgriTrade is a centralized Web2 cryptocurrency trading platform built with a React frontend and Express backend. The platform enables users to trade USDT BEP20 through a tiered package system with 12 upgradeable levels. Users purchase "lots" at various price points, and the system automatically matches buyers and sellers through global FIFO queues, distributing 30% rewards on successful sales. The platform includes wallet-based authentication via MetaMask, a referral system with sponsor requirements, and comprehensive transaction tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions
- **Wallet Integration**: ethers.js for MetaMask wallet connection and message signing

The frontend follows a pages-based structure with protected routes. Authentication state is managed through localStorage tokens and React Query. Components are organized into UI primitives (shadcn/ui), feature components, and page components.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with Zod schema validation
- **Session Management**: In-memory token-to-userId mapping (designed for JWT/cookie replacement in production)

The backend uses a clean separation between routes, storage layer, and database access. The storage interface pattern allows for easy swapping of data persistence implementations.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit with `db:push` for schema synchronization
- **Tables**: users, lots, transactions, globalState

Key design decisions:
- Numeric precision (20,2) for all monetary values to handle USDT amounts
- Global state table tracks lot1 buy counts for trigger mechanics
- Lots use FIFO ordering via timestamps for queue matching

### Authentication
- Wallet-based authentication using MetaMask signature verification
- Users sign a message with their wallet, backend verifies the signature using ethers.js
- Demo login available for development/testing
- Sponsor wallet address required for new user registration

### Trading System
The core trading mechanics involve:
- 12 package levels with escalating activation costs and lot prices
- 4 lot types per package with increasing prices (1.5x multiplier pattern)
- Global FIFO queues per lot type for cross-package matching
- Automatic sell triggers when specific lot types are purchased
- 30% reward on all lot sales (buyPrice × 1.3)
- Daily buy limits and 120 total lots per package before mandatory upgrade

## External Dependencies

### Blockchain Integration
- **ethers.js**: BEP20 USDT on Binance Smart Chain for deposits/withdrawals
- **MetaMask**: Primary wallet connector for user authentication

### Database
- **PostgreSQL**: Primary data store (requires DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: Session storage (available but sessions currently in-memory)

### UI Components
- **Radix UI**: Primitive components for accessibility (dialogs, dropdowns, etc.)
- **shadcn/ui**: Pre-built component patterns
- **Lucide React**: Icon library
- **date-fns**: Date formatting utilities

### Build Tools
- **Vite**: Frontend development server and build tool
- **esbuild**: Server-side bundling for production
- **tsx**: TypeScript execution for development