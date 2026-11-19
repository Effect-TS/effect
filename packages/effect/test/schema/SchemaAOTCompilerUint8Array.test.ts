import { assert, describe, it } from "@effect/vitest"
import { Result, Schema, SchemaParser } from "effect"
import * as SchemaAOTCompiler from "effect/schema/SchemaAOTCompiler"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { assertFalse, assertTrue } from "../utils/assert.ts"

const schema = Schema.Struct({ bytes: Schema.Uint8Array, name: Schema.String })

describe("SchemaAOTCompiler Uint8Array declarations", { concurrent: false }, () => {
  it("emits is and decode for an Uint8Array declaration child", () => {
    const source = SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode", "is"] }])
    assert.include(source, "case \"is\":{")
    assert.include(source, "case \"decode\":{")
    assert.include(source, "isUint8Array")
  })

  it("matches the interpreter for valid and invalid values", async () => {
    const interpreterIs = SchemaParser._is(schema.ast)
    const interpreterDecode = SchemaParser.decodeUnknownResult(schema)
    const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-uint8-test-", import.meta.url)))
    const file = join(directory, "generated.mjs")
    writeFileSync(file, SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode", "is"] }]))
    try {
      const module = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
      module.install([schema.ast])
      const compiledIs = SchemaParser._is(schema.ast)
      const cases: ReadonlyArray<{ label: string; input: unknown; ok: boolean }> = [
        { label: "valid bytes", input: { bytes: new Uint8Array([1, 2, 3]), name: "a" }, ok: true },
        { label: "empty bytes", input: { bytes: new Uint8Array(), name: "a" }, ok: true },
        { label: "plain array", input: { bytes: [1, 2, 3], name: "a" }, ok: false },
        { label: "wrong value type", input: { bytes: new Uint8Array(), name: 1 }, ok: false }
      ]
      for (const { label, input, ok } of cases) {
        assert.strictEqual(compiledIs(input), interpreterIs(input), `is mismatch for ${label}`)
        assert.strictEqual(compiledIs(input), ok, `unexpected is value for ${label}`)
        const expected = Result.isSuccess(interpreterDecode(input))
        let actual: boolean
        try {
          Schema.decodeUnknownSync(schema)(input)
          actual = true
        } catch {
          actual = false
        }
        assert.strictEqual(actual, expected, `decode mismatch for ${label}`)
        if (ok) assertTrue(actual, label)
        else assertFalse(actual, label)
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
