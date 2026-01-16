import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import * as Terminal from "@effect/platform/Terminal"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

const runPromise = <E, A>(self: Effect.Effect<A, E, Terminal.Terminal>) =>
  Effect.runPromise(
    Effect.provide(self, NodeTerminal.layer)
  )

describe("Terminal", () => {
  it("columns", () =>
    runPromise(Effect.gen(function*() {
      const terminal = yield* Terminal.Terminal
      const columns = yield* terminal.columns
      expect(typeof columns).toEqual("number")
    })))

  it("rows", () =>
    runPromise(Effect.gen(function*() {
      const terminal = yield* Terminal.Terminal
      const rows = yield* terminal.rows
      expect(typeof rows).toEqual("number")
    })))

  it("isTTY", () =>
    runPromise(Effect.gen(function*() {
      const terminal = yield* Terminal.Terminal
      const isTTY = yield* terminal.isTTY
      expect(typeof isTTY).toEqual("boolean")
    })))
})
