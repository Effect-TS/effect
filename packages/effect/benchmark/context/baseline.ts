/**
 * Loads the `Context.ts` of the branch point beside this branch's, so a
 * benchmark can run both against the same `effect` runtime in one process.
 *
 * The branch point is `git merge-base HEAD origin/v4/next-minor`, or
 * `BENCH_BASELINE=<sha>`.
 */
import type * as Context from "effect/Context"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

const source = path.resolve(import.meta.dirname, "..", "..", "src")
const repo = path.resolve(source, "..", "..", "..")

export const base: string = process.env.BENCH_BASELINE ??
  execFileSync("git", ["merge-base", "HEAD", "origin/v4/next-minor"], { cwd: repo, encoding: "utf8" }).trim()

export const loadBaseline = (): Promise<typeof Context> =>
  load(execFileSync("git", ["show", `${base}:packages/effect/src/Context.ts`], { cwd: repo, encoding: "utf8" }))

/**
 * Loads a second, pristine copy of this branch's own `Context.ts`: the same
 * code as the module the runtime uses, but one that serves nothing but the
 * benchmark's own calls. The ratio of the live module over its twin is what
 * serving a whole program costs a getter, whatever the code.
 */
export const loadTwin = (): Promise<typeof Context> => load(fs.readFileSync(path.join(source, "Context.ts"), "utf8"))

const load = async (code: string): Promise<typeof Context> => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "context-copy-"))
  const file = path.join(directory, "Context.ts")
  fs.writeFileSync(file, code.replaceAll("from \"./", `from "${source.replaceAll(path.sep, "/")}/`))
  try {
    return await import(file)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}
