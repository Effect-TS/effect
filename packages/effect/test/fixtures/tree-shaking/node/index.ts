/**
 * The implementations' namespace: one module per operation, re-exported, so a
 * root that reads two members off `import * as Node` bundles two modules.
 */
export * from "./readFile.ts"
export * from "./stat.ts"
export * from "./writeFile.ts"
