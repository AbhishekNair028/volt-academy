import { defineConfig } from "vitest/config";
export default defineConfig({ test: { coverage: { include: ["src/**"], thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 } } } });
