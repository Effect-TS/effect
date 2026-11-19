/**
 * Reproducible benchmark for the Schema.validate PR.
 *
 * Run from packages/effect:  node benchmark/schema/validate-options.ts
 *
 * Compares the existing detailed decode with the new boolean validator on a
 * synthetic three-field struct. All inputs are defined below; no external
 * schema corpus is needed.
 */
import { Schema } from "effect"
import { Bench } from "tinybench"

const schema = Schema.Struct({
  name: Schema.String.check(Schema.isBetweenLength(1, 64)),
  count: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
  tag: Schema.Literal("a", "b")
})
const valid = { name: "ok", count: 1, tag: "a" as const }
const invalid = { name: "", count: -1, tag: "x" as const }

const decodeAll = Schema.decodeUnknownResult(schema, { errors: "all" })
const validateDefault = Schema.validate(schema)
const validateStrict = Schema.validate(schema, { errors: "first", onExcessProperty: "error" })

const bench = new Bench({
  iterations: 500,
  time: 0,
  warmupIterations: 100,
  warmupTime: 0,
  timestampProvider: "hrtimeNow"
})
bench
  .add("decodeAll / valid", () => decodeAll(valid))
  .add("validate (default) / valid", () => validateDefault(valid))
  .add("validate (onExcessProperty) / valid", () => validateStrict(valid))
  .add("decodeAll / invalid", () => decodeAll(invalid))
  .add("validate (default) / invalid", () => validateDefault(invalid))
  .add("validate (onExcessProperty) / invalid", () => validateStrict(invalid))

await bench.run()
console.table(bench.table())
