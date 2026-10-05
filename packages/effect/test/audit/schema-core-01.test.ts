import { assert, it } from "@effect/vitest"
import { Effect, Exit, Schema, SchemaGetter, SchemaParser } from "effect"

// SchemaAST.ts:3789 (parseUnionCandidates) allocates the union state once, outside the
// returned Effect, so re-running the same decode Effect reuses previous successes.
// Contract (SchemaAST.ts:3560 Union JSDoc): `"oneOf"` requires exactly one member to match.
it("re-running a suspended oneOf union decode Effect succeeds every time", () => {
  const first = Schema.String.pipe(Schema.decode({
    decode: SchemaGetter.transformEffect((s: string) => Effect.sync(() => s)),
    encode: SchemaGetter.passthrough()
  }))
  const schema = Schema.Union([first, Schema.String.check(Schema.isMinLength(5))], { mode: "oneOf" })
  const effect = SchemaParser.decodeUnknownEffect(schema)("a")
  assert.strictEqual(String(Effect.runSyncExit(effect)), String(Exit.succeed("a")))
  assert.strictEqual(String(Effect.runSyncExit(effect)), String(Exit.succeed("a")))
})
