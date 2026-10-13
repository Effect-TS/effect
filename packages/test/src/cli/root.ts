// Where a project is: the nearest `etest.config.ts` from the working directory upwards,
// stopping at the repository root (a directory with `.git`). The config's directory is the
// project root: test ids, seeds, the `--failed` record and the server socket are keyed by
// it, so running from a subdirectory gives the same ids and seeds. Without a config, the
// working directory is the root. Dependency-free on purpose: the launcher (bin.ts) uses it
// to find a running server before loading anything heavy.
import * as fs from "node:fs"
import * as path from "node:path"

export const CONFIG_FILE = "etest.config.ts"

/** The nearest `etest.config.ts` from `cwd` upwards, stopping at the repository root. */
export const findConfig = (cwd: string): string | undefined => {
  for (let dir = path.resolve(cwd);;) {
    const candidate = path.join(dir, CONFIG_FILE)
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (fs.existsSync(path.join(dir, ".git")) || parent === dir) return undefined
    dir = parent
  }
}

/** The project root: the config's directory, or `cwd` when there is no config. */
export const rootOf = (config: string | undefined, cwd: string): string =>
  config !== undefined ? path.dirname(path.resolve(config)) : path.resolve(cwd)
