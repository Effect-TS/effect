import * as Chunk from "../src/collection/immutable/Chunk"
import * as Tp from "../src/collection/immutable/Tuple"
import * as E from "../src/data/Either"
import { identity, pipe } from "../src/data/Function"
import * as O from "../src/data/Option"
import * as T from "../src/io/Effect"
import * as Fiber from "../src/io/Fiber"
import * as FiberRef from "../src/io/FiberRef"
import * as Promise from "../src/io/Promise"

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
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.tap(({ fiberRef }) => FiberRef.set_(fiberRef, update)),
          T.tap(({ fiberRef }) => FiberRef.delete(fiberRef)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(initial)
    })

    it("`get` returns the current value", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(initial)
    })

    it("`get` returns the correct value for a child", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("child", ({ fiberRef }) => T.fork(FiberRef.get(fiberRef))),
          T.bind("value", ({ child }) => Fiber.join(child))
        )
      )

      expect(value).toBe(initial)
    })

    it("`getAndUpdate` changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.getAndUpdate_(fiberRef, () => update)
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })

    it("`getAndUpdateSome` changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.getAndUpdateSome_(fiberRef, () => O.some(update))
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(initial)
      expect(value2).toBe(update)
    })

    it("`getAndUpdateSome` not changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.getAndUpdateSome_(fiberRef, () => O.none)
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })

    it("`locally` restores original value", async () => {
      const { local, value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("local", ({ fiberRef }) =>
            pipe(fiberRef, FiberRef.locally(update))(FiberRef.get(fiberRef))
          ),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(local).toBe(update)
      expect(value).toBe(initial)
    })

    it("`locally` restores parent's value", async () => {
      const { local, value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("child", ({ fiberRef }) =>
            pipe(FiberRef.get(fiberRef), FiberRef.locally_(fiberRef, update), T.fork)
          ),
          T.bind("local", ({ child }) => Fiber.join(child)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(local).toBe(update)
      expect(value).toBe(initial)
    })

    it("`locally` restores undefined value", async () => {
      const { localValue, value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("child", () => T.fork(FiberRef.make(initial))),
          // Don't use join as it inherits values from child
          T.bind("fiberRef", ({ child }) => T.chain_(Fiber.await(child), T.done)),
          T.bind("localValue", ({ fiberRef }) =>
            pipe(fiberRef, FiberRef.locally(update))(FiberRef.get(fiberRef))
          ),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(localValue).toBe(update)
      expect(value).toBe(initial)
    })

    it("`modify` changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.modify_(fiberRef, () => Tp.tuple(1, update))
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(1)
      expect(value2).toBe(update)
    })

    it("`modifySome` not changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.modifySome_(fiberRef, 2, () => O.none)
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(2)
      expect(value2).toBe(initial)
    })

    it("`set` updates the current value", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.tap(({ fiberRef }) => FiberRef.set_(fiberRef, update)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(update)
    })

    it("`set` by a child doesn't update parent's value", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("promise", () => Promise.make<never, void>()),
          T.tap(({ fiberRef, promise }) =>
            pipe(
              FiberRef.set_(fiberRef, update),
              T.zipRight(Promise.succeed_(promise, undefined)),
              T.fork
            )
          ),
          T.tap(({ promise }) => Promise.await(promise)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(initial)
    })

    it("`updateAndGet` changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.updateAndGet_(fiberRef, () => update)
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })

    it("`updateSomeAndGet` changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.updateSomeAndGet_(fiberRef, () => O.some(update))
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(update)
      expect(value2).toBe(update)
    })

    it("`updateSomeAndGet` not changes value", async () => {
      const { value1, value2 } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("value1", ({ fiberRef }) =>
            FiberRef.updateSomeAndGet_(fiberRef, () => O.none)
          ),
          T.bind("value2", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value1).toBe(initial)
      expect(value2).toBe(initial)
    })

    it("its value is inherited on join", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bind("child", ({ fiberRef }) => T.fork(FiberRef.set_(fiberRef, update))),
          T.tap(({ child }) => Fiber.join(child)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(update)
    })

    it("initial value is always available", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("child", () => T.fork(FiberRef.make(initial))),
          T.bind("fiberRef", ({ child }) => T.chain_(Fiber.await(child), T.done)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(initial)
    })

    it("its value is inherited after simple race", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.tap(({ fiberRef }) =>
            pipe(
              FiberRef.set_(fiberRef, update1),
              T.race(FiberRef.set_(fiberRef, update2))
            )
          ),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect([update1, update2]).toContain(value)
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
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bindValue("loser1", ({ fiberRef }) =>
            T.zipRight_(FiberRef.set_(fiberRef, update1), T.failNow("ups1"))
          ),
          T.bindValue("loser2", ({ fiberRef }) =>
            T.zipRight_(FiberRef.set_(fiberRef, update2), T.failNow("ups2"))
          ),
          T.tap(({ loser1, loser2 }) => T.ignore(T.race_(loser1, loser2))),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toContain(initial)
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
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bindValue("success", ({ fiberRef }) => FiberRef.set_(fiberRef, update)),
          T.bindValue("failure1", ({ fiberRef }) =>
            pipe(FiberRef.set_(fiberRef, update), T.zipRight(T.failNow(":-(")))
          ),
          T.bindValue("failure2", ({ fiberRef }) =>
            pipe(FiberRef.set_(fiberRef, update), T.zipRight(T.failNow(":-O")))
          ),
          T.tap(({ failure1, failure2, success }) =>
            pipe(
              success,
              T.zipPar(T.zipPar_(failure1, failure2)),
              T.orElse(() => T.unit)
            )
          ),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toContain(initial)
    })

    it("fork function is applied on fork - 1", async () => {
      function increment(x: number): number {
        return x + 1
      }

      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(0, increment)),
          T.bind("child", () => T.fork(T.unit)),
          T.tap(({ child }) => Fiber.join(child)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(1)
    })

    it("fork function is applied on fork - 2", async () => {
      function increment(x: number): number {
        return x + 1
      }

      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(0, increment)),
          T.bind("child", () => pipe(T.unit, T.fork, T.chain(Fiber.join), T.fork)),
          T.tap(({ child }) => Fiber.join(child)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(2)
    })

    it("join function is applied on join - 1", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(0, identity, Math.max)),
          T.bind("child", ({ fiberRef }) =>
            T.fork(FiberRef.update_(fiberRef, (_) => _ + 1))
          ),
          T.tap(({ child }) => Fiber.join(child)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(1)
    })

    it("join function is applied on join - 2", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(0, identity, Math.max)),
          T.bind("child", ({ fiberRef }) =>
            T.fork(FiberRef.update_(fiberRef, (_) => _ + 1))
          ),
          T.tap(({ fiberRef }) => FiberRef.update_(fiberRef, (_) => _ + 2)),
          T.tap(({ child }) => Fiber.join(child)),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(2)
    })

    it("its value is inherited in a trivial race", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.tap(({ fiberRef }) =>
            pipe(FiberRef.set_(fiberRef, update), T.raceAll(Chunk.empty()))
          ),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(update)
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
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () => FiberRef.make(initial)),
          T.bindValue("loser", ({ fiberRef }) =>
            pipe(FiberRef.set_(fiberRef, update), T.zipRight(T.failNow("darn")))
          ),
          T.tap(({ loser }) =>
            pipe(
              loser,
              T.raceAll(Chunk.fill(63, () => loser)),
              T.orElse(() => T.unit)
            )
          ),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(initial)
    })

    it("the value of all fibers in inherited when running many effects with collectAllPar", async () => {
      const { value } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("fiberRef", () =>
            FiberRef.make(
              0,
              () => 0,
              (x, y) => x + y
            )
          ),
          T.tap(({ fiberRef }) =>
            T.collectAllPar(
              Chunk.fill(100000, () => FiberRef.update_(fiberRef, (_) => _ + 1))
            )
          ),
          T.bind("value", ({ fiberRef }) => FiberRef.get(fiberRef))
        )
      )

      expect(value).toBe(100000)
    })

    it("it can be transformed polymorphically", async () => {
      interface Person {
        readonly name: string
        readonly age: number
      }

      function getAge(person: Person): E.Either<never, number> {
        return E.right(person.age)
      }

      function setAge(age: number) {
        return (person: Person): E.Either<never, Person> => E.right({ ...person, age })
      }

      const { person } = await T.unsafeRunPromise(
        pipe(
          T.Do(),
          T.bind("personRef", () =>
            FiberRef.make<Person>({ name: "Jane Doe", age: 42 })
          ),
          T.bindValue("ageRef", ({ personRef }) =>
            FiberRef.foldAll_(personRef, identity, identity, identity, setAge, getAge)
          ),
          T.bind("fiber", ({ ageRef }) =>
            T.fork(FiberRef.update_(ageRef, (n) => n + 1))
          ),
          T.tap(({ fiber }) => Fiber.join(fiber)),
          T.bind("person", ({ personRef }) => FiberRef.get(personRef))
        )
      )

      expect(person).toEqual({ name: "Jane Doe", age: 43 })
    })
  })
})
