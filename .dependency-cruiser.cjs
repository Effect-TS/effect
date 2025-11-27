// Dependency-Cruiser configuration for Effect Native packages
// 
// Note: Effect packages use a pattern where public modules re-export from internal,
// and internal modules use `import type` from public for type definitions.
// This creates "circular" imports at the module level, but they are safe because:
// 1. Internal → Public is type-only (no runtime dependency)
// 2. Public → Internal is runtime (for implementation)
// 
// Unfortunately, dependency-cruiser's `dependencyTypesNot: ["type-only"]` doesn't
// work with `circular: true` (see https://github.com/sverweij/dependency-cruiser/issues/695)
// 
// As a workaround, we use `viaNot` to exclude cycles that go through internal modules.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    doNotFollow: {
      path: ["node_modules"],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".mjs"],
    },
    reporterOptions: {
      dot: { collapsePattern: "node_modules" },
    },
  },
  forbidden: [
    {
      name: "no-circular",
      comment: "Disallow circular dependencies (excluding Effect-style public↔internal patterns)",
      severity: "error",
      from: {},
      to: {
        circular: true,
        // Exclude cycles that involve internal modules using type-only imports back to public
        // This is the standard Effect pattern for service definitions
        viaNot: "internal",
      },
    },
  ],
}

