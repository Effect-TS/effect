import { Context, Data, Effect, Schema, Stream } from "effect"
import { Command, type Component, Renderer } from "effect/ui"
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
      expect(Fx().pipe(Command.map(toMessage))).type.toBe<Command.Effectful<typeof Message.Type, never, string>>()
      expect(St().pipe(Command.map(toMessage))).type.toBe<Command.Streaming<typeof Message.Type, never, string>>()
      expect(Command.map(Command.interrupt(Fx), toMessage)).type.toBe<Command.Interrupt>()
    })

    it("maps a mixed-kind Command to a union the component can run", () => {
      const input = condition ? Fx() : St()
      const mapped = input.pipe(Command.map((text) => Message.make({ _tag: "Got", n: text.length })))
      expect(mapped).type.toBe<
        | Command.Effectful<typeof Message.Type, never, string>
        | Command.Streaming<typeof Message.Type, never, string>
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
      expect(chained).type.toBe<Command.Effectful<typeof Message.Type, SA, string>>()
      const stream = SB.make().pipe(
        Command.map((n) => n + 1),
        Command.map((n) => Message.make({ _tag: "Got", n }))
      )
      expect(stream).type.toBe<Command.Streaming<typeof Message.Type, SB, number>>()
    })

    it("data-first maps keep each branch's source and requirements across a mixed union", () => {
      const input = condition ? Command.map(SA.make(), (a) => a.length) : SB.make()
      expect(input).type.toBe<Command.Effectful<number, SA, string> | Command.Streaming<number, SB, number>>()
      const once = Command.map(input, (n) => n + 1)
      expect(once).type.toBe<Command.Effectful<number, SA, string> | Command.Streaming<number, SB, number>>()
      const twice = Command.map(once, (n) => Message.make({ _tag: "Got", n }))
      expect(twice).type.toBe<
        Command.Effectful<typeof Message.Type, SA, string> | Command.Streaming<typeof Message.Type, SB, number>
      >()
      expect($.run).type.toBeCallableWith(twice)
      // The pipeable form infers one source for its input, so a mixed-source union
      // doesn't fit it: use the data-first form above.
      expect(input.pipe).type.not.toBeCallableWith(Command.map((n: number) => n + 1))
    })
  })

  describe("Service", () => {
    it("takes server: true only for an Effect Command", () => {
      const service = Command.Service<"Load">()
      expect(service).type.toBeCallableWith(
        "Load",
        { args: {}, invalidates: () => [], server: true },
        Effect.succeed(() => Effect.succeed(1))
      )
      expect(service).type.not.toBeCallableWith(
        "Load",
        { args: {}, invalidates: () => [], stream: true, server: true },
        Effect.succeed(() => Stream.fromIterable([1]))
      )
      // Factories from make can't be server Commands.
      expect(Command.make).type.not.toBeCallableWith("Load", { args: {}, server: true }, () => Effect.succeed(1))
    })

    it("requires args and invalidates", () => {
      const service = Command.Service<"Load">()
      expect(service).type.not.toBeCallableWith("Load", { args: {} }, Effect.succeed(() => Effect.succeed(1)))
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
        Effect.succeed(() => Effect.flatMap(Effect.service(Db), (db) => db.save))
      )
    })
  })

  describe("make", () => {
    it("may only require framework services", () => {
      class Db extends Context.Service<Db, { readonly save: Effect.Effect<void> }>()("Db") {}
      expect(Command.make).type.toBeCallableWith(
        "Look",
        { args: {} },
        () => Effect.flatMap(Effect.service(Renderer.Refs), () => Effect.succeed(1))
      )
      expect(Command.make).type.not.toBeCallableWith(
        "Bad",
        { args: {} },
        () => Effect.flatMap(Effect.service(Db), (db) => db.save)
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
      expect(matched).type.toBe<Command.Effectful<typeof Message.Type, Save, string, SaveFailed>>()
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
})
