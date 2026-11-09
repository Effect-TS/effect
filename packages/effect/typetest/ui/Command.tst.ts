import { Effect, Schema, Stream } from "effect"
import { Command, type Component } from "effect/ui"
import { describe, expect, it } from "tstyche"

const Message = Schema.TaggedUnion({ Got: { n: Schema.Number } })

const Fx = Command.make("Fx", () => Effect.succeed("text"))
const St = Command.make("St", () => Stream.fromIterable(["text"]), { stream: true })
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
  })
})
