// The record of failing tests, for `etest --failed`. Kept in
// `node_modules/.cache/etest/last-run.json` under the working directory and merged across
// runs: a test that ran replaces its entry (dropped if it passed), every other entry is
// kept, so running one file never forgets failures recorded for the others.
import * as fs from "node:fs"
import * as path from "node:path"
import type { TestFinished } from "../Protocol.ts"
import type { Reporter } from "../Reporters.ts"

export const location = path.join("node_modules", ".cache", "etest", "last-run.json")

export interface LastRun {
  /** failing test ids (a whole file's id when the file failed to load), with their file */
  readonly failed: { readonly [id: string]: { readonly file: string } }
}

/**
 * The record, or `undefined` when there is none (or it can't be read). Entries whose file
 * no longer exists (a deleted or renamed test file) are left out.
 */
export const read = (): LastRun | undefined => {
  try {
    const parsed = JSON.parse(fs.readFileSync(location, "utf8"))
    if (typeof parsed !== "object" || parsed === null || typeof parsed.failed !== "object") return undefined
    const failed: Record<string, { file: string }> = {}
    for (const [id, entry] of Object.entries(parsed.failed as LastRun["failed"])) {
      if (typeof entry?.file === "string" && fs.existsSync(entry.file)) failed[id] = { file: entry.file }
    }
    return { failed }
  } catch {
    return undefined
  }
}

const failing = (status: TestFinished["status"]) =>
  status === "failed" || status === "timedOut" || status === "interrupted"

/** Wraps a reporter so that, when the run ends, its outcomes are merged into the record. */
export const recording = (reporter: Reporter): Reporter => {
  const failed: Record<string, { file: string }> = { ...read()?.failed }
  const files = new Map<string, string>()
  return {
    onEvent: (e) => {
      if (e._tag === "RunPlanned") {
        for (const t of e.tests) files.set(t.id, t.file)
      } else if (e._tag === "TestFinished") {
        if (failing(e.status)) failed[e.id] = { file: files.get(e.id) ?? e.id }
        else if (e.status === "passed") delete failed[e.id]
      }
      reporter.onEvent(e)
    },
    onEnd: () => {
      try {
        fs.mkdirSync(path.dirname(location), { recursive: true })
        fs.writeFileSync(location, JSON.stringify({ failed } satisfies LastRun, null, 2) + "\n")
      } catch {
        // the record is a convenience; never fail a run because it can't be written
      }
      reporter.onEnd()
    }
  }
}
