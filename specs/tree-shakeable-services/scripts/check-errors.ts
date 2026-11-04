/**
 * Compiles the files under `typetest/errors`, each of which must fail to
 * compile, and prints the diagnostics so they can be pasted into the spec.
 *
 *   pnpm check-errors
 *
 * The check fails if any file compiles, or if a diagnostic does not mention
 * what the file is there to demonstrate.
 */
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const project = path.join(root, "typetest", "tsconfig.json")

const expectations: Record<string, ReadonlyArray<string>> = {
  "missing-requirement.ts": [
    `Type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"' is not assignable to type 'never'`
  ],
  "forgotten-override.ts": [`Type '"effect/FileSystem/writeFile"' is not assignable to type 'never'`],
  "wrong-override.ts": [
    `Type 'string' is not assignable to type 'number'`,
    `Type '{ readonly value: number; }' is not assignable to type 'never'`
  ],
  "not-an-operation.ts": [`does not satisfy the constraint 'Signature'`],
  "not-an-effect.ts": [
    `is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'`,
    `must have a '[Symbol.iterator]()' method`
  ],
  "derived-generic.ts": [`Type 'Effect<unknown, never, "test/parse">' is not assignable to type 'string'`],
  "displayed-type.ts": [
    `Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'`,
    `Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'`,
    `Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'`
  ]
}

const tsc = spawnSync(
  process.execPath,
  [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", project, "--pretty", "false"],
  { cwd: root, encoding: "utf8" }
)
const output = tsc.stdout + tsc.stderr
console.log(output.trim())

// Group each diagnostic with its indented continuation lines, keyed by file.
const diagnosticsByFile = new Map<string, Array<string>>()
let current: string | undefined
for (const line of output.split("\n")) {
  const match = /^typetest\/errors\/([^(]+)\(/.exec(line)
  if (match) {
    current = match[1]
    diagnosticsByFile.set(current, [...(diagnosticsByFile.get(current) ?? []), line])
  } else if (current !== undefined && line.startsWith(" ")) {
    const lines = diagnosticsByFile.get(current)!
    lines[lines.length - 1] += "\n" + line
  } else {
    current = undefined
  }
}

let failures = 0
for (const file of fs.readdirSync(path.join(root, "typetest", "errors")).sort()) {
  const diagnostics = diagnosticsByFile.get(file) ?? []
  const expected = expectations[file] ?? []
  if (diagnostics.length === 0) {
    console.error(`\n${file}: compiled, but it must not`)
    failures++
    continue
  }
  for (const needle of expected) {
    if (!diagnostics.some((line) => line.includes(needle))) {
      console.error(`\n${file}: no diagnostic contains ${JSON.stringify(needle)}`)
      failures++
    }
  }
}
if (failures > 0) {
  process.exit(1)
}
console.log(`\nOK: every file under typetest/errors fails to compile for the documented reason`)
