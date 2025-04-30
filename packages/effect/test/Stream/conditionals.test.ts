import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constFalse, constTrue, constVoid, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("when - returns the stream if the condition is satisfied", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.when(constTrue), Stream.runCollect),
        result2: Stream.runCollect(stream)
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("when - returns an empty stream if the condition is not satisfied", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3, 4, 5),
        Stream.when(constFalse),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("when - dies if the condition throws an exception", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.when(() => {
          throw error
        }),
        Stream.runDrain,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("whenCase - returns the resulting stream if the given partial function is defined for the given value", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.whenCase(
          () => Option.some(1),
          (option) =>
            Option.isSome(option) ?
              Option.some(Stream.make(option.value)) :
              Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1])
    }))

  it.effect("whenCase - returns an empty stream if the given partial function is not defined for the given value", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.whenCase(
          () => Option.none(),
          (option) =>
            Option.isSome(option) ?
              Option.some(Stream.make(option.value)) :
              Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("whenCase - dies if evaluating the given value throws an exception", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.whenCase(
          () => {
            throw error
          },
          () => Option.some(Stream.empty)
        ),
        Stream.runDrain,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("whenCase - dies if the partial function throws an exception", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.whenCase(
          constVoid,
          (): Option.Option<Stream.Stream<void>> => {
            throw error
          }
        ),
        Stream.runDrain,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("whenCaseEffect - returns the resulting stream if the given partial function is defined for the given effectful value", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.succeed(Option.some(1)),
        Stream.whenCaseEffect(
          (option) =>
            Option.isSome(option) ?
              Option.some(Stream.make(option.value)) :
              Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1])
    }))

  it.effect("whenCaseEffect - returns an empty stream if the given partial function is not defined for the given effectful value", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.succeed<Option.Option<number>>(Option.none()),
        Stream.whenCaseEffect(
          (option) =>
            Option.isSome(option) ?
              Option.some(Stream.make(option.value)) :
              Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("whenCaseEffect - fails if the effectful value is a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Effect.fail(error),
        Stream.whenCaseEffect(() => Option.some(Stream.empty)),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("whenCaseEffect - dies if the given partial function throws an exception", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Effect.void,
        Stream.whenCaseEffect((): Option.Option<Stream.Stream<void>> => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("whenEffect - returns the stream if the effectful condition is satisfied", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3, 4, 5),
        Stream.whenEffect(Effect.succeed(true)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, 2, 3, 4, 5])
    }))

  it.effect("whenEffect - returns an empty stream if the effectful condition is not satisfied", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3, 4, 5),
        Stream.whenEffect(Effect.succeed(false)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("whenEffect - fails if the effectful condition fails", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.whenEffect(Effect.fail(error)),
        Stream.runDrain,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))
})
