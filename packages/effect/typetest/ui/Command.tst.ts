import { Effect, Schema, Stream } from "effect"
import { Command, type Component } from "effect/ui"
import { describe, expect, it } from "tstyche"

const Message = Schema.TaggedUnion({ Got: { n: Schema.Number } })

const Fx = Command.make("Fx", () => Effect.succeed("text"))
const St = Command.make("St", () => Stream.fromIterable(["text"]), { stream: true })
class SA extends Command.Service<SA>()("SA", Effect.succeed(() => Effect.succeed("a"))) {}
class SB extends Command.Service<SB>()("SB", Effect.succeed(() => Stream.fromIterable([1])), { stream: true }) {}
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
      expect(service).type.toBeCallableWith("Load", Effect.succeed(() => Effect.succeed(1)), { server: true })
      expect(service).type.not.toBeCallableWith("Load", Effect.succeed(() => Stream.fromIterable([1])), {
        stream: true,
        server: true
      })
      // Factories from make can't be server Commands.
      expect(Command.make).type.not.toBeCallableWith("Load", () => Effect.succeed(1), { server: true })
    })
  })

  describe("a Command that never produces a result", () => {
    it("is accepted by any component's $.run", () => {
      const Hold = Command.make("Hold", () => Effect.never)
      const Die = Command.make("Die", () => Effect.die("boom"))
      const Watch = Command.make("Watch", () => Stream.never, { stream: true })
      expect($.run).type.toBeCallableWith(Hold())
      expect($.run).type.toBeCallableWith(Die())
      expect($.run).type.toBeCallableWith(Watch())
      expect($.run).type.toBeCallableWith(
        Hold().pipe(Command.map((): typeof Message.Type => Message.make({ _tag: "Got", n: 1 })))
      )
    })
  })
})
