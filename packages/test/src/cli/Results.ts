// The results cache: what every test did the last time it ran, kept in
// `node_modules/.cache/etest/results.json` under the workspace root (one file for all its
// projects, keyed by project and test id, as vitest keeps its results cache). Merged across runs:
// a test that ran replaces its entry, every other entry is kept, so running one file never
// forgets the others. `etest --failed` re-runs the entries that failed; the coordinator uses the
// rest to order a run (files with no history first, then failed ones, then the slowest).
import * as Schema from "effect/Schema"
import * as fs from "node:fs"
import * as path from "node:path"
import { testKey } from "../Coordinator.ts"
import { Status } from "../Protocol.ts"
import type { Reporter } from "../Reporters.ts"

/** Relative to the workspace root. */
export const location = path.join("node_modules", ".cache", "etest", "results.json")

export const Entry = Schema.Struct({
  /** the test's project (relative to the workspace root) and id (relative to the project) */
  project: Schema.String,
  id: Schema.String,
  /** its file, relative to the workspace root */
  file: Schema.String,
  status: Status,
  durationMs: Schema.Number
})
export type Entry = typeof Entry.Type

const Stored = Schema.Struct({
  version: Schema.Literal(1),
  /** by test key (`testKey`); a file that failed to load is recorded under the file's own key */
  tests: Schema.Record(Schema.String, Entry)
})

const decodeStored = Schema.decodeUnknownOption(Schema.fromJsonString(Stored))

/**
 * The recorded entries by test key, or `undefined` when there is no record (or it can't be
 * read or decoded). Entries whose file no longer exists (a deleted or renamed test file) are
 * left out.
 */
export const read = (root: string): ReadonlyMap<string, Entry> | undefined => {
  let text: string
  try {
    text = fs.readFileSync(path.join(root, location), "utf8")
  } catch {
    return undefined
  }
  const stored = decodeStored(text)
  if (stored._tag === "None") return undefined
  return new Map(
    Object.entries(stored.value.tests).filter(([, entry]) => fs.existsSync(path.resolve(root, entry.file)))
  )
}

export const failing = (status: Status) => status === "failed" || status === "timedOut" || status === "interrupted"

/** Wraps a reporter so that, when the run ends, its outcomes are merged into the record. */
export const recording = (
  reporter: Reporter,
  previous: ReadonlyMap<string, Entry> | undefined,
  root: string
): Reporter => {
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
        const file = path.join(root, location)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, JSON.stringify({ version: 1, tests } satisfies typeof Stored.Encoded) + "\n")
      } catch {
        // the record is a convenience; never fail a run because it can't be written
      }
      reporter.onEnd()
    }
  }
}
