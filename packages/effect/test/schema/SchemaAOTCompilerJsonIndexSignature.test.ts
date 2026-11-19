import { assert, describe, it } from "@effect/vitest"
import { Result, Schema, SchemaParser } from "effect"
import * as SchemaAOTCompiler from "effect/schema/SchemaAOTCompiler"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { assertFalse, assertTrue } from "../utils/assert.ts"

/**
 * RxDB's `_meta` and `_attachments` are structs with declared properties AND
 * a string index signature whose value is `Schema.Json`. Before supporting the
 * `effect/schema/Json` declaration, the compiler rejected the whole enclosing
 * struct and emitted only `decodeEffect`. These tests pin both the emission and
 * the equivalence with the interpreter for the shapes that previously fell
 * back, especially keys and values the index signature may not cover.
 */
const meta = Schema.StructWithRest(
  Schema.Struct({ lwt: Schema.Number }),
  [Schema.Record(Schema.String, Schema.Json)]
)
const schema = Schema.Struct({
  name: Schema.String.check(Schema.isBetweenLength(1, 64)),
  count: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
  meta,
  tags: Schema.Array(Schema.String),
  closed: Schema.Struct({ flag: Schema.Boolean })
})
const strict = { errors: "all", onExcessProperty: "error" } as const

function generated() {
  const source = SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode", "is"] }])
  const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-json-test-", import.meta.url)))
  const file = join(directory, "generated.mjs")
  writeFileSync(file, source)
  return {
    source,
    directory,
    install: async () => {
      const module = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
      module.install([schema.ast])
    }
  }
}

describe("SchemaAOTCompiler Json index signatures", { concurrent: false }, () => {
  it("emits is and decode fast paths for a struct-with-rest child", () => {
    const { source, directory } = generated()
    try {
      assert.include(source, "case \"is\":{")
      assert.include(source, "case \"decode\":{")
      assert.include(source, "isJson")
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("matches the interpreter for valid and invalid documents", async () => {
    // The guard is captured before and after install and compared on the same
    // inputs. Detailed strict-option behavior is compared through decode below.
    const interpreterIs = SchemaParser._is(schema.ast)
    const interpreterDecode = SchemaParser.decodeUnknownResult(schema, strict)
    const { directory, install } = generated()
    try {
      await install()
      const compiledIs = SchemaParser._is(schema.ast)
      const compiledDecode = (input: unknown) => {
        try {
          return { ok: true as const, value: Schema.decodeUnknownSync(schema, strict)(input) }
        } catch {
          return { ok: false as const }
        }
      }
      const symbol = Symbol("extra")
      const cases: ReadonlyArray<{ label: string; input: unknown }> = [
        {
          label: "valid closed object",
          input: { name: "a", count: 1, meta: { lwt: 1 }, tags: ["x"], closed: { flag: true } }
        },
        {
          label: "nested object and array",
          input: { name: "a", count: 0, meta: { lwt: 1, other: { nested: [1, 2] } }, tags: [], closed: { flag: false } }
        },
        {
          label: "excess top-level key",
          input: { name: "a", count: 1, meta: { lwt: 1 }, tags: [], closed: { flag: true }, extra: 1 }
        },
        {
          label: "excess key in closed child",
          input: { name: "a", count: 1, meta: { lwt: 1 }, tags: [], closed: { flag: true, extra: 1 } }
        },
        {
          label: "non-JSON value in the index signature",
          input: { name: "a", count: 1, meta: { lwt: 1, fn: () => 1 }, tags: [], closed: { flag: true } }
        },
        {
          label: "symbol key in the index signature",
          input: { name: "a", count: 1, meta: { lwt: 1, [symbol]: 1 }, tags: [], closed: { flag: true } }
        },
        {
          label: "bad pattern check",
          input: { name: "", count: 1, meta: { lwt: 1 }, tags: [], closed: { flag: true } }
        },
        { label: "bad required key", input: { name: "a", count: 1, tags: [], closed: { flag: true } } },
        {
          label: "wrong nested type",
          input: { name: "a", count: 1, meta: { lwt: "1" }, tags: [], closed: { flag: true } }
        }
      ]
      for (const { label, input } of cases) {
        const expectedIs = interpreterIs(input)
        const actualIs = compiledIs(input)
        assert.strictEqual(actualIs, expectedIs, `is mismatch for ${label}`)

        const expectedDecode = Result.isSuccess(interpreterDecode(input, strict))
        const actualDecode = compiledDecode(input).ok
        assert.strictEqual(actualDecode, expectedDecode, `decode mismatch for ${label}`)

        if (expectedIs) assertTrue(actualIs, label)
        else assertFalse(actualIs, label)
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
