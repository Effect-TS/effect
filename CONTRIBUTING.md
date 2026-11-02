# Contributing

## Type checking

`pnpm check` type checks the whole repository with tsrs, through the `effect-tsgo tsrs` command that `@effect/tsgo` ships. It is about twice as fast as `tsc` and uses about a third of the memory. It runs the same Effect language service diagnostics.

CI does not use tsrs. It runs `pnpm check-tsc`, which is `tsc -b tsconfig.json` with the `typescript` version in `package.json`. `pnpm build`, `pnpm check-recursive` and `pnpm check-dist-types` also use `tsc`, because published output must come from the official compiler.

Two things to know:

- The packaged tsrs binary only exists for macOS (arm64 and x64), Linux glibc (x64 and arm64) and Windows x64. On Linux musl, or any other platform, use `pnpm check-tsc`.
- tsrs is built against TypeScript 7.1, and the repository's `typescript` is 7.0. The two compilers can't reuse each other's `.tsbuildinfo` files. Switching between `pnpm check` and `pnpm check-tsc` (or `pnpm build`) rebuilds every project the first time. The rebuild costs about a minute on a fast machine. This goes away once `typescript` moves to 7.1.

When `pnpm check` and `pnpm check-tsc` disagree, CI follows `pnpm check-tsc`. A tree that passes only one of them still needs fixing before it merges.
