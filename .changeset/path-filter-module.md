---
"effect": minor
---

Add the unstable `PathFilter` module, make `FileSystem.glob` take a single `PathFilter.Input` instead of a pattern and options, and add experimental `IgnoreFile` parsers that build `PathFilter`s from `.gitignore` and `.dockerignore` sources.

### Breaking changes

`FileSystem.glob(input, { root })` finds the paths a `PathFilter` keeps. A string is still a glob pattern, a `!` string excludes paths, and `PathFilter.select` and `PathFilter.restrict` cover the rest. The `dot` and `exclude` options are removed:

| Before                                      | After                                                |
| ------------------------------------------- | ---------------------------------------------------- |
| `fs.glob("**/*.ts")`                        | unchanged                                            |
| `fs.glob(p, { dot: true })`                 | `fs.glob(PathFilter.select(p, { dot: true }))`       |
| `fs.glob(p, { exclude: ["**/*.test.ts"] })` | `fs.glob([p, "!**/*.test.ts"])`                      |
| `fs.glob("../a/*.ts", { root })`            | `fs.glob("*.ts", { root: path.join(root, "../a") })` |
| `fs.glob(".")`                              | `fs.exists(root)`                                    |

To leave out what an ignore file ignores, restrict the selection: `fs.glob(PathFilter.restrict(p, IgnoreFile.gitignore(source)))`.

- A single absolute pattern such as `fs.glob("/abs/dir/**")` works as before: it ignores `root`, returns absolute paths and includes `/abs/dir` itself. Absolute patterns are not accepted anywhere else (in a list, after `!`, in `PathFilter.select` or `PathFilter.restrict`), so `fs.glob("/abs/dir/**", { dot: true })` has no direct replacement; use `fs.glob(PathFilter.select("**", { dot: true }), { root: "/abs/dir" })`, whose results are relative.
- Other results are relative to `root`, and `root` itself is never a result, so a pattern prefix moved into `root` no longer returns that directory.
- A `..` segment, an escaped `/` or a UNC path in a pattern makes the effect die.
- A directory-only pattern such as `link/` no longer matches a link to a directory.
