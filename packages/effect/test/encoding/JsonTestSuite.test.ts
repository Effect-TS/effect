import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Stream } from "effect"
import * as Json from "effect/encoding/Json"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

// JSONTestSuite test_parsing; see fixtures/JSONTestSuite/README.md
const directory = fileURLToPath(new URL("../fixtures/JSONTestSuite/test_parsing", import.meta.url))
const encoder = new TextEncoder()

const files: ReadonlyArray<readonly [string, Uint8Array]> = [
  ...readdirSync(directory).map((name) => [name, new Uint8Array(readFileSync(join(directory, name)))] as const),
  ["n_structure_100000_opening_arrays.json", encoder.encode("[".repeat(100000))],
  ["n_structure_open_array_object.json", encoder.encode("[{\"\":".repeat(50000) + "\n")]
]

// The elements of the root array per `JSON.parse`, "Pointer" for another valid
// root, or "Syntax" for invalid input.
const reference = (bytes: Uint8Array): ReadonlyArray<unknown> | "Pointer" | "Syntax" => {
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return "Syntax"
  }
  return Array.isArray(value) ? value : "Pointer"
}

const rootArray = (bytes: Uint8Array): boolean => /^[ \t\n\r]*\[/.test(new TextDecoder().decode(bytes))

const decode = (chunks: ReadonlyArray<Uint8Array>) =>
  Stream.fromArrays(...chunks.map((chunk) => [chunk])).pipe(
    Stream.pipeThroughChannel(Json.decode()),
    Stream.runCollect,
    Effect.exit
  )

describe("Json JSONTestSuite", () => {
  it.effect("agrees with JSON.parse on root arrays", () =>
    Effect.gen(function*() {
      for (const [name, bytes] of files) {
        const expected = reference(bytes)
        if (name.startsWith("y_")) assert.notStrictEqual(expected, "Syntax", name)
        if (name.startsWith("n_")) assert.strictEqual(expected, "Syntax", name)
        const splits = bytes.length > 1000 ? [[bytes]] : [[bytes], Array.from(bytes, (byte) => Uint8Array.of(byte))]
        for (const chunks of splits) {
          const exit = yield* decode(chunks)
          if (typeof expected === "string") {
            assert.isTrue(Exit.isFailure(exit), name)
            const error = yield* Effect.flip(exit)
            assert.isTrue(Json.isJsonError(error), name)
            // Deep nesting fails on the depth limit, and a root that is not an
            // array fails on the pointer, before any later syntax error.
            const kinds = [expected, "Limit", ...(rootArray(bytes) ? [] : ["Pointer"])]
            assert.include(kinds, error.kind, name)
          } else {
            assert.isTrue(Exit.isSuccess(exit), name)
            if (Exit.isSuccess(exit)) assert.deepStrictEqual(exit.value, expected, name)
          }
        }
      }
    }))
})
