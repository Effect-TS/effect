import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import * as Terminal from "@effect/platform/Terminal"
import { describe, expect, it } from "@effect/vitest"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"

const runPromise = <E, A>(self: Effect.Effect<A, E, Terminal.Terminal>) =>
  Effect.runPromise(
    Effect.provide(self, NodeTerminal.layer)
  )

const makeTestTerminal = Effect.gen(function*() {
  const displayOutput = yield* Ref.make(Chunk.empty<string>())
  const displayErrorOutput = yield* Ref.make(Chunk.empty<string>())

  const terminal = Terminal.Terminal.of({
    columns: Effect.succeed(80),
    rows: Effect.succeed(24),
    isTTY: Effect.succeed(true),
    readInput: Effect.die("not implemented"),
    readLine: Effect.die("not implemented"),
    display: (text) => Ref.update(displayOutput, Chunk.append(text)),
    displayError: (text) => Ref.update(displayErrorOutput, Chunk.append(text))
  })

  return {
    terminal,
    displayOutput,
    displayErrorOutput
  }
})

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

  it("display", () =>
    Effect.gen(function*() {
      const { displayOutput, terminal } = yield* makeTestTerminal

      yield* terminal.display("hello")
      yield* terminal.display("world")

      const output = yield* Ref.get(displayOutput)
      expect(Chunk.toArray(output)).toEqual(["hello", "world"])
    }).pipe(Effect.runPromise))

  it("displayError", () =>
    Effect.gen(function*() {
      const { displayErrorOutput, terminal } = yield* makeTestTerminal

      yield* terminal.displayError("error1")
      yield* terminal.displayError("error2")

      const errors = yield* Ref.get(displayErrorOutput)
      expect(Chunk.toArray(errors)).toEqual(["error1", "error2"])
    }).pipe(Effect.runPromise))
})
