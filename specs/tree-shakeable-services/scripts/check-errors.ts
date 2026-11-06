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
  "not-an-operation.ts": [
    `Type '(path: string) => string' does not satisfy the constraint 'FunctionSignature'`,
    `Type '{ readonly port: number; }' does not satisfy the constraint 'FunctionSignature'`,
    `Type 'Effect<number, never, never>' does not satisfy the constraint 'FunctionSignature'`
  ],
  "not-an-effect.ts": [
    `is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'`,
    `must have a '[Symbol.iterator]()' method`
  ],
  "generic-unnamed.ts": [`is generic or overloaded: its result must require \\"test/parse\\"`],
  "overloaded-unnamed.ts": [`is generic or overloaded: its result must require \\"test/format\\"`],
  "shape-with-properties.ts": [`has properties: an operation is a bare function`],
  "stream-shape.ts": [
    `is not assignable to parameter of type '"The shape returns a Stream: define it with Stream.Operation"'`
  ],
  "effect-shape.ts": [
    `is not assignable to parameter of type '"The shape returns an Effect: define it with Context.Operation"'`
  ],
  // the parameter prints by its name; the list of missing members names the members' shape, since TypeScript reports an
  // interface with no members of its own by its one base type
  "partial-subset.ts": [
    `is not assignable to parameter of type 'ReadOnlyShape'`,
    `is missing the following properties from type 'Shape<{ exists: Operation<"effect/FileSystem/exists"`,
    `: exists, stat`
  ],
  "record-requires-all.ts": [`Type 'FileSystem' is not assignable to type 'never'`],
  "partial-aggregate.ts": [`is not assignable to type 'Layer<FileSystem, never, never>'`],
  "missing-twenty.ts": [
    `Type '"effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/utimes"' is not assignable to type 'never'`
  ],
  "wrong-self.ts": [
    `is not assignable to parameter of type '"Self lacks the identifier of \\"effect/FileSystem/writeFile\\""'`,
    `is not assignable to parameter of type '"Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"'`,
    `is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'`,
    `Expected 0 arguments, but got 1`
  ],
  "value-shape.ts": [`This expression is not callable`, `does not satisfy the constraint 'Effect<any, any, any>'`],
  "subset-not-full.ts": [`Type 'FileSystem' is not assignable to type 'ReadOnly'`],
  "partial-record.ts": [
    `is not assignable to parameter of type 'Shape'`,
    `is missing the following properties from type 'Shape<{ access: Operation<"effect/FileSystem/access"`,
    `: access, chmod, chown, copy, and 25 more`
  ],
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
