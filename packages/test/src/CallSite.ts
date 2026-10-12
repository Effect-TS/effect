// Code frames without a transform: read the call site from the V8
// stack (Node strips types to whitespace, so line:col are exact), then read the
// source line from disk.
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import type { Location } from "./Protocol.ts"

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const FRAME = /\(?((?:file:\/\/)?\/[^():]+):(\d+):(\d+)\)?$/

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

const sources = new Map<string, Array<string>>()
const readLines = (file: string) => {
  let lines = sources.get(file)
  if (!lines) {
    try {
      lines = fs.readFileSync(file, "utf8").split("\n")
    } catch {
      lines = []
    }
    sources.set(file, lines)
  }
  return lines
}

export const codeFrame = (file: string, line: number, column: number): Array<string> => {
  const lines = readLines(file)
  if (lines.length === 0) return []
  const width = String(line).length
  const out: Array<string> = []
  if (line - 2 >= 0 && lines[line - 2].trim() !== "") {
    out.push(`  ${String(line - 1).padStart(width)} | ${lines[line - 2]}`)
  }
  out.push(`> ${String(line).padStart(width)} | ${lines[line - 1] ?? ""}`)
  out.push(`  ${" ".repeat(width)} | ${" ".repeat(Math.max(0, column - 1))}^`)
  return out
}

/** Location of the first user frame in `stack`, preferring `preferFile` when given. */
export const locationFromStack = (stack: string | undefined, preferFile?: string): Location | undefined => {
  const frames = parseStack(stack).filter((f) => isUserFrame(f.file))
  const f = (preferFile && frames.find((f) => f.file === preferFile)) || frames[0]
  if (!f) return undefined
  return { file: path.relative(process.cwd(), f.file), line: f.line, column: f.column, frame: codeFrame(f.file, f.line, f.column) }
}

/** Location of whoever called into the framework right now. */
export const callSite = (): Location | undefined => locationFromStack(new Error().stack)
