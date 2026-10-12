#!/usr/bin/env node
// Turns on Node's on-disk compile cache before anything heavy is loaded, so repeat runs skip
// compiling (and type-stripping) every module again, then starts the CLI. The cache roughly
// halves startup; where `enableCompileCache` doesn't exist (Bun, Deno) it is skipped.
import * as Module from "node:module"

if (typeof Module.enableCompileCache === "function") Module.enableCompileCache()

await import("./main.ts")
