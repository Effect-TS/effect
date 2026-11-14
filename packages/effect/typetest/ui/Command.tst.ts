import { Context, Data, Effect, Schema, Stream } from "effect"
import { Command, Component, Renderer } from "effect/ui"
import { describe, expect, it } from "tstyche"

const Message = Schema.TaggedUnion({ Got: { n: Schema.Number } })

const Fx = Command.make("Fx", { args: {} }, () => Effect.succeed("text"))
const St = Command.make("St", { args: {}, stream: true }, () => Stream.fromIterable(["text"]))
class SA
  extends Command.Service<SA>()("SA", { args: {}, invalidates: () => [] }, Effect.succeed(() => Effect.succeed("a")))
{}
class SB extends Command.Service<SB>()(
  "SB",
  { args: {}, stream: true, invalidates: () => [] },
  Effect.succeed(() => Stream.fromIterable([1]))
) {}
class SaveFailed extends Data.TaggedError("SaveFailed")<{ readonly reason: string }> {}
class Save extends Command.Service<Save>()(
  "Save",
  { args: { id: Schema.String, title: Schema.String }, group: ["id"], mode: "queue", invalidates: () => [] },
  Effect.succeed(({ title }) => title === "" ? Effect.fail(new SaveFailed({ reason: "empty" })) : Effect.succeed(title))
) {}
declare const condition: boolean
declare const $: Component.Update<{}, typeof Message.Type, never, {}>
declare const $init: Component.Init<{}, typeof Message.Type, never, {}>
declare const $never: Component.Update<{}, never, never, {}>

describe("Command", () => {
  describe("Issued", () => {
    it("only exposes the work field of its kind", () => {
      expect(Fx().effect).type.toBe<Effect.Effect<string, never, never>>()
      expect(Fx().stream).type.toBe<undefined>()
      expect(St().stream).type.toBe<Stream.Stream<string, never, never>>()
      expect(St().effect).type.toBe<undefined>()
      expect(Effect.runSync).type.not.toBeCallableWith(St().effect)
      expect(Stream.runCollect).type.not.toBeCallableWith(Fx().stream)
    })

    it("narrows on _tag", () => {
      const command: Command.Command<string> = condition ? Fx() : St()
      if (command._tag === "Effect") expect(command.effect).type.toBe<Effect.Effect<string, never, never>>()
      if (command._tag === "Stream") expect(command.stream).type.toBe<Stream.Stream<string, never, never>>()
    })
  })

  describe("map", () => {
    it("keeps the kind and the source result", () => {
      const toMessage = (text: string) => Message.make({ _tag: "Got", n: text.length })
      expect(Fx().pipe(Command.map(toMessage))).type.toBe<
        Command.Issued<typeof Message.Type, never, string, "Effect">
      >()
      expect(St().pipe(Command.map(toMessage))).type.toBe<
        Command.Issued<typeof Message.Type, never, string, "Stream">
      >()
      expect(Command.map(Command.interrupt(Fx), toMessage)).type.toBe<Command.Interrupt>()
    })

    it("maps a mixed-kind Command to a union the component can run", () => {
      const input = condition ? Fx() : St()
      const mapped = input.pipe(Command.map((text) => Message.make({ _tag: "Got", n: text.length })))
      expect(mapped).type.toBe<
        | Command.Issued<typeof Message.Type, never, string, "Effect">
        | Command.Issued<typeof Message.Type, never, string, "Stream">
      >()
      expect($.run).type.toBeCallableWith(mapped)
      expect($.run).type.toBeCallableWith(Command.map(input, (text) => Message.make({ _tag: "Got", n: text.length })))
      expect($.run).type.not.toBeCallableWith(input)
    })

    it("chained pipeable maps keep one Command's source and requirements", () => {
      const chained = SA.make().pipe(
        Command.map((a) => a.length),
        Command.map((n) => Message.make({ _tag: "Got", n }))
      )
      expect(chained).type.toBe<Command.Issued<typeof Message.Type, SA, string, "Effect">>()
      const stream = SB.make().pipe(
        Command.map((n) => n + 1),
        Command.map((n) => Message.make({ _tag: "Got", n }))
      )
      expect(stream).type.toBe<Command.Issued<typeof Message.Type, SB, number, "Stream">>()
    })

    it("data-first maps keep each branch's source and requirements across a mixed union", () => {
      const input = condition ? Command.map(SA.make(), (a) => a.length) : SB.make()
      expect(input).type.toBe<
        Command.Issued<number, SA, string, "Effect"> | Command.Issued<number, SB, number, "Stream">
      >()
      const once = Command.map(input, (n) => n + 1)
      expect(once).type.toBe<
        Command.Issued<number, SA, string, "Effect"> | Command.Issued<number, SB, number, "Stream">
      >()
      const twice = Command.map(once, (n) => Message.make({ _tag: "Got", n }))
      expect(twice).type.toBe<
        | Command.Issued<typeof Message.Type, SA, string, "Effect">
        | Command.Issued<typeof Message.Type, SB, number, "Stream">
      >()
      expect($.run).type.toBeCallableWith(twice)
      // The pipeable form infers one source for its input, so a mixed-source union
      // doesn't fit it: use the data-first form above.
      expect(input.pipe).type.not.toBeCallableWith(Command.map((n: number) => n + 1))
    })
  })

  describe("as", () => {
    it("preserves kind, source and requirements in both forms", () => {
      const message = Message.make({ _tag: "Got", n: 1 })
      expect(SA.make().pipe(Command.as(message))).type.toBe<Command.Issued<typeof Message.Type, SA, string, "Effect">>()
      expect(Command.as(SB.make(), message)).type.toBe<Command.Issued<typeof Message.Type, SB, number, "Stream">>()
      expect(Command.as(Command.interrupt(Fx), message)).type.toBe<Command.Interrupt>()
      const input = condition ? SA.make() : SB.make()
      expect(Command.as(input, message)).type.toBe<
        | Command.Issued<typeof Message.Type, SA, string, "Effect">
        | Command.Issued<typeof Message.Type, SB, number, "Stream">
      >()
      const matched = Save.make({ id: "t1", title: "" }).pipe(
        Command.match({ onSuccess: () => 1, onFailure: () => 0 }),
        Command.as(message)
      )
      expect(matched).type.toBe<Command.Issued<typeof Message.Type, Save, string, "Effect", SaveFailed>>()
      expect(Command.as).type.not.toBeCallableWith(Save.make({ id: "t1", title: "" }), message)
      expect(Command.interrupt(Fx).pipe).type.not.toBeCallableWith(Command.as(message))
    })
  })

  describe("Service", () => {
    it("has no server option: no Command runs on the server", () => {
      const service = Command.Service<"Load">()
      expect(service).type.not.toBeCallableWith(
        "Load",
        { args: {}, invalidates: () => [], server: true },
        Effect.succeed(() => Effect.succeed(1))
      )
      expect(service).type.not.toBeCallableWith(
        "Load",
        { args: {}, invalidates: () => [], stream: true, server: true },
        Effect.succeed(() => Stream.fromIterable([1]))
      )
      expect(Command.make).type.not.toBeCallableWith("Load", { args: {}, server: true }, () => Effect.succeed(1))
    })

    it("requires args but allows omitted invalidates", () => {
      const service = Command.Service<"Load">()
      expect(service).type.toBeCallableWith("Load", { args: {} }, Effect.succeed(() => Effect.succeed(1)))
      expect(service).type.not.toBeCallableWith(
        "Load",
        { invalidates: () => [] },
        Effect.succeed(() => Effect.succeed(1))
      )
      expect(Command.make).type.not.toBeCallableWith("Fx", {}, () => Effect.succeed(1))
    })

    it("types the body's args, and make takes them", () => {
      expect(Save.make).type.toBeCallableWith({ id: "t1", title: "milk" })
      expect(Save.make).type.not.toBeCallableWith({ id: "t1" })
      expect(SA.make).type.toBeCallableWith()
    })

    it("a body that captures a service it should have taken at build time is rejected", () => {
      class Db extends Context.Service<Db, { readonly save: Effect.Effect<void> }>()("Db") {}
      expect(Command.Service<"Bad">()).type.not.toBeCallableWith(
        "Bad",
        { args: {}, invalidates: () => [] },
        Effect.succeed(() => Db.use((db) => db.save))
      )
    })
  })

  describe("make", () => {
    it("may only require framework services", () => {
      class Db extends Context.Service<Db, { readonly save: Effect.Effect<void> }>()("Db") {}
      expect(Command.make).type.toBeCallableWith(
        "Look",
        { args: {} },
        () => Renderer.Refs.use(() => Effect.succeed(1))
      )
      expect(Command.make).type.not.toBeCallableWith(
        "Bad",
        { args: {} },
        () => Db.use((db) => db.save)
      )
    })
  })

  describe("group", () => {
    it("names args fields whose encoded form is JSON", () => {
      expect(Command.make).type.toBeCallableWith(
        "Page",
        { args: { tab: Schema.String, page: Schema.NumberFromString }, group: ["tab", "page"] },
        () => Effect.void
      )
      expect(Command.make).type.not.toBeCallableWith(
        "Page",
        { args: { tab: Schema.String }, group: ["other"] },
        () => Effect.void
      )
      expect(Command.make).type.not.toBeCallableWith(
        "Upload",
        { args: { file: Schema.instanceOf(File) }, group: ["file"] },
        () => Effect.void
      )
    })

    it("interrupt takes a pick of the group fields, or nothing", () => {
      expect(Command.interrupt).type.toBeCallableWith(Save, { id: "t1" })
      expect(Command.interrupt).type.toBeCallableWith(Save)
      expect(Command.interrupt).type.not.toBeCallableWith(Save, { title: "milk" })
      expect(Command.interrupt).type.not.toBeCallableWith(Fx, {})
    })
  })

  describe("match", () => {
    const matched = Save.make({ id: "t1", title: "milk" }).pipe(Command.match({
      onSuccess: (title) => Message.make({ _tag: "Got", n: title.length }),
      onFailure: (error) => Message.make({ _tag: "Got", n: error.reason.length })
    }))

    it("a body with a typed error issues an Unmatched Command, which $.run doesn't take", () => {
      const unmatched = Save.make({ id: "t1", title: "milk" })
      expect(unmatched).type.toBe<Command.Unmatched<string, SaveFailed, Save, "Effect">>()
      expect($.run).type.not.toBeCallableWith(unmatched)
      expect(Command.map).type.not.toBeCallableWith(unmatched, (title: string) => title)
    })

    it("maps both channels, keeping the source result and failure", () => {
      expect(matched).type.toBe<Command.Issued<typeof Message.Type, Save, string, "Effect", SaveFailed>>()
      expect($.run).type.toBeCallableWith(matched)
      expect<Command.Failure<typeof matched>>().type.toBe<SaveFailed>()
    })

    it("doesn't take a Command whose body can't fail", () => {
      expect(Command.match).type.not.toBeCallableWith(SA.make(), {
        onSuccess: (a: string) => a,
        onFailure: (e: never) => e
      })
    })
  })

  describe("afterRefetch", () => {
    it("takes an Effect Service Command on either side of match and map, and keeps its type", () => {
      const unmatched = Save.make({ id: "t1", title: "milk" })
      expect(unmatched.pipe(Command.afterRefetch("5 seconds"))).type.toBe<
        Command.Unmatched<string, SaveFailed, Save, "Effect">
      >()
      const matched = unmatched.pipe(
        Command.afterRefetch("Infinity"),
        Command.match({ onSuccess: (title) => title.length, onFailure: (error) => error.reason.length })
      )
      expect(matched).type.toBe<Command.Issued<number, Save, string, "Effect", SaveFailed>>()
      expect(matched.pipe(Command.afterRefetch(5))).type.toBe<
        Command.Issued<number, Save, string, "Effect", SaveFailed>
      >()
      expect(SA.make().pipe(Command.map((a) => a.length), Command.afterRefetch("1 second"))).type.toBe<
        Command.Issued<number, SA, string, "Effect">
      >()
      expect(Command.afterRefetch(SA.make(), "1 second")).type.toBe<Command.Issued<string, SA, string, "Effect">>()
    })

    it("rejects a Stream Command and a Command.make Command", () => {
      expect(Command.afterRefetch).type.not.toBeCallableWith(SB.make(), "1 second")
      expect(Command.afterRefetch).type.not.toBeCallableWith(Fx(), "1 second")
      expect(Command.afterRefetch).type.not.toBeCallableWith(St(), "1 second")
      expect(Command.afterRefetch("1 second")).type.not.toBeCallableWith(Fx())
      expect(Command.afterRefetch("1 second")).type.not.toBeCallableWith(SB.make())
    })
  })

  describe("a Command that never produces a result", () => {
    it("is accepted by any component's $.run", () => {
      const Hold = Command.make("Hold", { args: {} }, () => Effect.never)
      const Die = Command.make("Die", { args: {} }, () => Effect.die("boom"))
      const Watch = Command.make("Watch", { args: {}, stream: true }, () => Stream.never)
      expect($.run).type.toBeCallableWith(Hold())
      expect($.run).type.toBeCallableWith(Die())
      expect($.run).type.toBeCallableWith(Watch())
      expect($.run).type.toBeCallableWith(
        Hold().pipe(Command.map((): typeof Message.Type => Message.make({ _tag: "Got", n: 1 })))
      )
    })
  })
  describe("Component.noop", () => {
    type Msg = typeof Message.Type
    const got = Message.make({ _tag: "Got", n: 1 })
    const Quiet = Command.make("Quiet", { args: {} }, () => Effect.succeed(Component.noop))
    const QuietAs = Command.make("QuietAs", { args: {} }, () => Effect.succeed(1).pipe(Effect.as(Component.noop)))
    const QuietMap = Command.make("QuietMap", { args: {} }, () => Effect.map(Effect.succeed(1), () => Component.noop))
    const Either = Command.make("Either", { args: {} }, () =>
      Effect.gen(function*() {
        const n = yield* Effect.succeed(1)
        if (n > 0) return Component.noop
        return got
      }))
    const QuietStream = Command.make("QuietStream", { args: {}, stream: true }, () => Stream.make(Component.noop, got))

    it("a body, a generator and a mapper may end with it, and keep its type", () => {
      expect(Quiet()).type.toBe<Command.Issued<Component.Noop, never, Component.Noop, "Effect">>()
      expect(QuietAs()).type.toBe<Command.Issued<Component.Noop, never, Component.Noop, "Effect">>()
      expect(QuietMap()).type.toBe<Command.Issued<Component.Noop, never, Component.Noop, "Effect">>()
      expect<Command.Issued<Msg | Component.Noop, never, Msg | Component.Noop, "Effect">>().type.toBeAssignableFrom(
        Either()
      )
      expect(Fx().pipe(Command.map(() => Component.noop))).type.toBe<
        Command.Issued<Component.Noop, never, string, "Effect">
      >()
    })

    it("$.run takes a Command ending in a message, Component.noop or either, in update and init", () => {
      for (const command of [Quiet(), QuietAs(), QuietMap(), Either(), QuietStream()]) {
        expect($.run).type.toBeCallableWith(command)
        expect($init.set({}).run).type.toBeCallableWith(command)
      }
      expect($.run).type.toBeCallableWith(Quiet(), Fx().pipe(Command.as(got)))
    })

    it("a component whose Message is Schema.Never runs a silent Command, and nothing else", () => {
      expect($never.run).type.toBeCallableWith(Quiet())
      expect($never.run).type.toBeCallableWith(Fx().pipe(Command.asNoop))
      expect($never.run).type.not.toBeCallableWith(Either())
    })

    it("$.run rejects the value itself, alone or in a union with a Command, and other results", () => {
      expect($.run).type.not.toBeCallableWith(Component.noop)
      expect($init.set({}).run).type.not.toBeCallableWith(Component.noop)
      const maybe = condition ? Quiet() : Component.noop
      expect($.run).type.not.toBeCallableWith(maybe)
      expect($init.set({}).run).type.not.toBeCallableWith(maybe)
      expect($.run).type.not.toBeCallableWith(Command.make("V", { args: {} }, () => Effect.void)())
      expect($.run).type.not.toBeCallableWith(Command.make("U", { args: {} }, () => Effect.succeed(undefined))())
      expect($.run).type.not.toBeCallableWith(Command.make("S", { args: {} }, () => Effect.succeed(Symbol.for("x")))())
      expect($.run).type.not.toBeCallableWith(Command.make("O", { args: {} }, () => Effect.succeed({}))())
      expect($.run).type.not.toBeCallableWith(Fx())
    })

    it("asNoop keeps the kind, source and requirements, in both forms, and takes no Unmatched Command", () => {
      expect(Fx().pipe(Command.asNoop)).type.toBe<Command.Issued<Component.Noop, never, string, "Effect">>()
      expect(Command.asNoop(St())).type.toBe<Command.Issued<Component.Noop, never, string, "Stream">>()
      expect(SA.make().pipe(Command.asNoop)).type.toBe<Command.Issued<Component.Noop, SA, string, "Effect">>()
      expect(Command.asNoop).type.not.toBeCallableWith(Save.make({ id: "t1", title: "milk" }))
      expect(Command.asNoop).type.not.toBeCallableWith(Component.noop)
    })

    it("a match branch may end with it", () => {
      const quietOnSuccess = Save.make({ id: "t1", title: "milk" }).pipe(Command.match({
        onSuccess: () => Component.noop,
        onFailure: (error) => Message.make({ _tag: "Got", n: error.reason.length })
      }))
      expect($.run).type.toBeCallableWith(quietOnSuccess)
      expect($never.run).type.not.toBeCallableWith(quietOnSuccess)
    })

    it("isNoop narrows both branches, and === only the true one", () => {
      const result = {} as string | Component.Noop
      if (Component.isNoop(result)) expect(result).type.toBe<Component.Noop>()
      else expect(result).type.toBe<string>()
      if (result !== Component.noop) expect(result).type.toBe<string | Component.Noop>()
    })
  })
})
