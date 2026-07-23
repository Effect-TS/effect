import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { readJson, writeJson } from "./Json.ts"
import type { ApiSnapshot } from "./Model.ts"
import { extractSnapshot, snapshotCacheKey } from "./Snapshot.ts"

interface CommandResult {
  readonly status: number | null
  readonly stdout: string
  readonly stderr: string
}

const run = (command: string, args: ReadonlyArray<string>, cwd: string): CommandResult => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  })
  if (result.error !== undefined) {
    throw result.error
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  }
}

const runChecked = (command: string, args: ReadonlyArray<string>, cwd: string): string => {
  const result = run(command, args, cwd)
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${command} ${args.join(" ")}):\n${result.stdout}${result.stderr}`.trim()
    )
  }
  return result.stdout.trim()
}

export const resolveRef = (repoRoot: string, ref: string): string =>
  runChecked("git", ["rev-parse", "--verify", `${ref}^{commit}`], repoRoot)

const enableStripInternal = (worktree: string): void => {
  const baseConfig = join(worktree, "tsconfig.base.json")
  if (!existsSync(baseConfig)) {
    return
  }
  const source = readFileSync(baseConfig, "utf8")
  if (/"stripInternal"\s*:\s*true/.test(source)) {
    return
  }
  const updated = source.replace(/("stripInternal"\s*:\s*)false/, "$1true")
  if (updated === source) {
    return
  }
  writeFileSync(baseConfig, updated)
}

const hasProductionStripInternal = (worktree: string): boolean => {
  const candidates = [
    join(worktree, "tsconfig.base.json"),
    join(worktree, "tsconfig.build.json"),
    join(worktree, "packages", "effect", "tsconfig.build.json")
  ]
  return candidates.some((path) => existsSync(path) && /"stripInternal"\s*:\s*true/.test(readFileSync(path, "utf8")))
}

const createWorktree = (repoRoot: string, parent: string, name: string, sha: string): string => {
  const path = join(parent, name)
  runChecked("git", ["worktree", "add", "--detach", path, sha], repoRoot)
  return path
}

const removeWorktree = (repoRoot: string, path: string): void => {
  const result = run("git", ["worktree", "remove", "--force", path], repoRoot)
  if (result.status !== 0) {
    process.stderr.write(result.stdout)
    process.stderr.write(result.stderr)
  }
}

const buildWorktree = (worktree: string): void => {
  enableStripInternal(worktree)
  if (!hasProductionStripInternal(worktree)) {
    throw new Error(`No production TypeScript configuration enables stripInternal in ${worktree}`)
  }
  // Native test-only dependencies in old branches may not build on the current
  // Node runtime. Declaration emission does not require dependency lifecycle scripts.
  runChecked("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], worktree)
  runChecked("pnpm", ["build"], worktree)
}

export interface PrepareSnapshotOptions {
  readonly repoRoot: string
  readonly cacheRoot: string
  readonly worktreesRoot: string
  readonly name: "base" | "head"
  readonly ref: string
  readonly sha: string
  readonly modules: ReadonlyArray<string>
}

export const prepareSnapshot = (options: PrepareSnapshotOptions): ApiSnapshot => {
  const key = snapshotCacheKey(options.sha, options.modules)
  const cachePath = join(options.cacheRoot, key, "snapshot.json")
  if (existsSync(cachePath)) {
    const cached = readJson(cachePath) as ApiSnapshot
    return { ...cached, ref: options.ref, sha: options.sha }
  }
  mkdirSync(options.worktreesRoot, { recursive: true })
  const runRoot = mkdtempSync(join(options.worktreesRoot, `${options.name}-`))
  const worktree = join(runRoot, "repo")
  let added = false
  try {
    createWorktree(options.repoRoot, runRoot, "repo", options.sha)
    added = true
    buildWorktree(worktree)
    const snapshot = extractSnapshot({
      repoRoot: worktree,
      ref: options.ref,
      sha: options.sha,
      modules: options.modules
    })
    writeJson(cachePath, snapshot)
    return snapshot
  } finally {
    if (added) {
      removeWorktree(options.repoRoot, worktree)
    }
    rmSync(runRoot, { recursive: true, force: true })
  }
}

export const writeSnapshotOutput = (path: string, snapshot: ApiSnapshot): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeJson(path, snapshot)
}
