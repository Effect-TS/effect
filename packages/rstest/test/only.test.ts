import { afterAll, assert, it } from "@effect/rstest"
import { Effect } from "effect"

// Keep focused-test coverage in its own file so it cannot filter the other tests.
let ran = false
it.effect("only option", () => Effect.sync(() => ran = true), { only: true, skip: true, todo: true })
it.effect("unselected test", () => Effect.die("must not run"))
afterAll(() => assert.isTrue(ran))
