import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Terminal } from "effect"

describe("Terminal operations", () => {
  const displayed: Array<string> = []
  const live = Terminal.make({
    columns: Effect.succeed(80),
    rows: Effect.succeed(24),
    size: Effect.die("size: unused"),
    readInput: Effect.die("readInput: unused"),
    readLine: Effect.succeed("line"),
    display: (text) =>
      Effect.sync(() => {
        displayed.push(text)
      })
  })

  it.effect("yields a value operation under a Layer<Terminal>, and the record read is an object of the members", () =>
    Effect.gen(function*() {
      const width = yield* Terminal.columns
      const terminal = yield* Terminal.Terminal
      assert.deepStrictEqual(terminal, live)
      assert.deepStrictEqual(Object.keys(terminal), Object.keys(Terminal.Terminal.members))
      assert.strictEqual(width, 80)
      // the member is the same Effect standalone and through the record
      assert.strictEqual(terminal.columns, live.columns)
      assert.strictEqual(yield* terminal.columns, 80)
      yield* Terminal.display("hello")
      assert.deepStrictEqual(displayed, ["hello"])
    }).pipe(Effect.provide(Layer.succeed(Terminal.Terminal, live))))

  it.effect("overrides one member on top of the record, for the standalone read and for the record view", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* Terminal.columns, 120)
      const terminal = yield* Terminal.Terminal
      assert.strictEqual(yield* terminal.columns, 120)
      assert.strictEqual(yield* terminal.rows, 24)
      assert.notStrictEqual(terminal, live)
    }).pipe(
      Effect.provideService(Terminal.columns, Effect.succeed(120)),
      Effect.provide(Layer.succeed(Terminal.Terminal, live))
    ))

  it.effect("runs a member under Layer.mock and dies on the members the mock lacks", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* Terminal.readLine, "mocked")
      const exit = yield* Effect.exit(Terminal.columns)
      assert.isTrue(Exit.isFailure(exit))
    }).pipe(Effect.provide(Layer.mock(Terminal.Terminal, { readLine: Effect.succeed("mocked") }))))

  it.effect("dies naming the member when a value operation runs unprovided", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(Terminal.columns as unknown as Effect.Effect<number>)
      assert.isTrue(Exit.isFailure(exit))
      assert.match(String(exit), /Service not found: effect\/Terminal\/columns/)
    }))

  it.effect("Interactive is a subset: a Layer<Terminal> satisfies it, and its read is the three members", () => {
    const full: Layer.Layer<Terminal.Interactive> = Layer.succeed(Terminal.Terminal, live)
    return Effect.gen(function*() {
      const interactive = yield* Terminal.Interactive
      assert.deepStrictEqual(Object.keys(interactive).sort(), ["columns", "display", "readInput"])
      assert.strictEqual(interactive.columns, live.columns)
      assert.strictEqual(interactive.readInput, live.readInput)
      assert.strictEqual(yield* interactive.columns, 80)
    }).pipe(Effect.provide(full))
  })

  it("is stored as one slot per member and nothing else", () => {
    const context = Context.make(Terminal.Terminal, live)
    assert.strictEqual(context.mapUnsafe.size, Object.keys(Terminal.Terminal.members).length)
    assert.isFalse(context.mapUnsafe.has("effect/Terminal"))
    assert.strictEqual(Context.get(context, Terminal.columns), live.columns)
    assert.deepStrictEqual(Context.get(context, Terminal.Terminal), live)
    assert.strictEqual(Terminal.Terminal.columns, Terminal.columns)
    assert.strictEqual(Context.omit(Terminal.Terminal)(context).mapUnsafe.size, 0)
  })
})
