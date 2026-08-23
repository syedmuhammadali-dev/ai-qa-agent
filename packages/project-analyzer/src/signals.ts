import type { SignalCategory } from "./types.ts";

interface DepSignal {
  category: SignalCategory;
  name: string;
}

// Maps an npm package name to what its presence in dependencies/devDependencies
// tells us. Deliberately not exhaustive — see fixtures/sample-projects for what's
// verified, and extend this table (with a fixture) rather than guessing.
export const DEPENDENCY_SIGNALS: Record<string, DepSignal> = {
  next: { category: "framework", name: "Next.js" },
  "react-scripts": { category: "framework", name: "Create React App" },
  vite: { category: "framework", name: "Vite" },
  vue: { category: "framework", name: "Vue" },
  nuxt: { category: "framework", name: "Nuxt" },
  "@sveltejs/kit": { category: "framework", name: "SvelteKit" },
  express: { category: "framework", name: "Express" },
  fastify: { category: "framework", name: "Fastify" },
  "@nestjs/core": { category: "framework", name: "NestJS" },
  koa: { category: "framework", name: "Koa" },
  hapi: { category: "framework", name: "Hapi" },

  vitest: { category: "testFramework", name: "Vitest" },
  jest: { category: "testFramework", name: "Jest" },
  "@playwright/test": { category: "testFramework", name: "Playwright" },
  cypress: { category: "testFramework", name: "Cypress" },
  "@testing-library/react": { category: "testFramework", name: "Testing Library" },
  mocha: { category: "testFramework", name: "Mocha" },
  supertest: { category: "testFramework", name: "Supertest" },

  prisma: { category: "orm", name: "Prisma" },
  "@prisma/client": { category: "orm", name: "Prisma" },
  mongoose: { category: "orm", name: "Mongoose" },
  sequelize: { category: "orm", name: "Sequelize" },
  "drizzle-orm": { category: "orm", name: "Drizzle" },
  typeorm: { category: "orm", name: "TypeORM" },

  pg: { category: "database", name: "PostgreSQL" },
  mysql2: { category: "database", name: "MySQL" },
  mysql: { category: "database", name: "MySQL" },
  mongodb: { category: "database", name: "MongoDB" },
  sqlite3: { category: "database", name: "SQLite" },
  "better-sqlite3": { category: "database", name: "SQLite" },
  redis: { category: "database", name: "Redis" },
  ioredis: { category: "database", name: "Redis" },

  "next-auth": { category: "auth", name: "NextAuth" },
  firebase: { category: "auth", name: "Firebase Auth" },
  "firebase-admin": { category: "auth", name: "Firebase Auth" },
  passport: { category: "auth", name: "Passport" },
  jsonwebtoken: { category: "auth", name: "JWT" },
  "@clerk/nextjs": { category: "auth", name: "Clerk" },
  "@supabase/supabase-js": { category: "auth", name: "Supabase Auth" },

  eslint: { category: "linting", name: "ESLint" },
  prettier: { category: "linting", name: "Prettier" },

  "@sentry/node": { category: "observability", name: "Sentry" },
  "@sentry/react": { category: "observability", name: "Sentry" },
  "@sentry/nextjs": { category: "observability", name: "Sentry" },
  "@opentelemetry/api": { category: "observability", name: "OpenTelemetry" },
};

export const LOCKFILE_PACKAGE_MANAGERS: Record<string, string> = {
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
  "package-lock.json": "npm",
};

export const DEPLOYMENT_FILES: Record<string, string> = {
  "vercel.json": "Vercel",
  "netlify.toml": "Netlify",
  Dockerfile: "Docker",
  "fly.toml": "Fly.io",
};
