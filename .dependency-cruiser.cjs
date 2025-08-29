// Dependency-Cruiser configuration for Effect Native packages
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
      comment: "Disallow circular dependencies",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
}

