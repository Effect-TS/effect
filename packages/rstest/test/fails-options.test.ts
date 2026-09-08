import { it } from "@effect/rstest"
import { Effect } from "effect"

for (const [name, test] of [["effect", it.effect], ["live", it.live]] as const) {
  test(`${name}: expected failure option`, () => Effect.fail("expected"), { fails: true })
  test.skipIf(false)(`${name}: skipIf retains expected failure`, () => Effect.fail("expected"), { fails: true })
  test.runIf(true)(`${name}: runIf retains expected failure`, () => Effect.fail("expected"), { fails: true })
  test.each([1])(`${name}: each retains expected failure`, () => Effect.fail("expected"), { fails: true })
}
