import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

export const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"))

export const stableJson = (value: unknown): string => {
  const visit = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(visit)
    }
    if (input !== null && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input)
          .filter(([, entry]) => entry !== undefined)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, visit(entry)])
      )
    }
    return input
  }
  return JSON.stringify(visit(value))
}

export const fingerprint = (value: unknown): string => createHash("sha256").update(stableJson(value)).digest("hex")

export const writeJson = (path: string, value: unknown): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}
