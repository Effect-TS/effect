import { describe, expect, it, layer } from "@effect/rstest"
import { Effect, Layer } from "effect"

// Run only in the child runner: setup failures here are intentional.
for (const named of [true, false]) {
  for (const mode of ["delayed", "never", "failure"] as const) {
    describe(`${named ? "named" : "unnamed"} ${mode}`, () => {
      const events: Array<string> = []
      const setup = Layer.effectDiscard(
        Effect.gen(function* setupEffect() {
          yield* Effect.acquireRelease(
            Effect.sync(() => events.push("acquired")),
            () => Effect.sync(() => events.push("released"))
          )
          if (mode === "failure") {
            return yield* Effect.die("early-setup-failure")
          }
          yield* (mode === "never" ? Effect.never : Effect.sleep(400)).pipe(
            Effect.onInterrupt(() =>
              Effect.gen(function* interruptSetup() {
                yield* Effect.sleep(10)
                events.push("interrupted")
              })
            )
          )
          events.push("late-effect")
          return yield* Effect.acquireRelease(
            Effect.sync(() => events.push("late-acquired")),
            () => Effect.sync(() => events.push("late-released"))
          )
        })
      )
      // Named suites exercise an explicit timeout; unnamed suites inherit the
      // runner's hookTimeout, which is also 100ms in the child configuration.
      const withLayer = layer(
        setup,
        named ? { excludeTestServices: true, timeout: 100 } : { excludeTestServices: true }
      )
      if (named) {
        withLayer("setup", (suiteIt) => {
          suiteIt.effect("unreachable", () => Effect.sync(() => events.push("test-ran")))
        })
      } else {
        withLayer((suiteIt) => {
          suiteIt.effect("unreachable", () => Effect.sync(() => events.push("test-ran")))
        })
      }

      it.live("setup stops before resource release and later tests", () =>
        Effect.gen(function* observeSetupLifetime() {
          const expected = mode === "failure" ? ["acquired", "released"] : ["acquired", "interrupted", "released"]
          expect(events).toEqual(expected)
          if (mode === "delayed") {
            yield* Effect.sleep(600)
            expect(events).toEqual(expected)
          }
        }))
    })
  }
}
