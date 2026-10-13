// Source locations without a transform: read the call site from the V8 stack
// (Node strips types to whitespace, so line:col are exact).
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import type { Location } from "./Protocol.ts"

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const FRAME = /(?:\(|^at )((?:file:\/\/)?\/[^():]+):(\d+):(\d+)\)?$/

/** A frame is "user code" unless it is inside this framework, effect itself, or node internals. */
const isUserFrame = (file: string) =>
  !file.startsWith(SRC_DIR) && !file.includes("/packages/effect/") && !file.includes("/node_modules/")

export const parseStack = (stack: string | undefined): Array<{ file: string; line: number; column: number }> => {
  const out: Array<{ file: string; line: number; column: number }> = []
  for (const raw of (stack ?? "").split("\n")) {
    const m = raw.trim().match(FRAME)
    if (!m || !raw.trim().startsWith("at ")) continue
    const file = m[1].startsWith("file://") ? fileURLToPath(m[1]) : m[1]
    out.push({ file, line: Number(m[2]), column: Number(m[3]) })
  }
  return out
}

/** Location of the first user frame in `stack`, preferring `preferFile` when given. */
export const locationFromStack = (stack: string | undefined, preferFile?: string): Location | undefined => {
  const frames = parseStack(stack).filter((f) => isUserFrame(f.file))
  const f = (preferFile && frames.find((f) => f.file === preferFile)) || frames[0]
  if (!f) return undefined
  return { file: path.relative(process.cwd(), f.file), line: f.line, column: f.column }
}

/** Location of whoever called into the framework right now. */
export const callSite = (): Location | undefined => locationFromStack(new Error().stack)
