---
name: Ratizon project stack
description: Tech stack, package locations, and run commands for the Ratizon project
type: project
---

Ratizon is a Node.js/TypeScript project (monorepo-like structure).

Root: C:/Privat/Development/Ratizon/
Backend: C:/Privat/Development/Ratizon/backend/ (Drizzle ORM, Express, PostgreSQL via pg ^8.13.1)
Scripts: C:/Privat/Development/Ratizon/scripts/ (migration scripts)

Key packages (all in ROOT node_modules, not backend/node_modules):
- tsx ^4.19.2 — TypeScript runner (no compile step needed)
- mssql — SQL Server driver (no @types/mssql — tsx ignores missing types at runtime)
- pg ^8.13.1 — PostgreSQL driver

Run migration scripts from repo root:
  npx tsx scripts/<script>.ts

TypeScript config: root tsconfig.json references ./src and ./backend sub-projects.
Backend uses ESM (type: module in backend/package.json).
Target: ES2022, module: ESNext, moduleResolution: bundler.

**Why:** Knowing where packages live avoids wasting time checking wrong node_modules dirs.
**How to apply:** Always run npx tsx from C:/Privat/Development/Ratizon (root), not from backend/.
