import { Chunk } from "../../src/collection/immutable/Chunk"
import { List } from "../../src/collection/immutable/List"
// import { Tuple } from "../../src/collection/immutable/Tuple"
import { Duration } from "../../src/data/Duration"
import type { Has } from "../../src/data/Has"
import type { HasClock, TestClock } from "../../src/io/Clock"
import { HasTestClock } from "../../src/io/Clock"
// import type { RIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import * as Fiber from "../../src/io/Fiber"
import { Promise } from "../../src/io/Promise"
import { Ref } from "../../src/io/Ref"
import { Schedule } from "../../src/io/Schedule"
import * as Equal from "../../src/prelude/Equal"

/**
 * A function that increments ref each time it is called. It always fails,
 * with the incremented value in error.
 */
function alwaysFail(ref: Ref<number>): Effect<unknown, string, number> {
  return ref.updateAndGet((n) => n + 1).flatMap((n) => Effect.fail(`Error: ${n}`))
}

// function checkDelays<State, Env>(
//   schedule: Schedule.WithState<State, Env, unknown, Duration>
// ): RIO<Env, Tuple<[Chunk<Duration>, Chunk<Duration>]>> {
//   return Effect.Do()
//     .bind("now", () => Effect.succeed(Date.now()))
//     .bindValue("input", () => Chunk(1, 2, 3, 4, 5))
//     .bind("actual", ({ input, now }) => schedule.run(now, input))
//     .bind("expected", ({ input, now }) => schedule.delays().run(now, input))
//     .map(({ actual, expected }) => Tuple(actual, expected))
// }

// function checkRepetitions<State, Env>(
//   schedule: Schedule.WithState<State, Env, unknown, number>
// ): RIO<Env, Tuple<[Chunk<number>, Chunk<number>]>> {
//   return Effect.Do()
//     .bind("now", () => Effect.succeed(Date.now()))
//     .bindValue("input", () => Chunk(1, 2, 3, 4, 5))
//     .bind("actual", ({ input, now }) => schedule.run(now, input))
//     .bind("expected", ({ input, now }) => schedule.repetitions().run(now, input))
//     .map(({ actual, expected }) => Tuple(actual, expected))
// }

function repeat<State, B>(
  schedule: Schedule.WithState<State, unknown, number, B>
): Effect<HasClock, never, B> {
  return Ref.make(0).flatMap((ref) => ref.updateAndGet((n) => n + 1).repeat(schedule))
}

function run<R, E, A>(effect: Effect<R, E, A>): Effect<Has<TestClock> & R, E, A> {
  return effect
    .fork()
    .tap(() =>
      Effect.serviceWith(HasTestClock)((testClock) =>
        testClock.adjust(Duration.Infinity)
      )
    )
    .flatMap(Fiber.join)
}

/**
 * Run a `Schedule` using the provided input and collect all outputs.
 */
export function runCollect<State, Env, In, Out>(
  schedule: Schedule.WithState<State, Env, In, Out>,
  input: Iterable<In>
): Effect<Has<TestClock> & Env, never, Chunk<Out>> {
  return run(
    schedule.driver().flatMap((driver) => {
      function loop(
        input: List<In>,
        acc: Chunk<Out>
      ): Effect<Has<TestClock> & Env, never, Chunk<Out>> {
        return input.foldLeft(
          () => Effect.succeed(acc),
          (head, tail) =>
            driver.next(head).foldEffect(
              () =>
                driver.last.fold(
                  () => acc,
                  (b) => acc.append(b)
                ),
              (b) => loop(tail, acc.append(b))
            )
        )
      }
      return loop(List.from(input), Chunk.empty())
    })
  )
}

describe("Schedule", () => {
  describe("repeat on success according to a provided strategy", () => {
    it("for 'recurs(a negative number)' repeats 0 additional time", async () => {
      // A repeat with a negative number of times should not repeat the action at all
      const program = repeat(Schedule.recurs(-5))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("for 'recurs(0)' does repeat 0 additional time", async () => {
      // A repeat with 0 number of times should not repeat the action at all
      const program = repeat(Schedule.recurs(0))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("for 'recurs(1)' does repeat 1 additional time", async () => {
      const program = repeat(Schedule.recurs(1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("for 'once' will repeat 1 additional time", async () => {
      const program = Ref.make(0)
        .tap((ref) => ref.update((n) => n + 1).repeat(Schedule.once))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(2)
    })

    it("for 'recurs(a positive given number)' repeats that additional number of time", async () => {
      const program = repeat(Schedule.recurs(42))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("for 'recurWhile(cond)' repeats while the cond still holds", async () => {
      const program = repeat(Schedule.recurWhile((n) => n < 10))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("for 'recurWhileEffect(cond)' repeats while the effectful cond still holds", async () => {
      const program = repeat(Schedule.recurWhileEffect((n) => Effect.succeed(n > 10)))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("for 'recurWhileEquals(cond)' repeats while the cond is equal", async () => {
      const program = repeat(Schedule.recurWhileEquals(Equal.number)(1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("for 'recurUntil(cond)' repeats until the cond is satisfied", async () => {
      const program = repeat(Schedule.recurUntil((n) => n < 10))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("for 'recurUntilEffect(cond)' repeats until the effectful cond is satisfied", async () => {
      const program = repeat(Schedule.recurUntilEffect((n) => Effect.succeed(n > 10)))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("for 'recurUntilEquals(cond)' repeats until the cond is equal", async () => {
      const program = repeat(Schedule.recurUntilEquals(Equal.number)(1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("collect all inputs into a list", () => {
    it("as long as the condition f holds", async () => {
      const program = repeat(Schedule.collectWhile((n) => n < 10)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it("as long as the effectful condition f holds", async () => {
      const program = repeat(
        Schedule.collectWhileEffect((n) => Effect.succeed(n > 10))
      ).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([])
    })

    it("until the effectful condition f fails", async () => {
      const program = repeat(Schedule.collectUntil((n) => n < 10 && n > 1)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1])
    })

    it("until the effectful condition f fails", async () => {
      const program = repeat(
        Schedule.collectUntilEffect((n) => Effect.succeed(n > 10))
      ).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })
  })

  describe("repeat an action a single time", () => {
    it("Repeat on failure does not actually repeat", async () => {
      const program = Ref.make(0)
        .flatMap(alwaysFail)
        .foldEffect(
          (e) => Effect.succeed(e),
          () => Effect.succeed("it should never be a success")
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("Error: 1")
    })

    it("repeat a scheduled repeat repeats the whole number", async () => {
      const n = 42
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("io", ({ ref }) =>
          ref.update((n) => n + 1).repeat(Schedule.recurs(n))
        )
        .tap(({ io }) => io.repeat(Schedule.recurs(1)))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe((n + 1) * 2)
    })
  })

  describe("repeat an action two times and call ensuring should", () => {
    it("run the specified finalizer as soon as the schedule is complete", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(0))
        .tap(({ promise, ref }) =>
          ref
            .update((n) => n + 2)
            .repeat(Schedule.recurs(2))
            .ensuring(promise.succeed(undefined))
        )
        .bind("value", ({ ref }) => ref.get())
        .bind("finalizerValue", ({ promise }) => promise.poll())

      const { finalizerValue, value } = await program.unsafeRunPromise()

      expect(value).toBe(6)
      expect(finalizerValue.isSome()).toBe(true)
    })
  })

  // describe("simulate a schedule", () => {
  //   it("without timing out", async () => {
  //     const program = Clock.currentTime
  //       .flatMap((now) =>
  //         Schedule.exponential(Duration.fromMinutes(1)).run(
  //           now,
  //           List.repeat(undefined, 5)
  //         )
  //       )
  //       .map((chunk) => chunk.toArray())

  //     const result = await program.unsafeRunPromise()

  //     expect(result).toEqual([
  //       Duration.fromMinutes(1),
  //       Duration.fromMinutes(2),
  //       Duration.fromMinutes(4),
  //       Duration.fromMinutes(8),
  //       Duration.fromMinutes(16)
  //     ])
  //   })
  // })
})
