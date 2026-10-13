// Where the workspace and its projects are. A project is a directory with an `etest.config.ts`;
// a test file belongs to the nearest one above it. The workspace root is the outermost one from
// the working directory upwards, stopping at the repository root (a directory with `.git`):
// every run anchors there, wherever it starts, so it resolves the same options for a test.
// Without any config, the working directory is the root. Dependency-free on purpose: the
// launcher (bin.ts) uses it to find a running server before loading anything heavy.
import * as fs from "node:fs"
import * as path from "node:path"

export const CONFIG_FILE = "etest.config.ts"

/** The directories from `dir` upwards, stopping at the repository root (included) or the filesystem root. */
const upwards = function*(dir: string) {
  for (let d = path.resolve(dir);;) {
    yield d
    const parent = path.dirname(d)
    if (fs.existsSync(path.join(d, ".git")) || parent === d) return
    d = parent
  }
}

/** The outermost `etest.config.ts` from `cwd` upwards, stopping at the repository root. */
export const findConfig = (cwd: string): string | undefined => {
  let outermost: string | undefined
  for (const dir of upwards(cwd)) {
    const candidate = path.join(dir, CONFIG_FILE)
    if (fs.existsSync(candidate)) outermost = candidate
  }
  return outermost
}

/** The workspace root: the config's directory, or `cwd` when there is no config. */
export const rootOf = (config: string | undefined, cwd: string): string =>
  config !== undefined ? path.dirname(path.resolve(config)) : path.resolve(cwd)

/** Whether `dir` is a project root: a directory with its own `etest.config.ts`. */
export const hasConfig = (dir: string): boolean => fs.existsSync(path.join(dir, CONFIG_FILE))

/** Whether `p` is `dir` or inside it. */
export const isWithin = (p: string, dir: string): boolean => {
  const rel = path.relative(dir, p)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}
