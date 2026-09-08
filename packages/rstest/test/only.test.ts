import { afterAll, assert, it } from "@effect/rstest"
import { Effect } from "effect"

const ran: Array<string> = []

for (const [name, test] of [["effect", it.effect], ["live", it.live]] as const) {
  test.only(`${name} only overrides only: false`, () =>
    Effect.sync(() => {
      ran.push(name)
    }), { only: false })
  test(`${name} unselected sibling`, () => Effect.die("must be filtered"))
}

afterAll(() => assert.deepStrictEqual(ran.sort(), ["effect", "live"]))
