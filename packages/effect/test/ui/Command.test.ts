import { assert, describe, it } from "@effect/vitest"
import { Data, Effect, Exit, Layer, Schema, Stream } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Loader } from "effect/reactivity"
import { Command } from "effect/ui"
import * as schedule from "effect/ui/internal/schedule"
import { SaveTodo, Search, TodoItemMessage, Upload } from "./fixtures/components.ts"

const todo = { id: "t1", title: "buy milk", done: false }

class Ticks extends Command.Service<Ticks>()(
  "Ticks",
  { args: { n: Schema.Number }, stream: true, invalidates: () => [] },
  Effect.succeed(({ n }) => Stream.fromIterable(Array.from({ length: n }, (_, i) => i)))
) {}

class SaveFailed extends Data.TaggedError("SaveFailed")<{ readonly reason: string }> {}

class Save extends Command.Service<Save>()(
  "Save",
  { args: { title: Schema.String }, invalidates: () => [] },
  Effect.succeed(({ title }) => title === "" ? Effect.fail(new SaveFailed({ reason: "empty" })) : Effect.succeed(title))
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
      assert.deepStrictEqual(command.args, todo)
      assert.strictEqual(command.groupKey, undefined)
    })

    it("defaults omitted invalidates to no targets", () => {
      class NoInvalidation extends Command.Service<NoInvalidation>()(
        "NoInvalidation",
        { args: {} },
        Effect.succeed(() => Effect.void)
      ) {}
      assert.deepStrictEqual(NoInvalidation.make().invalidates, [])
    })

    it("computes invalidates and optimistic from the args at issue, and writes from the success", () => {
      class Rename extends Command.Service<Rename>()(
        "Rename",
        {
          args: { id: Schema.String, name: Schema.String },
          invalidates: ({ id }) => [Loader.Tag(`user:${id}`)],
          optimistic: ({ id, name }) => [{ id, name }] as any,
          writes: (success: string, { id }) => [{ id, success }] as any
        },
        Effect.succeed(({ name }: { readonly name: string }) => Effect.succeed(name.toUpperCase()))
      ) {}
      const command = Rename.make({ id: "u1", name: "ada" })
      assert.deepStrictEqual(command.invalidates, [Loader.Tag("user:u1")])
      assert.deepStrictEqual(command.optimistic as unknown, [{ id: "u1", name: "ada" }])
      assert.deepStrictEqual(command.writes?.("ADA") as unknown, [{ id: "u1", success: "ADA" }])
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
        const items = yield* Stream.runCollect(Ticks.make({ n: 3 }).stream)
        assert.deepStrictEqual(items, [0, 1, 2])
        assert.isTrue(Ticks.stream)
        assert.strictEqual(Ticks.make({ n: 3 })._tag, "Stream")
      }).pipe(Effect.provide(Ticks.layer)))
  })

  describe("match", () => {
    it("a body with a typed error issues an Unmatched Command", () => {
      assert.isTrue(Command.isUnmatched(Save.make({ title: "milk" })))
      assert.isFalse(Command.isUnmatched(Search({ text: "x" })))
    })

    it.effect("maps both channels to messages", () =>
      Effect.gen(function*() {
        const matched = (title: string) =>
          Save.make({ title }).pipe(Command.match({
            onSuccess: (saved) => `saved ${saved}`,
            onFailure: (error) => `failed ${error.reason}`
          }))
        assert.isFalse(Command.isUnmatched(matched("milk")))
        assert.strictEqual(yield* matched("milk").effect, "saved milk")
        assert.strictEqual(yield* matched("").effect, "failed empty")
        assert.strictEqual(matched("").reject?.(new SaveFailed({ reason: "x" })), "failed x")
      }).pipe(Effect.provide(Save.layer)))

    it.effect("a defect isn't mapped", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(
          Save.make({ title: "milk" }).pipe(Command.match({ onSuccess: () => "ok", onFailure: () => "failed" })).effect
        )
        assert.isTrue(Exit.hasDies(exit))
      }).pipe(Effect.provide(Layer.succeed(Save, () => Effect.die("boom")))))

    it.effect("map after match maps both channels", () =>
      Effect.gen(function*() {
        const command = Save.make({ title: "" }).pipe(
          Command.match({ onSuccess: () => "ok", onFailure: (error) => error.reason }),
          Command.map((message) => message.length)
        )
        assert.strictEqual(yield* command.effect, 5)
      }).pipe(Effect.provide(Save.layer)))
  })

  describe("make", () => {
    it("returns a factory whose Commands carry the options", () => {
      assert.strictEqual(Search.name, "Search")
      assert.strictEqual(Search.mode, "switch")
      const command = Search({ text: "x" })
      assert.strictEqual(command._tag, "Effect")
      assert.deepStrictEqual([command.name, command.args, command.mode, command.groupKey], [
        "Search",
        { text: "x" },
        "switch",
        undefined
      ])
      assert.deepStrictEqual(Effect.runSync(command.effect), { _tag: "Results", items: ["x"] })
    })

    it("a Command with no args takes none", () => {
      const Ping = Command.make("Ping", { args: {} }, () => Effect.succeed("pong"))
      assert.deepStrictEqual(Ping().args, {})
      assert.strictEqual(Effect.runSync(Ping().effect), "pong")
    })

    it("derives the group key from the group fields", () => {
      const command = Upload({ name: "photo.png" })
      assert.strictEqual(command._tag, "Stream")
      assert.strictEqual(command.groupKey, `{"name":"photo.png"}`)
      assert.isTrue(Upload.stream)
    })

    it("the group key is the canonical JSON of the encoded group fields", () => {
      const Page = Command.make(
        "Page",
        { args: { tab: Schema.String, page: Schema.NumberFromString, note: Schema.String }, group: ["tab", "page"] },
        () => Effect.void
      )
      const a = Page({ page: 2, tab: "all", note: "a" })
      const b = Page({ note: "b", tab: "all", page: 2 })
      assert.strictEqual(a.groupKey, `{"page":"2","tab":"all"}`)
      assert.strictEqual(a.groupKey, b.groupKey)
      assert.notStrictEqual(Page({ page: 3, tab: "all", note: "a" }).groupKey, a.groupKey)
    })

    it("a File outside the group doesn't take part in the group key", () => {
      const UploadFile = Command.make(
        "UploadFile",
        { args: { folder: Schema.String, file: Schema.instanceOf(File) }, group: ["folder"] },
        ({ file }) => Effect.succeed(file.name)
      )
      const command = UploadFile({ folder: "photos", file: new File(["x"], "me.png") })
      assert.strictEqual(command.groupKey, `{"folder":"photos"}`)
      assert.strictEqual(Effect.runSync(command.effect), "me.png")
    })

    it("a group field must be one of the args", () => {
      assert.throws(
        () => Command.make("Bad", { args: { a: Schema.String }, group: ["b" as any] }, () => Effect.void),
        /group field "b"/
      )
    })

    it("the work field of the other kind is undefined", () => {
      assert.strictEqual(Upload({ name: "photo.png" }).effect, undefined)
      assert.strictEqual(Search({ text: "x" }).stream, undefined)
      assert.strictEqual(Command.map(Upload({ name: "photo.png" }), () => 1).effect, undefined)
    })
  })

  describe("map", () => {
    it("keeps the name, arguments and options, and maps the result", () => {
      const mapped = Search({ text: "x" }).pipe(Command.map((message) => (message as { readonly _tag: string })._tag))
      assert.strictEqual(mapped._tag, "Effect")
      if (mapped._tag !== "Effect") return
      assert.deepStrictEqual([mapped.name, mapped.args, mapped.mode], ["Search", { text: "x" }, "switch"])
      assert.strictEqual(Effect.runSync(mapped.effect), "Results")
      assert.strictEqual(mapped.resolve({ _tag: "Results", items: [] }), "Results")
    })

    it("leaves an Interrupt unchanged", () => {
      const interrupt = Command.interrupt(Upload, { name: "photo.png" })
      assert.deepStrictEqual([interrupt._tag, interrupt.name, interrupt.groupKey], [
        "Interrupt",
        "Upload",
        `{"name":"photo.png"}`
      ])
      assert.strictEqual(Command.interrupt(Upload).groupKey, undefined)
      assert.strictEqual(Command.map(interrupt, () => 1), interrupt)
    })
  })

  describe("as", () => {
    it.effect("replaces effect and stream messages while keeping the issued Command", () =>
      Effect.gen(function*() {
        const message = { _tag: "Done" }
        const original = Search({ text: "x" })
        const mapped = original.pipe(Command.as(message))
        assert.strictEqual(yield* mapped.effect, message)
        assert.strictEqual(mapped.resolve({ _tag: "Results", items: [] }), message)
        assert.deepStrictEqual([mapped.name, mapped.args, mapped.mode], ["Search", { text: "x" }, "switch"])
        const stream = Command.as(Ticks.make({ n: 2 }), message)
        assert.deepStrictEqual(yield* Stream.runCollect(stream.stream), [message, message])
        const matched = Save.make({ title: "" }).pipe(
          Command.match({ onSuccess: () => "ok", onFailure: () => "failed" }),
          Command.as(message)
        )
        assert.strictEqual(yield* matched.effect, message)
        assert.strictEqual(matched.reject?.(new SaveFailed({ reason: "empty" })), message)
        const interrupt = Command.interrupt(Ticks)
        assert.strictEqual(Command.as(interrupt, message), interrupt)
      }).pipe(Effect.provide(Ticks.layer), Effect.provide(Save.layer)))
  })

  describe("schedule", () => {
    const Message = Schema.TaggedUnion({ Done: {} })
    const done = () => Effect.succeed(Message.make({ _tag: "Done" }))
    const concurrent = Command.make("C", { args: {} }, done)
    const switching = Command.make("S", { args: {}, mode: "switch" }, done)
    const dropping = Command.make("D", { args: {}, mode: "drop" }, done)
    const queueing = Command.make("Q", { args: { key: Schema.String }, mode: "queue", group: ["key"] }, done)
    const q = (key: string) => queueing({ key })
    const entry = (
      command: Command.Issued<any, any, any, "Effect">,
      status: "running" | "queued" = "running"
    ): schedule.Entry<string> => ({
      name: command.name,
      key: command.groupKey,
      mode: command.mode,
      status,
      value: `${command.name}:${command.groupKey ?? ""}:${status}`
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

    it("queue waits per group, and the oldest queued run starts when the running one ends", () => {
      const a = entry(q("a"))
      assert.strictEqual(schedule.schedule([a], q("a")).action, "queue")
      assert.strictEqual(schedule.schedule([a], q("b")).action, "start")
      const queued1 = entry(q("a"), "queued")
      const queued2 = { ...entry(q("a"), "queued"), value: "second" }
      assert.strictEqual(schedule.next([queued1, queued2], a), queued1)
      assert.strictEqual(schedule.next([a, queued1], { ...a, value: "another" }), undefined)
    })

    it("an interrupt stops nothing new and interrupts by name, or by name and group", () => {
      const a = entry(q("a"))
      const b = entry(q("b"))
      assert.deepStrictEqual(schedule.schedule([a, b], Command.interrupt(queueing)).interrupt, [a, b])
      assert.deepStrictEqual(schedule.schedule([a, b], Command.interrupt(queueing, { key: "b" })), {
        action: "none",
        interrupt: [b]
      })
    })
  })
})
