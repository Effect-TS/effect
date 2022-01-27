import * as Chunk from "../src/collection/immutable/Chunk"
import * as List from "../src/collection/immutable/List"
import * as Tp from "../src/collection/immutable/Tuple"
import { constVoid, identity } from "../src/data/Function"
import * as O from "../src/data/Option"
import { RuntimeError } from "../src/io/Cause"
import type { HasClock } from "../src/io/Clock"
import type { UIO } from "../src/io/Effect"
import { Effect } from "../src/io/Effect"
import * as Exit from "../src/io/Exit"
import type { FiberId } from "../src/io/FiberId"
import * as InterruptStatus from "../src/io/InterruptStatus"
import { Managed, Reservation } from "../src/io/Managed"
import * as Promise from "../src/io/Promise"
import * as Ref from "../src/io/Ref"

const ExampleError = new Error("Oh noes!")

const ManagedExampleError: Managed<unknown, Error, number> = Managed.fail(ExampleError)

const ManagedExampleDie: Managed<unknown, Error, number> = Managed.succeed(() => {
  throw ExampleError
})

function wait(counter: Ref.Ref<number>): Effect<HasClock, never, void> {
  return Ref.get(counter).flatMap((n) =>
    n <= 0 ? Effect.unit : Effect.sleep(10).flatMap(() => wait(counter))
  )
}

function countDownLatch(n: number): UIO<Effect<HasClock, never, void>> {
  return Ref.make(n).map((counter) =>
    Ref.update_(counter, (n) => n - 1).zipRight(wait(counter))
  )
}

function doInterrupt(
  managed: (_: Effect<unknown, never, void>) => Managed<unknown, never, void>
): Effect<HasClock, never, Tp.Tuple<[FiberId, O.Option<Exit.Exit<never, void>>]>> {
  return Effect.Do()
    .bind("fiberId", () => Effect.fiberId)
    .bind("never", () => Promise.make<never, void>())
    .bind("reachedAcquisition", () => Promise.make<never, void>())
    .bind("managedFiber", ({ never, reachedAcquisition }) =>
      managed(
        Promise.succeed_(reachedAcquisition, undefined).zipRight(Promise.await(never))
      )
        .useDiscard(Effect.unit)
        .forkDaemon()
    )
    .tap(({ reachedAcquisition }) => Promise.await(reachedAcquisition))
    .bind("interruption", ({ fiberId, managedFiber }) =>
      managedFiber.interruptAs(fiberId).timeout(1000)
    )
    .map(({ fiberId, interruption }) =>
      Tp.tuple(fiberId, O.map_(interruption, Exit.untraced))
    )
}

function parallelFinalizers<R, E, A>(
  n: number,
  f: (_: Managed<unknown, never, void>) => Managed<R, E, A>
): Effect<R, E, number> {
  return Effect.Do()
    .bind("releases", () => Ref.make(0))
    .bindValue("baseRes", ({ releases }) =>
      Managed.acquireReleaseWith(Effect.succeed(constVoid), () =>
        Ref.update_(releases, (n) => n + 1)
      )
    )
    .bindValue("res", ({ baseRes }) => f(baseRes))
    .tap(({ res }) => res.useDiscard(Effect.unit))
    .flatMap(({ releases }) => Ref.get(releases))
}

function parallelReservations<R, E, A>(
  n: number,
  f: (_: Managed<HasClock, never, void>) => Managed<R, E, A>
): Effect<R & HasClock, E, number> {
  return Effect.Do()
    .bind("effects", () => Ref.make(0))
    .bind("countDown", () => countDownLatch(n + 1))
    .bind("reserveLatch", () => Promise.make<never, void>())
    .bindValue("baseRes", ({ countDown, effects, reserveLatch }) =>
      Managed.acquireReleaseWith(
        Ref.update_(effects, (n) => n + 1)
          .zipRight(countDown)
          .zipRight(Promise.await(reserveLatch)),
        () => Effect.unit
      )
    )
    .bindValue("res", ({ baseRes }) => f(baseRes))
    .tap(({ countDown, res }) => res.useDiscard(Effect.unit).fork().zipRight(countDown))
    .bind("count", ({ effects }) => Ref.get(effects))
    .tap(({ reserveLatch }) => Promise.succeed_(reserveLatch, undefined))
    .map(({ count }) => count)
}

function parallelAcquisitions<R, E, A>(
  n: number,
  f: (_: Managed<HasClock, never, void>) => Managed<R, E, A>
): Effect<R & HasClock, never, number> {
  return Effect.Do()
    .bind("effects", () => Ref.make(0))
    .bind("countDown", () => countDownLatch(n + 1))
    .bind("reserveLatch", () => Promise.make<never, void>())
    .bindValue("baseRes", ({ countDown, effects, reserveLatch }) =>
      Managed.fromReservation(
        Reservation(
          Ref.update_(effects, (n) => n + 1)
            .zipRight(countDown)
            .zipRight(Promise.await(reserveLatch)),
          () => Effect.unit
        )
      )
    )
    .bindValue("res", ({ baseRes }) => f(baseRes))
    .tap(({ countDown, res }) => res.useDiscard(Effect.unit).fork().zipRight(countDown))
    .bind("count", ({ effects }) => Ref.get(effects))
    .tap(({ reserveLatch }) => Promise.succeed_(reserveLatch, undefined))
    .map(({ count }) => count)
}

function parallelNestedFinalizerOrdering(
  listLength: number,
  f: (
    _: List.List<Managed<unknown, never, Ref.Ref<List.List<number>>>>
  ) => Managed<unknown, never, Chunk.Chunk<Ref.Ref<List.List<number>>>>
): Effect<unknown, never, List.List<List.List<number>>> {
  const inner = Ref.make(List.empty<number>())
    .toManaged()
    .flatMap(
      (ref) =>
        Managed.finalizer(Ref.update_(ref, List.prepend(1))) >
        Managed.finalizer(Ref.update_(ref, List.prepend(2))) >
        Managed.finalizer(Ref.update_(ref, List.prepend(3))).as(ref)
    )

  return f(List.from(Array.from({ length: listLength }, () => inner)))
    .useNow()
    .flatMap((refs) => Effect.forEach(refs, Ref.get))
    .map((results) => List.from(results))
}

describe("Managed", () => {
  describe("absorbWith", () => {
    it("on fail", async () => {
      const result = await ManagedExampleError.absorbWith(identity)
        .use(Effect.succeedNow)
        .unsafeRunPromiseExit()

      expect(Exit.isFailure(result)).toBe(true)
    })

    it("on die", async () => {
      const result = await ManagedExampleDie.absorbWith(identity)
        .use(Effect.succeedNow)
        .unsafeRunPromiseExit()

      expect(Exit.isFailure(result)).toBe(true)
    })

    it("on success", async () => {
      const result = await Managed.succeed(1)
        .absorbWith(() => {
          throw ExampleError
        })
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("acquireReleaseWith", () => {
    it("invokes cleanups in reverse order of acquisition", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) => res(1).zipRight(res(2)).zipRight(res(3)))
        .bind("values", ({ effects, program }) =>
          program.useDiscard(Effect.unit).zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 2, 3, 3, 2, 1]))
    })

    it("constructs an uninterruptible Managed value", async () => {
      const result = await doInterrupt((effect) =>
        Managed.acquireReleaseWith(effect, () => Effect.unit)
      ).unsafeRunPromise()

      expect(result.get(1)).toEqual(O.none)
    })
  })

  describe("acquireReleaseAttemptWith", () => {
    it("invokes cleanups in reverse order of acquisition", async () => {
      let effects = List.empty<number>()

      function acquire(n: number): number {
        effects = List.prepend_(effects, n)
        return n
      }

      function release(n: number): void {
        effects = List.prepend_(effects, n)
      }

      const res = (n: number) => Managed.acquireReleaseAttemptWith(acquire(n), release)
      const program = res(1) > res(2) > res(3)

      await program.useDiscard(Effect.unit).unsafeRunPromise()

      expect(effects).toEqual(List.from([1, 2, 3, 3, 2, 1]))
    })
  })

  describe("fromReservation", () => {
    it("interruption is possible when using this form", async () => {
      const result = await doInterrupt((effect) =>
        Managed.fromReservation(Reservation(effect, () => Effect.unit))
      ).unsafeRunPromise()

      expect(result.get(1)).toHaveProperty("value.cause.left._tag", "Interrupt")
      expect(result.get(1)).toHaveProperty("value.cause.right._tag", "Interrupt")
    })
  })

  describe("acquireReleaseExitWith", () => {
    it("invokes with the failure of the use", async () => {
      const exception = new RuntimeError("Use died")

      function res(exits: Ref.Ref<List.List<Exit.Exit<any, any>>>) {
        return Managed.acquireReleaseExitWith(Effect.unit, (_, e) =>
          Ref.update_(exits, List.prepend(e))
        ).zipRight(
          Managed.acquireReleaseExitWith(Effect.unit, (_, e) =>
            Ref.update_(exits, List.prepend(e))
          )
        )
      }

      const { result } = await Effect.Do()
        .bind("exits", () => Ref.make(List.empty<Exit.Exit<any, any>>()))
        .tap(({ exits }) => res(exits).useDiscard(Effect.die(exception)).exit())
        .bind("result", ({ exits }) => Ref.get(exits))
        .unsafeRunPromise()

      expect(List.toArray(result)).toHaveProperty("[0].cause.value", exception)
      expect(List.toArray(result)).toHaveProperty("[1].cause.value", exception)
    })

    it("invokes with the failure of the subsequent acquire", async () => {
      const useException = new RuntimeError("Use died")
      const acquireException = new RuntimeError("Acquire died")

      function res(exits: Ref.Ref<List.List<Exit.Exit<any, any>>>) {
        return Managed.acquireReleaseExitWith(Effect.unit, (_, e) =>
          Ref.update_(exits, List.prepend(e))
        ).zipRight(
          Managed.acquireReleaseExitWith(Effect.die(acquireException), (_, e) =>
            Ref.update_(exits, List.prepend(e))
          )
        )
      }

      const { result } = await Effect.Do()
        .bind("exits", () => Ref.make(List.empty<Exit.Exit<any, any>>()))
        .tap(({ exits }) => res(exits).useDiscard(Effect.die(useException)).exit())
        .bind("result", ({ exits }) => Ref.get(exits))
        .unsafeRunPromise()

      expect(List.size(result)).toBe(1)
      expect(List.toArray(result)).toHaveProperty("[0].cause.value", acquireException)
    })
  })

  describe("zipWithPar", () => {
    it("properly performs parallel acquire and release", async () => {
      const { cleanups, result } = await Effect.Do()
        .bind("log", () => Ref.make(List.empty<string>()))
        .bindValue("a", ({ log }) =>
          Managed.acquireReleaseWith(Effect.succeed("A"), () =>
            Ref.update_(log, List.prepend("A"))
          )
        )
        .bindValue("b", ({ log }) =>
          Managed.acquireReleaseWith(Effect.succeed("B"), () =>
            Ref.update_(log, List.prepend("B"))
          )
        )
        .bind("result", ({ a, b }) =>
          a.zipWithPar(b, (s1, s2) => s1 + s2).use(Effect.succeedNow)
        )
        .bind("cleanups", ({ log }) => Ref.get(log))
        .unsafeRunPromise()

      const cleanupsArray = List.toArray(cleanups)

      expect(result.length).toBe(2)
      expect(result).toContain("A")
      expect(result).toContain("B")
      expect(cleanupsArray.length).toBe(2)
      expect(cleanupsArray).toContain("A")
      expect(cleanupsArray).toContain("B")
    })

    it("preserves ordering of nested finalizers", async () => {
      const inner = Ref.make(List.empty<number>())
        .toManaged()
        .flatMap(
          (ref) =>
            Managed.finalizer(Ref.update_(ref, List.prepend(1))) >
            Managed.finalizer(Ref.update_(ref, List.prepend(2))) >
            Managed.finalizer(Ref.update_(ref, List.prepend(3))).as(ref)
        )

      const result = await inner
        .zipPar(inner)
        .useNow()
        .flatMap(({ tuple: [l, r] }) => Ref.get(l).zip(Ref.get(r)))
        .unsafeRunPromise()

      expect(result.get(0)).toEqual(List.from([1, 2, 3]))
      expect(result.get(1)).toEqual(List.from([1, 2, 3]))
    })
  })

  describe("fromEffect", () => {
    it("is performed interruptibly", async () => {
      const result = await Managed.fromEffect(
        Effect.checkInterruptible(Effect.succeedNow)
      )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(InterruptStatus.Interruptible)
    })
  })

  describe("fromEffectUninterruptible", () => {
    it("is performed uninterruptibly", async () => {
      const result = await Managed.fromEffectUninterruptible(
        Effect.checkInterruptible(Effect.succeedNow)
      )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(InterruptStatus.Uninterruptible)
    })
  })

  describe("ensuring", () => {
    it("runs on successes", async () => {
      const { result } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .tap(({ effects }) =>
          Managed.finalizer(Ref.update_(effects, List.prepend("First")))
            .ensuring(Ref.update_(effects, List.prepend("Second")))
            .useDiscard(Effect.unit)
        )
        .bind("result", ({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["Second", "First"]))
    })

    it("runs on failures", async () => {
      const { result } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .tap(({ effects }) =>
          Managed.fromEffect(Effect.fail(undefined))
            .ensuring(Ref.update_(effects, List.prepend("Ensured")))
            .useDiscard(Effect.unit)
            .either()
        )
        .bind("result", ({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["Ensured"]))
    })

    it("works when finalizers have defects", async () => {
      const { result } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .tap(({ effects }) =>
          Managed.finalizer(Effect.dieMessage("Boom"))
            .ensuring(Ref.update_(effects, List.prepend("Ensured")))
            .useDiscard(Effect.unit)
            .exit()
        )
        .bind("result", ({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["Ensured"]))
    })
  })

  describe("ensuringFirst", () => {
    it("runs on successes", async () => {
      const { result } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .tap(({ effects }) =>
          Managed.finalizer(Ref.update_(effects, List.prepend("First")))
            .ensuringFirst(Ref.update_(effects, List.prepend("Second")))
            .useDiscard(Effect.unit)
        )
        .bind("result", ({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["First", "Second"]))
    })

    it("runs on failures", async () => {
      const { result } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .tap(({ effects }) =>
          Managed.fromEffect(Effect.fail(undefined))
            .ensuringFirst(Ref.update_(effects, List.prepend("Ensured")))
            .useDiscard(Effect.unit)
            .either()
        )
        .bind("result", ({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["Ensured"]))
    })

    it("works when finalizers have defects", async () => {
      const { result } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .tap(({ effects }) =>
          Managed.finalizer(Effect.dieMessage("Boom"))
            .ensuringFirst(Ref.update_(effects, List.prepend("Ensured")))
            .useDiscard(Effect.unit)
            .exit()
        )
        .bind("result", ({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["Ensured"]))
    })
  })

  describe("eventually", () => {
    it("should ignore errors raised by acquire", async () => {
      function acquire(ref: Ref.Ref<number>) {
        return Effect.Do()
          .bind("value", () => Ref.get(ref))
          .bind("result", ({ value }) =>
            value < 10
              ? Ref.update_(ref, (n) => n + 1).zipRight(Effect.fail("Ouch"))
              : Effect.succeed(value)
          )
      }

      const { result } = await Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Managed.acquireReleaseWith(acquire(ref), () => Effect.unit)
            .eventually()
            .use(() => Effect.unit)
        )
        .bind("result", ({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      expect(result).toBe(10)
    })
  })

  describe("flatMap", () => {
    it("all finalizers run even when finalizers have defects", async () => {
      const { result } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .tap(({ effects }) =>
          Managed.Do()
            .bind("e1", () => Managed.finalizer(Effect.dieMessage("Boom")))
            .bind("a1", () =>
              Managed.finalizer(Ref.update_(effects, List.prepend("First")))
            )
            .bind("e2", () => Managed.finalizer(Effect.dieMessage("Boom")))
            .bind("a2", () =>
              Managed.finalizer(Ref.update_(effects, List.prepend("Second")))
            )
            .bind("e3", () => Managed.finalizer(Effect.dieMessage("Boom")))
            .bind("a3", () =>
              Managed.finalizer(Ref.update_(effects, List.prepend("Third")))
            )
            .useDiscard(Effect.unit)
            .exit()
        )
        .bind("result", ({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["First", "Second", "Third"]))
    })
  })

  describe("foldManaged", () => {
    it("runs onFailure on failure", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) =>
          Managed.fromEffect(Effect.fail(undefined)).foldManaged(
            () => res(1),
            () => Managed.unit
          )
        )
        .bind("values", ({ effects, program }) =>
          program.useDiscard(Effect.unit).ignore().zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 1]))
    })

    it("runs onSuccess on success", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) =>
          Managed.fromEffect(Effect.succeed(undefined)).foldManaged(
            () => Managed.unit,
            () => res(1)
          )
        )
        .bind("values", ({ effects, program }) =>
          program.useDiscard(Effect.unit).ignore().zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 1]))
    })

    it("invokes cleanups", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) =>
          res(1)
            .flatMap(() => Managed.fail(undefined))
            .foldManaged(
              () => res(2),
              () => res(3)
            )
        )
        .bind("values", ({ effects, program }) =>
          program.useDiscard(Effect.unit).ignore().zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 2, 2, 1]))
    })

    it("invokes cleanups on interrupt - 1", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) =>
          res(1)
            .flatMap(() => Managed.interrupt)
            .foldManaged(
              () => res(2),
              () => res(3)
            )
        )
        .bind("values", ({ effects, program }) =>
          program.useDiscard(Effect.unit).sandbox().ignore().zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 1]))
    })

    it("invokes cleanups on interrupt - 2", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) =>
          res(1)
            .flatMap(() => Managed.fail(undefined))
            .foldManaged(
              () => res(2),
              () => res(3)
            )
        )
        .bind("values", ({ effects, program }) =>
          program
            .useDiscard(Effect.interrupt)
            .sandbox()
            .ignore()
            .zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 2, 2, 1]))
    })

    it("invokes cleanups on interrupt - 3", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) =>
          res(1)
            .flatMap(() => Managed.fail(undefined))
            .foldManaged(
              () => res(2).zipRight(Managed.interrupt),
              () => res(3)
            )
        )
        .bind("values", ({ effects, program }) =>
          program.useDiscard(Effect.unit).sandbox().ignore().zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 2, 2, 1]))
    })
  })

  describe("forEach", () => {
    it("returns elements in the correct order", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.forEach(List.from([1, 2, 3, 4]), res)
        .use((res) => Effect.succeedNow(Chunk.toArray(res)))
        .unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4])
    })

    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.forEach(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("invokes cleanups in reverse order of acquisition", async () => {
      const { values } = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) => Managed.forEach(List.from([1, 2, 3]), res))
        .bind("values", ({ effects, program }) =>
          program.useDiscard(Effect.unit).zipRight(Ref.get(effects))
        )
        .unsafeRunPromise()

      expect(values).toEqual(List.from([1, 2, 3, 3, 2, 1]))
    })
  })

  describe("forEachOption", () => {
    it("returns elements if Some", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.forEachOption(O.some(3), res)
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(O.some(3))
    })

    it("returns nothing if None", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.forEachOption(O.none, res)
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(O.none)
    })

    it("Runs finalizers", async () => {
      const count = await parallelFinalizers(1, (res) =>
        Managed.forEachOption(O.some(4), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(1)
    })
  })

  describe("forEachPar", () => {
    it("returns elements in the correct order", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.forEachPar(List.from([1, 2, 3, 4]), res)
        .use((res) => Effect.succeed(Chunk.toArray(res)))
        .unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4])
    })

    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.forEachPar(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("runs reservations in parallel", async () => {
      const count = await parallelReservations(4, (res) =>
        Managed.forEachPar(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("runs acquisitions in parallel", async () => {
      const count = await parallelAcquisitions(4, (res) =>
        Managed.forEachPar(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("maintains finalizer ordering in inner Managed values", async () => {
      const listLength = 20
      const results = await parallelNestedFinalizerOrdering(listLength, (_) =>
        Managed.forEachPar(_, identity)
      ).unsafeRunPromise()

      expect(results).toEqual(
        List.from(Array.from({ length: listLength }, () => List.from([1, 2, 3])))
      )
    })
  })

  describe("forEachPar - parallelism", () => {
    it("returns elements in the correct order", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.forEachPar(List.from([1, 2, 3, 4]), res)
        .withParallelism(2)
        .use((res) => Effect.succeed(Chunk.toArray(res)))
        .unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4])
    })

    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.forEachPar(List.from([1, 2, 3, 4]), () => res)
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("uses at most n fibers for reservation", async () => {
      const count = await parallelReservations(2, (res) =>
        Managed.forEachPar(List.from([1, 2, 3, 4]), () => res)
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(2)
    })

    it("uses at most n fibers for acquisition", async () => {
      const count = await parallelAcquisitions(2, (res) =>
        Managed.forEachPar(List.from([1, 2, 3, 4]), () => res)
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(2)
    })

    it("maintains finalizer ordering in inner Managed values", async () => {
      const parallelism = 5
      const listLength = 20
      const results = await parallelNestedFinalizerOrdering(listLength, (_) =>
        Managed.forEachPar(_, identity).withParallelism(parallelism)
      ).unsafeRunPromise()

      expect(results).toEqual(
        List.from(Array.from({ length: listLength }, () => List.from([1, 2, 3])))
      )
    })
  })
})
