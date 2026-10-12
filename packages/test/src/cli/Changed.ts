// `--changed` / `--since <ref>`: which test files are affected by the changes in the git
// working tree (and, with `--since`, on the branch since it left `ref`). A test file is
// affected when it, or any file it imports, changed. Imports are followed statically:
// relative imports and packages that resolve to source inside the repository (workspace
// packages); `node_modules` is never entered.
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as Module from "node:module"
import * as path from "node:path"

const git = (args: ReadonlyArray<string>, cwd: string): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

const lines = (output: string) => output.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)

/**
 * Absolute paths of the files changed in the working tree compared with `HEAD` (staged,
 * unstaged and untracked), plus, with `since`, those changed since the merge base with it.
 */
export const changedFiles = (cwd: string, since: string | undefined): ReadonlySet<string> => {
  const root = git(["rev-parse", "--show-toplevel"], cwd).trim()
  const names = [
    ...lines(git(["diff", "--name-only", "HEAD"], root)),
    ...lines(git(["ls-files", "--others", "--exclude-standard"], root)),
    ...(since === undefined ? [] : lines(git(["diff", "--name-only", `${since}...HEAD`], root)))
  ]
  return new Set(names.map((name) => path.join(root, name)))
}

// import / export ... from "x", import "x", import("x")
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"'\n]+)["']/g

const resolveFile = (candidate: string): string | undefined => {
  for (const file of [candidate, `${candidate}.ts`, `${candidate}.tsx`, path.join(candidate, "index.ts")]) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return fs.realpathSync(file)
  }
  // `./x.js` written for a `./x.ts` source
  if (/\.[cm]?js$/.test(candidate)) return resolveFile(candidate.replace(/\.([cm]?)js$/, ".$1ts"))
  return undefined
}

/** The local files `file` imports directly: relative imports and workspace source. */
const importsOf = (file: string, root: string): Array<string> => {
  let source: string
  try {
    source = fs.readFileSync(file, "utf8")
  } catch {
    return []
  }
  const require = Module.createRequire(file)
  const out: Array<string> = []
  for (const [, specifier] of source.matchAll(SPECIFIER)) {
    if (specifier.startsWith("node:")) continue
    let resolved: string | undefined
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      resolved = resolveFile(path.resolve(path.dirname(file), specifier))
    } else {
      try {
        resolved = fs.realpathSync(require.resolve(specifier))
      } catch {
        resolved = undefined
      }
    }
    if (
      resolved !== undefined && resolved.startsWith(root) && !resolved.includes(`${path.sep}node_modules${path.sep}`)
    ) {
      out.push(resolved)
    }
  }
  return out
}

/** The test files, out of `testFiles`, affected by `changed`. */
export const affected = (
  testFiles: ReadonlyArray<string>,
  changed: ReadonlySet<string>,
  cwd: string
): Array<string> => {
  const root = git(["rev-parse", "--show-toplevel"], cwd).trim()
  const changedReal = new Set([...changed].map((f) => (fs.existsSync(f) ? fs.realpathSync(f) : f)))
  const imports = new Map<string, Array<string>>()
  const importsCached = (file: string) => {
    let found = imports.get(file)
    if (found === undefined) imports.set(file, found = importsOf(file, root))
    return found
  }
  // a search over each test file's imports (cycles are fine: every file is visited once)
  const reachesChange = (start: string): boolean => {
    const seen = new Set([start])
    const queue = [start]
    while (queue.length > 0) {
      const file = queue.pop()!
      if (changedReal.has(file)) return true
      for (const next of importsCached(file)) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    return false
  }
  return testFiles.filter((file) => reachesChange(fs.realpathSync(file)))
}
