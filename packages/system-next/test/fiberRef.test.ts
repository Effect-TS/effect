import * as Chunk from "../src/collection/immutable/Chunk"
import { Tuple } from "../src/collection/immutable/Tuple"
import { Either } from "../src/data/Either"
import { identity, pipe } from "../src/data/Function"
import { Option } from "../src/data/Option"
import { Effect } from "../src/io/Effect"
import * as Fiber from "../src/io/Fiber"
import * as FiberRef from "../src/io/FiberRef"
import { Promise } from "../src/io/Promise"

const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"

// TODO: implement after Scheduler
// const looseTimeAndCpu = pipe(
//   T.yieldNow,
//   T.zipLeft(T.sleep(1)),
//   T.repeatN(100)
// )

describe("FiberRef", () => {
  describe("Create a new FiberRef with a specified value and check if:", () => {
    it("`delete` restores the original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .tap(({ fiberRef }) => FiberRef.set_(fiberRef, update))
        .tap(({ fiberRef }) => FiberRef.delete(fiberRef))
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`get` returns the current value", async () => {
      const program = FiberRef.make(initial).flatMap(FiberRef.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`get` returns the correct value for a child", async () => {
      const program = FiberRef.make(initial)
        .flatMap((fiberRef) => FiberRef.get(fiberRef).fork())
        .flatMap(Fiber.join)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`getAndUpdate` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.getAndUpdate_(fiberRef, () => update)
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })

    it("`getAndUpdateSome` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.getAndUpdateSome_(fiberRef, () => Option.some(update))
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })

    it("`getAndUpdateSome` not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.getAndUpdateSome_(fiberRef, () => Option.none)
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })

    it("`locally` restores original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("local", ({ fiberRef }) =>
          pipe(fiberRef, FiberRef.locally(update))(FiberRef.get(fiberRef))
        )
        .bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { local, value } = await program.unsafeRunPromise()

      expect(local).toBe(update)
      expect(value).toBe(initial)
    })

    it("`locally` restores parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) =>
          pipe(FiberRef.get(fiberRef), FiberRef.locally_(fiberRef, update)).fork()
        )
        .bind("local", ({ child }) => Fiber.join(child))
        .bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))

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
          pipe(fiberRef, FiberRef.locally(update))(FiberRef.get(fiberRef))
        )
        .bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { localValue, value } = await program.unsafeRunPromise()

      expect(localValue).toBe(update)
      expect(value).toBe(initial)
    })

    it("`modify` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.modify_(fiberRef, () => Tuple(1, update))
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(1)
      expect(value2).toBe(update)
    })

    it("`modifySome` not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.modifySome_(fiberRef, 2, () => Option.none)
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(2)
      expect(value2).toBe(initial)
    })

    it("`set` updates the current value", async () => {
      const program = FiberRef.make(initial)
        .tap(FiberRef.set(update))
        .flatMap(FiberRef.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("`set` by a child doesn't update parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("promise", () => Promise.make<never, void>())
        .tap(({ fiberRef, promise }) =>
          FiberRef.set_(fiberRef, update).zipRight(promise.succeed(undefined)).fork()
        )
        .tap(({ promise }) => promise.await())
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("`updateAndGet` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.updateAndGet_(fiberRef, () => update)
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })

    it("`updateSomeAndGet` changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.updateSomeAndGet_(fiberRef, () => Option.some(update))
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })

    it("`updateSomeAndGet` not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) =>
          FiberRef.updateSomeAndGet_(fiberRef, () => Option.none)
        )
        .bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))

      const { value1, value2 } = await program.unsafeRunPromise()

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })

    it("its value is inherited on join", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) => FiberRef.set_(fiberRef, update).fork())
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("initial value is always available", async () => {
      const program = Effect.Do()
        .bind("child", () => FiberRef.make(initial).fork())
        .bind("fiberRef", ({ child }) =>
          Fiber.await(child).flatMap((_) => Effect.done(_))
        )
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })

    it("its value is inherited after simple race", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .tap(({ fiberRef }) =>
          FiberRef.set_(fiberRef, update1).race(FiberRef.set_(fiberRef, update2))
        )
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect([update1, update2]).toContain(result)
    })

    // TODO: implement after Schedule
    // it("its value is inherited after a race with a bad winner", async () => {
    //   const { value } = await T.unsafeRunPromise(
    //     pipe(
    //       T.Do(),
    //       T.bind("fiberRef", () => FiberRef.make(initial)),
    //       T.let("badWinner", ({ fiberRef }) =>
    //         T.zipRight_(FiberRef.set_(fiberRef, update1), T.fail("ups"))
    //       ),
    //       T.let("goodLoser", ({ fiberRef }) =>
    //         T.zipRight_(FiberRef.set_(fiberRef, update2), looseTimeAndCpu)
    //       ),
    //       T.tap(({ badWinner, goodLoser }) => T.race(badWinner, goodLoser)),
    //       T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
    //     )
    //   )

    //   expect(value).toContain(update2)
    // })

    it("its value is not inherited after a race of losers", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("loser1", ({ fiberRef }) =>
          FiberRef.set_(fiberRef, update1).zipRight(Effect.failNow("ups1"))
        )
        .bindValue("loser2", ({ fiberRef }) =>
          FiberRef.set_(fiberRef, update2).zipRight(Effect.failNow("ups2"))
        )
        .tap(({ loser1, loser2 }) => loser1.race(loser2).ignore())
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toContain(initial)
    })

    // TODO: implement after Schedule
    // it("the value of the loser is inherited in zipPar", async () => {
    //   const { value } = await T.unsafeRunPromise(
    //     pipe(
    //       T.Do(),
    //       T.bind("fiberRef", () => FiberRef.make(initial)),
    //       T.bind("latch", () => Promise.make<never, void>()),
    //       T.let("winner", ({ fiberRef, latch }) =>
    //         pipe(
    //           FiberRef.set_(fiberRef, update1),
    //           T.zipRight(Promise.succeed_(latch, undefined)),
    //           T.asUnit
    //         )
    //       ),
    //       T.let("loser", ({ fiberRef, latch }) =>
    //         pipe(
    //           Promise.await(latch),
    //           T.zipRight(FiberRef.set_(fiberRef, update2)),
    //           T.zipRight(looseTimeAndCpu)
    //         )
    //       ),
    //       T.tap(({ loser, winner }) => T.zipPar_(winner, loser)),
    //       T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
    //     )
    //   )

    //   expect(value).toContain(update2)
    // })

    it("nothing gets inherited with a failure in zipPar", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("success", ({ fiberRef }) => FiberRef.set_(fiberRef, update))
        .bindValue("failure1", ({ fiberRef }) =>
          FiberRef.set_(fiberRef, update).zipRight(Effect.failNow(":-("))
        )
        .bindValue("failure2", ({ fiberRef }) =>
          FiberRef.set_(fiberRef, update).zipRight(Effect.failNow(":-O"))
        )
        .tap(({ failure1, failure2, success }) =>
          success.zipPar(failure1.zipPar(failure2)).orElse(Effect.unit)
        )
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

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
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

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
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("join function is applied on join - 1", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, identity, Math.max))
        .bind("child", ({ fiberRef }) =>
          FiberRef.update_(fiberRef, (_) => _ + 1).fork()
        )
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("join function is applied on join - 2", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, identity, Math.max))
        .bind("child", ({ fiberRef }) =>
          FiberRef.update_(fiberRef, (_) => _ + 1).fork()
        )
        .tap(({ fiberRef }) => FiberRef.update_(fiberRef, (_) => _ + 2))
        .tap(({ child }) => Fiber.join(child))
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("its value is inherited in a trivial race", async () => {
      const program = FiberRef.make(initial)
        .tap((fiberRef) => FiberRef.set_(fiberRef, update).raceAll(Chunk.empty()))
        .flatMap(FiberRef.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    // TODO: implement after Schedule, also this test is flaky
    // it("the value of the winner is inherited when racing two effects with raceAll", () => {
    //   const { value1, value2 } = await T.unsafeRunPromise(
    //     pipe(
    //       T.Do(),
    //       T.bind("fiberRef", () => FiberRef.make(initial)),
    //       T.bind("latch", () => Promise.make<never, void>()),
    //       T.let("winner1", ({ fiberRef, latch }) =>
    //         pipe(
    //           FiberRef.set_(fiberRef, update1),
    //           T.zipRight(Promise.succeed_(latch, undefined))
    //         )
    //       ),
    //       T.let("loser1", ({ fiberRef, latch }) =>
    //         pipe(
    //           Promise.await(latch),
    //           T.zipRight(FiberRef.set_(fiberRef, update2)),
    //           T.zipRight(looseTimeAndCpu)
    //         )
    //       ),
    //       T.tap(({ loser1, winner1 }) => T.raceAll([loser1, winner1])),
    //       T.bind("value1", ({ fiberRef }) =>
    //         pipe(FiberRef.get(fiberRef), T.zipLeft(FiberRef.set_(fiberRef, initial)))
    //       ),
    //       T.let("winner2", ({ fiberRef }) => FiberRef.set_(fiberRef, update1)),
    //       T.let("loser2", ({ fiberRef }) =>
    //         pipe(FiberRef.set_(fiberRef, update1), T.zipRight(T.fail(":-O")))
    //       ),
    //       T.tap(({ loser2, winner2 }) => T.raceAll([loser2, winner2])),
    //       T.bind("value2", ({ fiberRef }) =>
    //         pipe(FiberRef.get(fiberRef), T.zipLeft(FiberRef.set_(fiberRef, initial)))
    //       )
    //     )
    //   )

    //   expect(value1).toBe(update1)
    //   expect(value2).toBe(update1)
    // })

    // TODO: implement after Schedule
    // it("the value of the winner is inherited when racing many effects with raceAll", async () => {
    //   const { value1, value2 } = await T.unsafeRunPromise(
    //     pipe(
    //       T.Do(),
    //       T.bind("fiberRef", () => FiberRef.make(initial)),
    //       T.let("n", () => 63),
    //       T.bind("latch", () => Promise.make<never, void>()),
    //       T.let("winner1", ({ fiberRef, latch }) =>
    //         pipe(
    //           FiberRef.set_(fiberRef, update1),
    //           T.zipRight(Promise.succeed_(latch, undefined))
    //         )
    //       ),
    //       T.let("losers1", ({ fiberRef, latch, n }) =>
    //         pipe(
    //           Promise.await(latch),
    //           T.zipRight(FiberRef.set_(fiberRef, update2)),
    //           T.zipRight(looseTimeAndCpu),
    //           T.replicate(n)
    //         )
    //       ),
    //       T.tap(({ losers1, winner1 }) =>
    //         T.raceAll([winner1, ...Chunk.toArray(losers1)])
    //       ),
    //       T.bind("value1", ({ fiberRef }) =>
    //         pipe(FiberRef.get(fiberRef), T.zipLeft(FiberRef.set_(fiberRef, initial)))
    //       ),
    //       T.let("winner2", ({ fiberRef }) => FiberRef.set_(fiberRef, update1)),
    //       T.let("losers2", ({ fiberRef, n }) =>
    //         pipe(
    //           FiberRef.set_(fiberRef, update1),
    //           T.zipRight(T.fail(":-O")),
    //           T.replicate(n)
    //         )
    //       ),
    //       T.tap(({ losers2, winner2 }) =>
    //         T.raceAll([winner2, ...Chunk.toArray(losers2)])
    //       ),
    //       T.bind("value2", ({ fiberRef }) =>
    //         pipe(FiberRef.get(fiberRef), T.zipLeft(FiberRef.set_(fiberRef, initial)))
    //       )
    //     )
    //   )

    //   expect(value1).toBe(update1)
    //   expect(value2).toBe(update1)
    // })

    it("nothing gets inherited when racing failures with raceAll", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("loser", ({ fiberRef }) =>
          FiberRef.set_(fiberRef, update).zipRight(Effect.failNow("darn"))
        )
        .tap(({ loser }) => loser.raceAll(Chunk.fill(63, () => loser)) | Effect.unit)
        .flatMap(({ fiberRef }) => FiberRef.get(fiberRef))

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
          Effect.collectAllPar(
            Chunk.fill(100000, () => FiberRef.update_(fiberRef, (_) => _ + 1))
          )
        )
        .flatMap((fiberRef) => FiberRef.get(fiberRef))

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
          FiberRef.foldAll_(personRef, identity, identity, identity, setAge, getAge)
        )
        .bind("fiber", ({ ageRef }) => FiberRef.update_(ageRef, (n) => n + 1).fork())
        .tap(({ fiber }) => Fiber.join(fiber))
        .flatMap(({ personRef }) => FiberRef.get(personRef))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual({ name: "Jane Doe", age: 43 })
    })
  })
})
