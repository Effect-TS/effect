import { List } from "../../../src/collection/immutable/List"
import { constFalse, constTrue } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("when", () => {
    it("returns the stream if the condition is satisfied", async () => {
      const program = Stream.when(true, Stream.range(0, 10)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(List.range(0, 10).toArray())
    })

    it("returns an empty stream if the condition is not satisfied", async () => {
      const program = Stream.when(false, Stream.range(0, 10)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("dies if the condition throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.when(() => {
        throw error
      }, Stream.range(0, 10)).runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })
  })

  describe("whenEffect", () => {
    it("returns the stream if the effectful condition is satisfied", async () => {
      const program = Stream.whenEffect(
        Effect.succeed(constTrue),
        Stream.range(0, 10)
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(List.range(0, 10).toArray())
    })

    it("returns an empty stream if the effectful condition is not satisfied", async () => {
      const program = Stream.whenEffect(
        Effect.succeed(constFalse),
        Stream.range(0, 10)
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("fails if the effectful condition fails", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenEffect(
        Effect.fail(error),
        Stream.range(0, 10)
      ).runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })
  })

  describe("whenCase", () => {
    it("returns the resulting stream if the given partial function is defined for the given value", async () => {
      const program = Stream.whenCase(Option.some(5), (n: Option<number>) =>
        n.isSome() ? Option.some(Stream(n.value)) : Option.none
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([5])
    })

    it("returns an empty stream if the given partial function is not defined for the given value", async () => {
      const program = Stream.whenCase(Option.none, (n: Option<number>) =>
        n.isSome() ? Option.some(Stream(n)) : Option.none
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("dies if evaluating the given value throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCase(
        () => {
          throw error
        },
        (n: Option<number>) => (n.isSome() ? Option.some(Stream(n.value)) : Option.none)
      ).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("dies if the given partial function throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCase(undefined, () => {
        throw error
      }).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })
  })

  describe("whenCaseEffect", () => {
    it("returns the resulting stream if the given partial function is defined for the given effectful value", async () => {
      const program = Stream.whenCaseEffect(
        Effect.succeed(Option.some(5)),
        (n: Option<number>) => (n.isSome() ? Option.some(Stream(n.value)) : Option.none)
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([5])
    })

    it("returns an empty stream if the given partial function is not defined for the given effectful value", async () => {
      const program = Stream.whenCaseEffect(Effect.none, (n: Option<number>) =>
        n.isSome() ? Option.some(Stream(n.value)) : Option.none
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("fails if the effectful value is a failure", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCaseEffect(Effect.fail(error), (n: Option<number>) =>
        n.isSome() ? Option.some(Stream(n)) : Option.none
      ).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })

    it("dies if the given partial function throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCaseEffect(Effect.unit, () => {
        throw error
      }).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })
  })
})
