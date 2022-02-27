import { Chunk } from "../../src/collection/immutable/Chunk"
import { Tuple } from "../../src/collection/immutable/Tuple"
import { Either } from "../../src/data/Either"
import { identity } from "../../src/data/Function"
import { Option } from "../../src/data/Option"
import type { HasClock } from "../../src/io/Clock"
import { Clock } from "../../src/io/Clock"
import type { UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import * as Fiber from "../../src/io/Fiber"
import { FiberRef } from "../../src/io/FiberRef"
import { Promise } from "../../src/io/Promise"

const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"

const loseTimeAndCpu: Effect<HasClock, never, void> = (
  Effect.yieldNow < Clock.sleep(1)
).repeatN(100)

describe("FiberRef", () => {
  describe("Create a new FiberRef with a specified value and check if:", () => {
    it("`delete` restores the original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .tap(({ fiberRef }) => fiberRef.set(update))
        .tap(({ fiberRef }) => fiberRef.delete())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`get` returns the current value", async () => {
      const program = FiberRef.make(initial).flatMap((fiberRef) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`get` returns the correct value for a child", async () => {
      const program = FiberRef.make(initial)
        .flatMap((fiberRef) => fiberRef.get().fork())
        .flatMap(Fiber.join)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`getAndUpdate` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.getAndUpdate(() => update))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })

    it("`getAndUpdateSome` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          fiberRef.getAndUpdateSome(() => Option.some(update))
        )
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })

    it("`getAndUpdateSome` not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.getAndUpdateSome(() => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })

    it("`locally` restores original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("local", ({ fiberRef }) => fiberRef.get().apply(fiberRef.locally(update)))
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { local, value } = await program.unsafeRunPromise()

      expect(local).toBe(update)
      expect(value).toBe(initial)
    })

    it("`locally` restores parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) =>
          fiberRef.get().apply(fiberRef.locally(update)).fork()
        )
        .bind("local", ({ child }) => Fiber.join(child))
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { local, value } = await program.unsafeRunPromise()

      expect(local).toBe(update)
      expect(value).toBe(initial)
    })

    it("`locally` restores undefined value", async () => {
      const program = Effect.Do()
        .bind("child", () => FiberRef.make(initial).fork())
        // Don't use join as it inherits values from child
        .bind("fiberRef", ({ child }) =>
          Fiber.await(child).flatMap((_) => Effect.done(_))
        )
        .bind("localValue", ({ fiberRef }) =>
          fiberRef.get().apply(fiberRef.locally(update))
        )
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { localValue, value } = await program.unsafeRunPromise()

      expect(localValue).toBe(update)
      expect(value).toBe(initial)
    })

    it("`modify` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.modify(() => Tuple(1, update)))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(1)
      expect(value2).toBe(update)
    })

    it("`modifySome` not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.modifySome(2, () => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(2)
      expect(value2).toBe(initial)
    })

    it("`set` updates the current value", async () => {
      const program = FiberRef.make(initial)
        .tap((fiberRef) => fiberRef.set(update))
        .flatMap((fiberRef) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("`set` by a child doesn't update parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("promise", () => Promise.make<never, void>())
        .tap(({ fiberRef, promise }) =>
          fiberRef.set(update).zipRight(promise.succeed(undefined)).fork()
        )
        .tap(({ promise }) => promise.await())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`updateAndGet` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.updateAndGet(() => update))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })

    it("`updateSomeAndGet` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          fiberRef.updateSomeAndGet(() => Option.some(update))
        )
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })

    it("`updateSomeAndGet` not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.updateSomeAndGet(() => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })

    it("its value is inherited on join", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) => fiberRef.set(update).fork())
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("initial value is always available", async () => {
      const program = Effect.Do()
        .bind("child", () => FiberRef.make(initial).fork())
        .bind("fiberRef", ({ child }) =>
          Fiber.await(child).flatMap((_) => Effect.done(_))
        )
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("its value is inherited after simple race", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .tap(({ fiberRef }) => fiberRef.set(update1).race(fiberRef.set(update2)))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect([update1, update2]).toContain(result)
    })

    it("its value is inherited after a race with a bad winner", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue(
          "badWinner",
          ({ fiberRef }) => fiberRef.set(update1) > Effect.fail("ups")
        )
        .bindValue(
          "goodLoser",
          ({ fiberRef }) => fiberRef.set(update2) > loseTimeAndCpu
        )
        .tap(({ badWinner, goodLoser }) => badWinner.race(goodLoser))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const value = await program.unsafeRunPromise()

      expect(value).toContain(update2)
    })

    it("its value is not inherited after a race of losers", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("loser1", ({ fiberRef }) =>
          fiberRef.set(update1).zipRight(Effect.failNow("ups1"))
        )
        .bindValue("loser2", ({ fiberRef }) =>
          fiberRef.set(update2).zipRight(Effect.failNow("ups2"))
        )
        .tap(({ loser1, loser2 }) => loser1.race(loser2).ignore())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toContain(initial)
    })

    it("the value of the loser is inherited in zipPar", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "winner",
          ({ fiberRef, latch }) =>
            fiberRef.set(update1) > latch.succeed(undefined).asUnit()
        )
        .bindValue(
          "loser",
          ({ fiberRef, latch }) =>
            latch.await() > fiberRef.set(update2) > loseTimeAndCpu
        )
        .tap(({ loser, winner }) => winner.zipPar(loser))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const value = await program.unsafeRunPromise()

      expect(value).toBe(update2)
    })

    it("nothing gets inherited with a failure in zipPar", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("success", ({ fiberRef }) => fiberRef.set(update))
        .bindValue("failure1", ({ fiberRef }) =>
          fiberRef.set(update).zipRight(Effect.failNow(":-("))
        )
        .bindValue("failure2", ({ fiberRef }) =>
          fiberRef.set(update).zipRight(Effect.failNow(":-O"))
        )
        .tap(({ failure1, failure2, success }) =>
          success.zipPar(failure1.zipPar(failure2)).orElse(Effect.unit)
        )
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toContain(initial)
    })

    it("fork function is applied on fork - 1", async () => {
      function increment(x: number): number {
        return x + 1
      }

      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, increment))
        .bind("child", () => Effect.unit.fork())
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("fork function is applied on fork - 2", async () => {
      function increment(x: number): number {
        return x + 1
      }

      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, increment))
        .bind("child", () => Effect.unit.fork().flatMap(Fiber.join).fork())
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("join function is applied on join - 1", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, identity, Math.max))
        .bind("child", ({ fiberRef }) => fiberRef.update((_) => _ + 1).fork())
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("join function is applied on join - 2", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, identity, Math.max))
        .bind("child", ({ fiberRef }) => fiberRef.update((_) => _ + 1).fork())
        .tap(({ fiberRef }) => fiberRef.update((_) => _ + 2))
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("its value is inherited in a trivial race", async () => {
      const program = FiberRef.make(initial)
        .tap((fiberRef) => fiberRef.set(update).raceAll(Chunk.empty<UIO<void>>()))
        .flatMap((fiberRef) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("the value of the winner is inherited when racing two effects with raceAll", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "winner1",
          ({ fiberRef, latch }) => fiberRef.set(update1) > latch.succeed(undefined)
        )
        .bindValue(
          "loser1",
          ({ fiberRef, latch }) =>
            latch.await() > fiberRef.set(update2) > loseTimeAndCpu
        )
        .tap(({ loser1, winner1 }) => loser1.raceAll([winner1]))
        .bind("value1", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))
        .bindValue("winner2", ({ fiberRef }) => fiberRef.set(update1))
        .bindValue(
          "loser2",
          ({ fiberRef }) => fiberRef.set(update2) > Effect.fail(":-O")
        )
        .tap(({ loser2, winner2 }) => loser2.raceAll([winner2]))
        .bind("value2", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update1)
      expect(value2).toBe(update1)
    })

    it("the value of the winner is inherited when racing many effects with raceAll", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("n", () => 63)
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "winner1",
          ({ fiberRef, latch }) => fiberRef.set(update1) > latch.succeed(undefined)
        )
        .bindValue("losers1", ({ fiberRef, latch, n }) =>
          (latch.await() > fiberRef.set(update2) > loseTimeAndCpu).replicate(n)
        )
        .tap(({ losers1, winner1 }) => winner1.raceAll(losers1))
        .bind("value1", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))
        .bindValue("winner2", ({ fiberRef }) => fiberRef.set(update1))
        .bindValue("losers2", ({ fiberRef, n }) =>
          (fiberRef.set(update1) > Effect.fail(":-O")).replicate(n)
        )
        .tap(({ losers2, winner2 }) => winner2.raceAll(losers2))
        .bind("value2", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update1)
      expect(value2).toBe(update1)
    })

    it("nothing gets inherited when racing failures with raceAll", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("loser", ({ fiberRef }) =>
          fiberRef.set(update).zipRight(Effect.failNow("darn"))
        )
        .tap(({ loser }) => loser.raceAll(Chunk.fill(63, () => loser)) | Effect.unit)
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("the value of all fibers in inherited when running many effects with collectAllPar", async () => {
      const program = FiberRef.make(
        0,
        () => 0,
        (x, y) => x + y
      )
        .tap((fiberRef) =>
          Effect.collectAllPar(Chunk.fill(100000, () => fiberRef.update((n) => n + 1)))
        )
        .flatMap((fiberRef) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(100000)
    })

    it("it can be transformed polymorphically", async () => {
      interface Person {
        readonly name: string
        readonly age: number
      }

      function getAge(person: Person): Either<never, number> {
        return Either.right(person.age)
      }

      function setAge(age: number) {
        return (person: Person): Either<never, Person> =>
          Either.right({ ...person, age })
      }

      const program = Effect.Do()
        .bind("personRef", () => FiberRef.make<Person>({ name: "Jane Doe", age: 42 }))
        .bindValue("ageRef", ({ personRef }) =>
          personRef.foldAll(identity, identity, identity, setAge, getAge)
        )
        .bind("fiber", ({ ageRef }) => ageRef.update((n) => n + 1).fork())
        .tap(({ fiber }) => Fiber.join(fiber))
        .flatMap(({ personRef }) => personRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual({ name: "Jane Doe", age: 43 })
    })
  })
})
