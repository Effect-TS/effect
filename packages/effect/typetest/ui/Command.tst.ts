import { Effect, Schema, Stream } from "effect"
import { Command, type Component } from "effect/ui"
import { describe, expect, it } from "tstyche"

const Message = Schema.TaggedUnion({ Got: { n: Schema.Number } })

const Fx = Command.make("Fx", () => Effect.succeed("text"))
const St = Command.make("St", () => Stream.fromIterable(["text"]), { stream: true })
class SA extends Command.Service<SA>()("SA", Effect.succeed(() => Effect.succeed("a")), { invalidates: () => [] }) {}
class SB extends Command.Service<SB>()("SB", Effect.succeed(() => Stream.fromIterable([1])), {
  stream: true,
  invalidates: () => []
}) {}
class Boom {
  readonly _tag = "Boom"
}
interface User {
  readonly id: string
  readonly name: string
}
class Rename extends Command.Service<Rename>()(
  "Rename",
  Effect.succeed((id: string, name?: string): Effect.Effect<User, Boom> =>
    name === undefined ? Effect.fail(new Boom()) : Effect.succeed({ id, name })
  ),
  {
    invalidates: (id) => [{ id }],
    optimistic: (id, name) => [{ id, name }],
    writes: (user, id) => [{ id, name: user.name }]
  }
) {}
class Feed extends Command.Service<Feed>()(
  "Feed",
  Effect.succeed((_room: string): Stream.Stream<number, Boom> => Stream.fail(new Boom())),
  { stream: true, invalidates: (room) => [room.length] }
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
    it("requires the third parameter with invalidates, and has no server option", () => {
      const service = Command.Service<"Load">()
      expect(service).type.not.toBeCallableWith("Load", Effect.succeed(() => Effect.succeed(1)))
      expect(service).type.not.toBeCallableWith("Load", Effect.succeed(() => Effect.succeed(1)), {})
      expect(service).type.toBeCallableWith("Load", Effect.succeed(() => Effect.succeed(1)), { invalidates: () => [] })
      // make has none of them.
      expect(Command.make).type.not.toBeCallableWith("Load", () => Effect.succeed(1), { invalidates: () => [] })
    })

    it("a stream Service has invalidates and no writes", () => {
      const service = Command.Service<"Feed">()
      expect(service).type.toBeCallableWith("Feed", Effect.succeed(() => Stream.fromIterable([1])), {
        stream: true,
        invalidates: () => []
      })
      expect(service).type.not.toBeCallableWith("Feed", Effect.succeed(() => Stream.fromIterable([1])), {
        stream: true,
        invalidates: () => [],
        writes: () => []
      })
    })

    it("a body that can't fail issues a Command directly", () => {
      expect(SA.make()).type.toBe<Command.Effectful<string, SA>>()
      expect(SB.make()).type.toBe<Command.Streaming<number, SB>>()
      expect($.run).type.toBeCallableWith(
        SA.make().pipe(Command.map((a) => Message.make({ _tag: "Got", n: a.length })))
      )
    })

    it("a body that can fail issues an Unmatched Command, which $.run and map reject", () => {
      const unmatched = Rename.make("1", "Ada")
      expect(unmatched).type.toBe<Command.Unmatched<User, Boom, Rename, "Effect">>()
      expect(unmatched.effect).type.toBe<Effect.Effect<User, Boom, Rename>>()
      expect(Feed.make("lobby")).type.toBe<Command.Unmatched<number, Boom, Feed, "Stream">>()
      expect($.run).type.not.toBeCallableWith(unmatched)
      expect(unmatched.pipe).type.not.toBeCallableWith(Command.map((user: User) => user.name))
      // Optional positional arguments stay optional, whatever the options' callbacks take.
      expect(Rename.make).type.toBeCallableWith("1")
      expect(Rename.make).type.toBeCallableWith("1", "Ada")
    })
  })

  describe("match", () => {
    it("infers both channels in a pipe and yields a Command the component can run", () => {
      const matched = Rename.make("1", "Ada").pipe(Command.match({
        onSuccess: (user) => Message.make({ _tag: "Got", n: user.name.length }),
        onFailure: (boom) => Message.make({ _tag: "Got", n: boom._tag.length })
      }))
      expect(matched).type.toBe<Command.Effectful<typeof Message.Type, Rename, User, Boom>>()
      expect(matched.effect).type.toBe<Effect.Effect<typeof Message.Type, never, Rename>>()
      expect($.run).type.toBeCallableWith(matched)
      expect<Command.Result<typeof matched>>().type.toBe<User>()
      expect<Command.Failure<typeof matched>>().type.toBe<Boom>()
      expect<Command.Result<typeof Rename>>().type.toBe<User>()
      expect<Command.Failure<typeof Rename>>().type.toBe<Boom>()
    })

    it("needs both handlers", () => {
      expect(Command.match).type.not.toBeCallableWith(Rename.make("1"), { onSuccess: (user: User) => user.name })
    })

    it("maps each element and the failure of a stream Command, and composes with map", () => {
      const matched = Feed.make("lobby").pipe(
        Command.match({ onSuccess: (n) => n + 1, onFailure: (boom) => boom._tag.length }),
        Command.map((n) => Message.make({ _tag: "Got", n }))
      )
      expect(matched).type.toBe<Command.Streaming<typeof Message.Type, Feed, number, Boom>>()
      expect($.run).type.toBeCallableWith(matched)
    })

    it("the data-first form infers too", () => {
      const matched = Command.match(Rename.make("1"), {
        onSuccess: (user) => user.name,
        onFailure: (boom) => boom._tag
      })
      expect(matched).type.toBe<Command.Effectful<string, Rename, User, Boom>>()
    })

    it("what a Service declares is readable off the issued Command", () => {
      expect(Rename.make("1").invalidates).type.toBe<ReadonlyArray<Command.Target>>()
      expect(Rename.make("1").optimistic).type.toBe<ReadonlyArray<Command.Patch>>()
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
