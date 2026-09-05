import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

for (const flatMap of [Effect.flatMap, Effect.flatMapEager]) {
  describe(flatMap === Effect.flatMap ? "flatMap" : "flatMapEager", () => {
    for (
      const [name, source] of [
        ["succeed", Effect.succeed(42)],
        ["sync", Effect.sync(() => 42)]
      ] as const
    ) {
      describe(name, () => {
        it("preserves callback default parameters", () => {
          const result = Effect.runSync(
            flatMap(source, (value, extra = "default") => Effect.succeed([value, extra === "default"]))
          )

          assert.deepEqual(result, [42, true])
        })

        it("passes no extra rest arguments to the callback", () => {
          const result = Effect.runSync(
            source.pipe(flatMap((value, ...extra: Array<unknown>) => Effect.succeed([value, extra.length])))
          )

          assert.deepEqual(result, [42, 0])
        })

        it("passes exactly one argument to a unary callback", () => {
          const result = Effect.runSync(flatMap(source, function(value) {
            return Effect.succeed([value, arguments.length])
          }))

          assert.deepEqual(result, [42, 1])
        })
      })
    }
  })
}
