/**
 * Git Blame Parser - Runs `git blame --line-porcelain` and parses the output
 * to map file:line pairs to developer attribution data.
 *
 * @internal
 */

import * as Effect from "effect/Effect"

// ── Types ────────────────────────────────────────────────────────────────

/** @internal */
export interface BlameEntry {
  readonly commitHash: string
  readonly author: string
  readonly authorEmail: string
  readonly authorDate: number
  readonly summary: string
  readonly lineNumber: number
  readonly lineContent: string
}

/** @internal */
export type BlameMap = Map<string, BlameEntry>

// ── Git Blame Execution ──────────────────────────────────────────────────

/**
 * Run `git blame --line-porcelain` for a file and parse results.
 *
 * Returns a Map keyed by "filePath:lineNumber" with BlameEntry values.
 *
 * @internal
 */
export const blameFile = (
  filePath: string,
  repoRoot: string
): Effect.Effect<BlameMap, Error> =>
  Effect.gen(function*() {
    const path = require("node:path") as typeof import("node:path")
    const { execSync } = require("node:child_process") as typeof import("node:child_process")

    const relativePath = path.relative(repoRoot, filePath)

    const stdout = yield* Effect.try(() =>
      execSync(`git blame --line-porcelain "${relativePath}"`, {
        cwd: repoRoot,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 30_000
      })
    )

    return parseLinePorcelain(stdout, filePath)
  })

/**
 * Run `git blame` for specific line ranges in a file.
 *
 * More efficient than blaming the entire file when only a few lines are needed.
 *
 * @internal
 */
export const blameLines = (
  filePath: string,
  lines: ReadonlyArray<number>,
  repoRoot: string
): Effect.Effect<BlameMap, Error> =>
  Effect.gen(function*() {
    const path = require("node:path") as typeof import("node:path")
    const { execSync } = require("node:child_process") as typeof import("node:child_process")

    const relativePath = path.relative(repoRoot, filePath)

    // Build -L flags for each line
    const lineFlags = lines.map((l) => `-L ${l},${l}`).join(" ")

    const stdout = yield* Effect.try(() =>
      execSync(`git blame --line-porcelain ${lineFlags} "${relativePath}"`, {
        cwd: repoRoot,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30_000
      })
    )

    return parseLinePorcelain(stdout, filePath)
  })

// ── Porcelain Parser ────────────────────────────────────────────────────

/** @internal */
export const parseLinePorcelain = (output: string, filePath: string): BlameMap => {
  const map = new Map<string, BlameEntry>()
  const lines = output.split("\n")

  let i = 0
  while (i < lines.length) {
    const line = lines[i]!

    // Each block starts with a 40-char hex commit hash
    const headerMatch = line.match(/^([0-9a-f]{40})\s+(\d+)\s+(\d+)/)
    if (!headerMatch) {
      i++
      continue
    }

    const commitHash = headerMatch[1]!
    const lineNumber = parseInt(headerMatch[3]!, 10)

    let author = ""
    let authorEmail = ""
    let authorDate = 0
    let summary = ""
    let lineContent = ""

    i++
    while (i < lines.length) {
      const current = lines[i]!
      if (current.startsWith("\t")) {
        lineContent = current.slice(1)
        i++
        break
      } else if (current.startsWith("author ")) {
        author = current.slice(7)
      } else if (current.startsWith("author-mail ")) {
        authorEmail = current.slice(12).replace(/[<>]/g, "")
      } else if (current.startsWith("author-time ")) {
        authorDate = parseInt(current.slice(12), 10)
      } else if (current.startsWith("summary ")) {
        summary = current.slice(8)
      }
      i++
    }

    map.set(`${filePath}:${lineNumber}`, {
      commitHash,
      author,
      authorEmail,
      authorDate,
      summary,
      lineNumber,
      lineContent
    })
  }

  return map
}

// ── Utilities ────────────────────────────────────────────────────────────

/**
 * Auto-detect the git repository root.
 *
 * @internal
 */
export const findRepoRoot = (): Effect.Effect<string, Error> =>
  Effect.try(() => {
    const { execSync } = require("node:child_process") as typeof import("node:child_process")
    return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim()
  })
