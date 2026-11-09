import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema, Stream } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Command } from "effect/ui"
import * as schedule from "effect/ui/internal/schedule"
import { SaveTodo, Search, TodoItemMessage, Upload } from "./fixtures/components.ts"

const todo = { id: "t1", title: "buy milk", done: false }

class Ticks extends Command.Service<Ticks>()(
  "Ticks",
  Effect.succeed((n: number) => Stream.fromIterable(Array.from({ length: n }, (_, i) => i))),
  { stream: true }
) {}

const failingKv = Layer.succeed(
  KeyValueStore.KeyValueStore,
  KeyValueStore.makeStringOnly({
    get: () => Effect.fail(new KeyValueStore.KeyValueStoreError({ message: "disk full", method: "get", key: "" })),
    set: () => Effect.fail(new KeyValueStore.KeyValueStoreError({ message: "disk full", method: "set", key: "" })),
    remove: () =>
      Effect.fail(new KeyValueStore.KeyValueStoreError({ message: "disk full", method: "remove", key: "" })),
    clear: Effect.void,
    size: Effect.succeed(0),
    keys: Effect.succeed([])
  })
)

describe("Command", () => {
  describe("Service", () => {
    it("is a Context.Service whose key is the Command's name", () => {
      assert.strictEqual(SaveTodo.key, "todos/SaveTodo")
      assert.strictEqual(Command.nameOf(SaveTodo), "todos/SaveTodo")
      assert.isTrue(Command.isDefinition(SaveTodo))
      assert.isFalse(SaveTodo.stream)
      assert.strictEqual(SaveTodo.mode, "concurrent")
    })

    it("make issues a Command carrying the name and arguments", () => {
      const command = SaveTodo.make(todo)
      assert.isTrue(Command.isCommand(command))
      assert.strictEqual(command._tag, "Effect")
      assert.strictEqual(command.name, "todos/SaveTodo")
      assert.deepStrictEqual(command.args, [todo])
    })

    it.effect("the implementation is tested against a fake of what it uses", () =>
      Effect.gen(function*() {
        const kv = yield* KeyValueStore.KeyValueStore
        const message = yield* SaveTodo.make(todo).effect
        assert.deepStrictEqual(message, TodoItemMessage.make({ _tag: "Saved" }))
        assert.strictEqual(yield* kv.get("todo/t1"), JSON.stringify(todo))
      }).pipe(Effect.provide(SaveTodo.layer.pipe(Layer.provideMerge(KeyValueStore.layerMemory)))))

    it.effect("the implementation owns the error policy", () =>
      Effect.gen(function*() {
        const message = yield* SaveTodo.make(todo).effect
        assert.deepStrictEqual(message, TodoItemMessage.make({ _tag: "SaveFailed", reason: "disk full" }))
      }).pipe(Effect.provide(SaveTodo.layer.pipe(Layer.provide(failingKv)))))

    it.effect("a fake is a plain Layer.succeed", () =>
      Effect.gen(function*() {
        const message = yield* SaveTodo.make(todo).effect
        assert.deepStrictEqual(message, TodoItemMessage.make({ _tag: "Saved" }))
      }).pipe(Effect.provide(Layer.succeed(SaveTodo, () => Effect.succeed(TodoItemMessage.make({ _tag: "Saved" }))))))

    it.effect("a stream service runs its Stream", () =>
      Effect.gen(function*() {
        const items = yield* Stream.runCollect(Ticks.make(3).stream)
        assert.deepStrictEqual(items, [0, 1, 2])
        assert.isTrue(Ticks.stream)
        assert.strictEqual(Ticks.make(3)._tag, "Stream")
      }).pipe(Effect.provide(Ticks.layer)))
  })

  describe("make", () => {
    it("returns a factory whose Commands carry the options", () => {
      assert.strictEqual(Search.name, "Search")
      assert.strictEqual(Search.mode, "switch")
      const command = Search("x")
      assert.strictEqual(command._tag, "Effect")
      assert.deepStrictEqual([command.name, command.args, command.mode, command.key], [
        "Search",
        ["x"],
        "switch",
        undefined
      ])
      assert.deepStrictEqual(Effect.runSync(command.effect), { _tag: "Results", items: ["x"] })
    })

    it("derives the concurrency key from the arguments", () => {
      const command = Upload("photo.png")
      assert.strictEqual(command._tag, "Stream")
      assert.strictEqual(command.key, "photo.png")
      assert.isTrue(Upload.stream)
    })

    it("the work field of the other kind is undefined", () => {
      assert.strictEqual(Upload("photo.png").effect, undefined)
      assert.strictEqual(Search("x").stream, undefined)
      assert.strictEqual(Command.map(Upload("photo.png"), () => 1).effect, undefined)
    })
  })

  describe("map", () => {
    it("keeps the name, arguments and options, and maps the result", () => {
      const mapped = Search("x").pipe(Command.map((message) => (message as { readonly _tag: string })._tag))
      assert.strictEqual(mapped._tag, "Effect")
      if (mapped._tag !== "Effect") return
      assert.deepStrictEqual([mapped.name, mapped.args, mapped.mode], ["Search", ["x"], "switch"])
      assert.strictEqual(Effect.runSync(mapped.effect), "Results")
      assert.strictEqual(mapped.resolve({ _tag: "Results", items: [] }), "Results")
    })

    it("leaves an Interrupt unchanged", () => {
      const interrupt = Command.interrupt(Upload, "photo.png")
      assert.deepStrictEqual([interrupt._tag, interrupt.name, interrupt.key], ["Interrupt", "Upload", "photo.png"])
      assert.strictEqual(Command.map(interrupt, () => 1), interrupt)
    })
  })

  describe("schedule", () => {
    const Message = Schema.TaggedUnion({ Done: {} })
    const concurrent = Command.make("C", () => Effect.succeed(Message.make({ _tag: "Done" })))
    const switching = Command.make("S", () => Effect.succeed(Message.make({ _tag: "Done" })), { mode: "switch" })
    const dropping = Command.make("D", () => Effect.succeed(Message.make({ _tag: "Done" })), { mode: "drop" })
    const queueing = Command.make("Q", (_key: string) => Effect.succeed(Message.make({ _tag: "Done" })), {
      mode: "queue",
      key: (key) => key
    })
    const entry = (
      command: Command.Effectful<any, any>,
      status: "running" | "queued" = "running"
    ): schedule.Entry<string> => ({
      name: command.name,
      key: command.key,
      mode: command.mode,
      status,
      value: `${command.name}:${command.key ?? ""}:${status}`
    })

    it("concurrent starts alongside the group", () => {
      assert.deepStrictEqual(schedule.schedule([entry(concurrent())], concurrent()), { action: "start", interrupt: [] })
    })

    it("switch starts and interrupts the group, not other Commands", () => {
      const other = entry(concurrent())
      const decision = schedule.schedule([entry(switching()), other, entry(switching(), "queued")], switching())
      assert.strictEqual(decision.action, "start")
      assert.deepStrictEqual(decision.interrupt.map((e) => e.value), ["S::running", "S::queued"])
    })

    it("drop ignores a new run while one is running", () => {
      assert.strictEqual(schedule.schedule([entry(dropping())], dropping()).action, "drop")
      assert.strictEqual(schedule.schedule([entry(dropping(), "queued")], dropping()).action, "start")
    })

    it("queue waits per key, and the oldest queued run starts when the running one ends", () => {
      const a = entry(queueing("a"))
      assert.strictEqual(schedule.schedule([a], queueing("a")).action, "queue")
      assert.strictEqual(schedule.schedule([a], queueing("b")).action, "start")
      const queued1 = entry(queueing("a"), "queued")
      const queued2 = { ...entry(queueing("a"), "queued"), value: "second" }
      assert.strictEqual(schedule.next([queued1, queued2], a), queued1)
      assert.strictEqual(schedule.next([a, queued1], { ...a, value: "another" }), undefined)
    })

    it("an interrupt stops nothing new and interrupts by name, or by name and key", () => {
      const a = entry(queueing("a"))
      const b = entry(queueing("b"))
      assert.deepStrictEqual(schedule.schedule([a, b], Command.interrupt(queueing)).interrupt, [a, b])
      assert.deepStrictEqual(schedule.schedule([a, b], Command.interrupt(queueing, "b")), {
        action: "none",
        interrupt: [b]
      })
    })
  })
})
