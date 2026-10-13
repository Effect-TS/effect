// The results cache: what every test did the last time it ran, kept in
// `node_modules/.cache/etest/results.json` under the workspace root (one file for all its
// projects, keyed by project and test id, as vitest keeps its results cache). Merged across runs:
// a test that ran replaces its entry, every other entry is kept, so running one file never
// forgets the others. `etest --failed` re-runs the entries that failed; the coordinator uses the
// rest to order a run (files with no history first, then failed ones, then the slowest).
import * as fs from "node:fs"
import * as path from "node:path"
import { testKey } from "../Coordinator.ts"
import type { Status } from "../Protocol.ts"
import type { Reporter } from "../Reporters.ts"

/** Relative to the workspace root, which is the working directory during a run. */
export const location = path.join("node_modules", ".cache", "etest", "results.json")

export interface Entry {
  /** the test's project (relative to the workspace root) and id (relative to the project) */
  readonly project: string
  readonly id: string
  /** its file, relative to the workspace root */
  readonly file: string
  readonly status: Status
  readonly durationMs: number
}

interface Stored {
  readonly version: 1
  /** by test key (`testKey`); a file that failed to load is recorded under the file's own key */
  readonly tests: { readonly [key: string]: Entry }
}

/**
 * The recorded entries by test key, or `undefined` when there is no record (or it can't be
 * read). Entries whose file no longer exists (a deleted or renamed test file) are left out.
 */
export const read = (): ReadonlyMap<string, Entry> | undefined => {
  try {
    const parsed = JSON.parse(fs.readFileSync(location, "utf8")) as Stored
    if (parsed?.version !== 1 || typeof parsed.tests !== "object" || parsed.tests === null) return undefined
    const entries = new Map<string, Entry>()
    for (const [key, entry] of Object.entries(parsed.tests)) {
      if (typeof entry?.file === "string" && fs.existsSync(entry.file)) entries.set(key, entry)
    }
    return entries
  } catch {
    return undefined
  }
}

export const failing = (status: Status) => status === "failed" || status === "timedOut" || status === "interrupted"

/** Wraps a reporter so that, when the run ends, its outcomes are merged into the record. */
export const recording = (reporter: Reporter, previous: ReadonlyMap<string, Entry> | undefined): Reporter => {
  const tests: Record<string, Entry> = Object.fromEntries(previous ?? [])
  const files = new Map<string, string>()
  return {
    onEvent: (e) => {
      if (e._tag === "RunPlanned") {
        for (const t of e.tests) files.set(testKey(t.project, t.id), t.file)
      } else if (e._tag === "TestFinished" && e.status !== "skipped") {
        // a skipped test didn't run: what it did before still holds
        const key = testKey(e.project, e.id)
        tests[key] = {
          project: e.project,
          id: e.id,
          file: files.get(key) ?? e.id,
          status: e.status,
          durationMs: e.durationMs
        }
      }
      reporter.onEvent(e)
    },
    onEnd: () => {
      try {
        fs.mkdirSync(path.dirname(location), { recursive: true })
        fs.writeFileSync(location, JSON.stringify({ version: 1, tests } satisfies Stored) + "\n")
      } catch {
        // the record is a convenience; never fail a run because it can't be written
      }
      reporter.onEnd()
    }
  }
}
