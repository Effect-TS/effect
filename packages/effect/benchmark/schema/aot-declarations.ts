/**
 * Reproducible benchmark for the AOT declaration fast-path PR.
 *
 * Run from packages/effect:  node benchmark/schema/aot-declarations.ts
 *
 * Synthetic schemas only: a struct with a Json index-signature child (the
 * additionalProperties:true shape) and a struct with a Uint8Array field.
 * Compares interpreter guards with guards created after generated decoders are
 * installed.
 */
import { Schema } from "effect"
import * as AOT from "effect/schema/SchemaAOTCompiler"
import { Bench } from "tinybench"

const withJsonIndex = Schema.StructWithRest(
  Schema.Struct({ lwt: Schema.Number }),
  [Schema.Record(Schema.String, Schema.Json)]
)
const jsonSchema = Schema.Struct({ name: Schema.String, meta: withJsonIndex })
const uint8Schema = Schema.Struct({ bytes: Schema.Uint8Array, name: Schema.String })

const jsonValid = { name: "a", meta: { lwt: 1 } }
const uint8Valid = { bytes: new Uint8Array([1, 2, 3]), name: "a" }

const jsonIsBefore = Schema.is(jsonSchema)
const uint8IsBefore = Schema.is(uint8Schema)

const source = AOT.compile([
  { ast: jsonSchema.ast, operations: ["decode", "is"] },
  { ast: uint8Schema.ast, operations: ["decode", "is"] }
])
const moduleFile = new URL(`./.aot-declarations-${process.pid}.mjs`, import.meta.url)
const fs = await import("node:fs")
fs.writeFileSync(moduleFile, source)
const generated = await import(`${moduleFile.href}?t=${Date.now()}`)
fs.unlinkSync(moduleFile)
generated.install([jsonSchema.ast, uint8Schema.ast])

const jsonIsAfter = Schema.is(jsonSchema)
const uint8IsAfter = Schema.is(uint8Schema)

const bench = new Bench({
  iterations: 500,
  time: 0,
  warmupIterations: 100,
  warmupTime: 0,
  timestampProvider: "hrtimeNow"
})
bench
  .add("Json index / interpreter is", () => jsonIsBefore(jsonValid))
  .add("Json index / generated is", () => jsonIsAfter(jsonValid))
  .add("Uint8Array / interpreter is", () => uint8IsBefore(uint8Valid))
  .add("Uint8Array / generated is", () => uint8IsAfter(uint8Valid))

await bench.run()
console.table(bench.table())
