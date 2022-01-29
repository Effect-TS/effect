import * as Chunk from "../src/collection/immutable/Chunk"
import * as List from "../src/collection/immutable/List"
import * as Map from "../src/collection/immutable/Map"
import * as Tp from "../src/collection/immutable/Tuple"
import { Either } from "../src/data/Either"
import { constTrue, constVoid, identity } from "../src/data/Function"
import { tag } from "../src/data/Has"
import * as O from "../src/data/Option"
import { RuntimeError } from "../src/io/Cause"
import * as Cause from "../src/io/Cause"
import type { HasClock } from "../src/io/Clock"
import type { UIO } from "../src/io/Effect"
import { Effect } from "../src/io/Effect"
import * as ExecutionStrategy from "../src/io/Effect/operations/ExecutionStrategy"
import * as Exit from "../src/io/Exit"
import * as Fiber from "../src/io/Fiber"
import type { FiberId } from "../src/io/FiberId"
import * as InterruptStatus from "../src/io/InterruptStatus"
import { Managed, Reservation } from "../src/io/Managed"
import { ReleaseMap } from "../src/io/Managed/ReleaseMap"
import * as Promise from "../src/io/Promise"
import * as Ref from "../src/io/Ref"

const ExampleError = new Error("Oh noes!")

const ManagedExampleError: Managed<unknown, Error, number> = Managed.fail(ExampleError)

const ManagedExampleDie: Managed<unknown, Error, number> = Managed.succeed(() => {
  throw ExampleError
})

interface EnvA {
  readonly a: number
}
const EnvA = tag<EnvA>(Symbol.for("effect-ts/system/test/managed/env-a"))
const LiveEnvA = Managed.succeed(EnvA.has({ a: 1 })).toLayerRaw()

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
      managedFiber.interruptAs(fiberId).map(Exit.untraced).timeout(1000)
    )
    .map(({ fiberId, interruption }) =>
      Tp.tuple(fiberId, O.map_(interruption, Exit.untraced))
    )
}

function makeTestManaged(ref: Ref.Ref<number>): Managed<unknown, never, void> {
  const reserve = Ref.update_(ref, (n) => n + 1)
  const acquire = Ref.update_(ref, (n) => n + 1)
  const release = Ref.update_(ref, (n) => (n > 0 ? 0 : -1))
  return Managed.fromReservationEffect(reserve.as(Reservation(acquire, () => release)))
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

  describe("forEachDiscard", () => {
    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.forEachDiscard(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })
  })

  describe("forEachParDiscard", () => {
    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.forEachParDiscard(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("runs reservations in parallel", async () => {
      const count = await parallelReservations(4, (res) =>
        Managed.forEachParDiscard(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("runs acquisitions in parallel", async () => {
      const count = await parallelAcquisitions(4, (res) =>
        Managed.forEachParDiscard(List.from([1, 2, 3, 4]), () => res)
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })
  })

  describe("forEachParDiscard - parallelism", () => {
    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.forEachParDiscard(List.from([1, 2, 3, 4]), () => res)
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("uses at most n fibers for reservation", async () => {
      const count = await parallelReservations(2, (res) =>
        Managed.forEachParDiscard(List.from([1, 2, 3, 4]), () => res)
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(2)
    })

    it("uses at most n fibers for acquisition", async () => {
      const count = await parallelAcquisitions(2, (res) =>
        Managed.forEachParDiscard(List.from([1, 2, 3, 4]), () => res)
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(2)
    })
  })

  describe("fork", () => {
    it("runs finalizers properly", async () => {
      const forkTest = Effect.Do()
        .bind("finalized", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .tap(({ finalized, latch }) =>
          Managed.fromReservation(
            Reservation(Promise.succeed_(latch, undefined).zipRight(Effect.never), () =>
              Ref.set_(finalized, true)
            )
          )
            .fork()
            .useDiscard(Promise.await(latch))
        )
        .flatMap(({ finalized }) => Ref.get(finalized))

      // Since `forkTest` uses Effect.never race the real test against a
      // 10 second timer and fail the test if it didn't complete. This
      // delay time may be increased if it turns out this test is flaky.
      const result = await Effect.sleep(10000)
        .zipRight(Effect.succeedNow(false))
        .race(forkTest)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("acquires interruptibly", async () => {
      const forkTest = Effect.Do()
        .bind("finalized", () => Ref.make(false))
        .bind("acquireLatch", () => Promise.make<never, void>())
        .bind("useLatch", () => Promise.make<never, void>())
        .bind("fiber", ({ acquireLatch, finalized, useLatch }) =>
          Managed.fromReservation(
            Reservation(
              Promise.succeed_(acquireLatch, undefined).zipRight(Effect.never),
              () => Ref.set_(finalized, true)
            )
          )
            .fork()
            .useDiscard(Promise.succeed_(useLatch, undefined).zipRight(Effect.never))
            .fork()
        )
        .tap(({ acquireLatch }) => Promise.await(acquireLatch))
        .tap(({ useLatch }) => Promise.await(useLatch))
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .flatMap(({ finalized }) => Ref.get(finalized))

      // Since `forkTest` uses Effect.never race the real test against a
      // 10 second timer and fail the test if it didn't complete. This
      // delay time may be increased if it turns out this test is flaky.
      const result = await Effect.sleep(10000)
        .zipRight(Effect.succeedNow(false))
        .race(forkTest)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("ifManaged", () => {
    it("runs `onTrue` if the result of `b` is `true`", async () => {
      const result = await Managed.ifManaged(
        Managed.succeed(true),
        Managed.succeed(true),
        Managed.succeed(false)
      )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("runs `onFalse` if the result of `b` is `false`", async () => {
      const result = await Managed.ifManaged(
        Managed.succeed(false),
        Managed.succeed(true),
        Managed.succeed(false)
      )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("mergeAll", () => {
    it("merges elements in the correct order", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.mergeAll(
        List.map_(List.from([1, 2, 3, 4]), res),
        List.empty<number>(),
        (acc, a) => List.prepend_(acc, a)
      )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(List.from([4, 3, 2, 1]))
    })

    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.mergeAll(
          List.from(Array.from({ length: 4 }, () => res)),
          constVoid(),
          (_, b) => b
        )
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })
  })

  describe("mergeAllPar", () => {
    it("merges elements", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.mergeAllPar(
        List.map_(List.from([1, 2, 3, 4]), res),
        List.empty<number>(),
        (acc, a) => List.prepend_(acc, a)
      )
        .use((res) => Effect.succeedNow(List.toArray(res)))
        .unsafeRunPromise()

      expect(result).toContain(1)
      expect(result).toContain(2)
      expect(result).toContain(3)
      expect(result).toContain(4)
    })

    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.mergeAllPar(
          List.from(Array.from({ length: 4 }, () => res)),
          constVoid(),
          (_, b) => b
        )
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("runs reservations in parallel", async () => {
      const count = await parallelReservations(4, (res) =>
        Managed.mergeAllPar(
          List.from(Array.from({ length: 4 }, () => res)),
          constVoid(),
          (_, b) => b
        )
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("runs acquisitions in parallel", async () => {
      const count = await parallelAcquisitions(4, (res) =>
        Managed.mergeAllPar(
          List.from(Array.from({ length: 4 }, () => res)),
          constVoid(),
          (_, b) => b
        )
      ).unsafeRunPromise()

      expect(count).toBe(4)
    })
  })

  describe("mergeAllPar - parallelism", () => {
    it("merges elements", async () => {
      function res(n: number): Managed<unknown, never, number> {
        return Managed.succeed(n)
      }

      const result = await Managed.mergeAllPar(
        List.map_(List.from([1, 2, 3, 4]), res),
        List.empty<number>(),
        (acc, a) => List.prepend_(acc, a)
      )
        .use((res) => Effect.succeedNow(List.toArray(res)))
        .withParallelism(2)
        .unsafeRunPromise()

      expect(result).toContain(1)
      expect(result).toContain(2)
      expect(result).toContain(3)
      expect(result).toContain(4)
    })

    it("runs finalizers", async () => {
      const count = await parallelFinalizers(4, (res) =>
        Managed.mergeAllPar(
          List.from(Array.from({ length: 4 }, () => res)),
          constVoid(),
          (_, b) => b
        )
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(4)
    })

    it("uses at most n fibers for reservation", async () => {
      const count = await parallelReservations(2, (res) =>
        Managed.mergeAllPar(
          List.from(Array.from({ length: 4 }, () => res)),
          constVoid(),
          (_, b) => b
        )
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(2)
    })

    it("uses at most n fibers for acquisition", async () => {
      const count = await parallelAcquisitions(2, (res) =>
        Managed.mergeAllPar(
          List.from(Array.from({ length: 4 }, () => res)),
          constVoid(),
          (_, b) => b
        )
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(count).toBe(2)
    })

    it("all finalizers run even when finalizers have defects", async () => {
      const count = await Effect.Do()
        .bind("releases", () => Ref.make(0))
        .tap(({ releases }) =>
          Managed.mergeAllPar(
            List.from([
              Managed.finalizer(Effect.dieMessage("Boom")),
              Managed.finalizer(Ref.update_(releases, (n) => n + 1)),
              Managed.finalizer(Effect.dieMessage("Boom")),
              Managed.finalizer(Ref.update_(releases, (n) => n + 1)),
              Managed.finalizer(Effect.dieMessage("Boom")),
              Managed.finalizer(Ref.update_(releases, (n) => n + 1))
            ]),
            constVoid(),
            (_, b) => b
          )
            .useDiscard(Effect.unit)
            .exit()
            .withParallelism(2)
        )
        .flatMap(({ releases }) => Ref.get(releases))
        .unsafeRunPromise()

      expect(count).toBe(3)
    })
  })

  describe("onExit", () => {
    it("calls the cleanup", async () => {
      const { finalizers, result } = await Effect.Do()
        .bind("finalizersRef", () => Ref.make(List.empty<string>()))
        .bind("resultRef", () => Ref.make(O.emptyOf<Exit.Exit<never, string>>()))
        .tap(({ finalizersRef, resultRef }) =>
          Managed.acquireReleaseWith(Effect.succeed("42"), () =>
            Ref.update_(finalizersRef, List.prepend("First"))
          )
            .onExit((e) =>
              Ref.update_(finalizersRef, List.prepend("Second")).zipRight(
                Ref.set_(resultRef, O.some(e))
              )
            )
            .useDiscard(Effect.unit)
        )
        .bind("finalizers", ({ finalizersRef }) => Ref.get(finalizersRef))
        .bind("result", ({ resultRef }) => Ref.get(resultRef))
        .unsafeRunPromise()

      expect(finalizers).toEqual(List.from(["Second", "First"]))
      expect(result).toEqual(O.some(Exit.succeed("42")))
    })
  })

  describe("option", () => {
    it("return success in Some", async () => {
      const result = await Managed.succeed(11).option().useNow().unsafeRunPromise()

      expect(result).toEqual(O.some(11))
    })

    it("return failure as None", async () => {
      const result = await Managed.fail(123)
        .option()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(O.none)
    })

    it("not catch throwable", async () => {
      const result = await Managed.die(ExampleError)
        .option()
        .exit()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.die(ExampleError))
    })

    it("catch throwable after sandboxing", async () => {
      const result = await Managed.die(ExampleError)
        .sandbox()
        .option()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(O.none)
    })
  })

  describe("optional", () => {
    it("fails when given Some error", async () => {
      const result = await Managed.fail(O.some("Error"))
        .unsome()
        .exit()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail("Error"))
    })

    it("succeeds with None given None error", async () => {
      const result = await Managed.fail(O.none)
        .unsome()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(O.none)
    })

    it("succeeds with Some given a value", async () => {
      const result = await Managed.succeed(1).unsome().useNow().unsafeRunPromise()

      expect(result).toEqual(O.some(1))
    })
  })

  describe("onExitFirst", () => {
    it("calls the cleanup", async () => {
      const { finalizers, result } = await Effect.Do()
        .bind("finalizersRef", () => Ref.make(List.empty<string>()))
        .bind("resultRef", () => Ref.make(O.emptyOf<Exit.Exit<never, string>>()))
        .tap(({ finalizersRef, resultRef }) =>
          Managed.acquireReleaseWith(Effect.succeed("42"), () =>
            Ref.update_(finalizersRef, List.prepend("First"))
          )
            .onExitFirst((e) =>
              Ref.update_(finalizersRef, List.prepend("Second")).zipRight(
                Ref.set_(resultRef, O.some(e))
              )
            )
            .useDiscard(Effect.unit)
        )
        .bind("finalizers", ({ finalizersRef }) => Ref.get(finalizersRef))
        .bind("result", ({ resultRef }) => Ref.get(resultRef))
        .unsafeRunPromise()

      expect(finalizers).toEqual(List.from(["First", "Second"]))
      expect(result).toEqual(O.some(Exit.succeed("42")))
    })
  })

  describe("orElseFail", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const result = await Managed.succeed(true)
        .orElseFail(false)
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("otherwise fails with the specified error", async () => {
      const result = await Managed.fail(false)
        .orElseFail(true)
        .flip()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("orElseSucceed", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const result = await Managed.succeed(true)
        .orElseSucceed(false)
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("otherwise succeeds with the specified value", async () => {
      const result = await Managed.fail(false)
        .orElseSucceed(true)
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("preallocate", () => {
    it("runs finalizer on interruption", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("res", ({ ref }) =>
          Managed.fromReservation(
            Reservation(Effect.interrupt, () => Ref.update_(ref, (n) => n + 1))
          )
        )
        .tap(({ res }) => res.preallocate().exit().ignore())
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("runs finalizer when resource closes", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("res", ({ ref }) =>
          Managed.fromReservation(
            Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
          )
        )
        .tap(({ res }) => res.preallocate().flatMap((_) => _.useDiscard(Effect.unit)))
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("propagates failures in acquire", async () => {
      const result = await Managed.fromEffect(Effect.fail("boom"))
        .preallocate()
        .either()
        .unsafeRunPromise()

      expect(result).toEqual(Either.left("boom"))
    })

    it("propagates failures in reserve", async () => {
      const result = await Managed.acquireReleaseWith(
        Effect.fail("boom"),
        () => Effect.unit
      )
        .preallocate()
        .either()
        .unsafeRunPromise()

      expect(result).toEqual(Either.left("boom"))
    })
  })

  describe("preallocateManaged", () => {
    it("run release on interrupt while entering inner scope", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.fromReservation(
            Reservation(Effect.interrupt, () => Ref.update_(ref, (n) => n + 1))
          )
            .preallocateManaged()
            .useDiscard(Effect.unit)
            .exit()
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("eagerly run acquisition when preallocateManaged is invoked", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.fromReservation(
            Reservation(
              Ref.update_(ref, (n) => n + 1),
              () => Effect.unit
            )
          )
            .preallocateManaged()
            .use((r) => Ref.get(ref).zip(r.useDiscard(Ref.get(ref))))
        )
        .unsafeRunPromise()

      expect(result).toEqual(Tp.tuple(1, 1))
    })

    it("run release on scope exit", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.fromReservation(
            Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
          )
            .preallocateManaged()
            .useDiscard(Effect.unit)
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("don't run release twice", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.fromReservation(
            Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
          )
            .preallocateManaged()
            .use((_) => _.useDiscard(Effect.unit))
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("reduceAll", () => {
    it("reduces elements in the correct order", async () => {
      function res(n: number): Managed<unknown, never, List.List<number>> {
        return Managed.succeed(List.of(n))
      }

      const result = await Managed.reduceAll(
        Managed.succeed(List.empty()),
        List.map_(List.from([1, 2, 3, 4]), res),
        (a1, a2) => List.concat_(a1, a2)
      )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(List.from([1, 2, 3, 4]))
    })

    it("runs finalizers", async () => {
      const result = await parallelFinalizers(4, (res) =>
        Managed.reduceAll(
          Managed.succeed(constVoid),
          List.from(Array.from({ length: 4 }, () => res)),
          (a, _) => a
        )
      ).unsafeRunPromise()

      expect(result).toBe(4)
    })
  })

  describe("reduceAllPar", () => {
    it("reduces elements", async () => {
      function res(n: number): Managed<unknown, never, List.List<number>> {
        return Managed.succeed(List.of(n))
      }

      const result = await Managed.reduceAllPar(
        Managed.succeed(List.empty()),
        List.map_(List.from([1, 2, 3, 4]), res),
        (a1, a2) => List.concat_(a1, a2)
      )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(List.from([1, 2, 3, 4]))
    })

    it("runs finalizers", async () => {
      const result = await parallelFinalizers(4, (res) =>
        Managed.reduceAllPar(
          Managed.succeed(constVoid),
          List.from(Array.from({ length: 4 }, () => res)),
          (a, _) => a
        )
      ).unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("runs reservations in parallel", async () => {
      const result = await parallelReservations(4, (res) =>
        Managed.reduceAllPar(
          Managed.succeed(constVoid),
          List.from(Array.from({ length: 4 }, () => res)),
          (a, _) => a
        )
      ).unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("runs acquisitions in parallel", async () => {
      const result = await parallelAcquisitions(4, (res) =>
        Managed.reduceAllPar(
          Managed.succeed(constVoid),
          List.from(Array.from({ length: 4 }, () => res)),
          (a, _) => a
        )
      ).unsafeRunPromise()

      expect(result).toBe(4)
    })
  })

  describe("reduceAllPar - parallelism", () => {
    it("reduces elements", async () => {
      function res(n: number): Managed<unknown, never, List.List<number>> {
        return Managed.succeed(List.of(n))
      }

      const result = await Managed.reduceAllPar(
        Managed.succeed(List.empty()),
        List.map_(List.from([1, 2, 3, 4]), res),
        (a1, a2) => List.concat_(a1, a2)
      )
        .withParallelism(2)
        .use(Effect.succeedNow)
        .map(List.toArray)
        .unsafeRunPromise()

      expect(result).toContain(1)
      expect(result).toContain(2)
      expect(result).toContain(3)
      expect(result).toContain(4)
    })

    it("Runs finalizers", async () => {
      const result = await parallelFinalizers(4, (res) =>
        Managed.reduceAllPar(
          Managed.succeed(constVoid),
          List.from(Array.from({ length: 4 }, () => res)),
          (a, _) => a
        )
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("uses at most n fibers for reservation", async () => {
      const result = await parallelReservations(2, (res) =>
        Managed.reduceAllPar(
          Managed.succeed(constVoid),
          List.from(Array.from({ length: 4 }, () => res)),
          (a, _) => a
        )
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("uses at most n fibers for acquisition", async () => {
      const result = await parallelAcquisitions(2, (res) =>
        Managed.reduceAllPar(
          Managed.succeed(constVoid),
          List.from(Array.from({ length: 4 }, () => res)),
          (a, _) => a
        )
      )
        .withParallelism(2)
        .unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("all finalizers run even when finalizers have defects", async () => {
      const result = await Effect.Do()
        .bind("releases", () => Ref.make(0))
        .tap(({ releases }) =>
          Managed.reduceAllPar(
            Managed.finalizer(Effect.dieMessage("Boom")),
            List.from([
              Managed.finalizer(Ref.update_(releases, (n) => n + 1)),
              Managed.finalizer(Effect.dieMessage("Boom")),
              Managed.finalizer(Ref.update_(releases, (n) => n + 1)),
              Managed.finalizer(Effect.dieMessage("Boom")),
              Managed.finalizer(Ref.update_(releases, (n) => n + 1))
            ]),
            constVoid
          )
            .useDiscard(Effect.unit)
            .exit()
            .withParallelism(2)
        )
        .flatMap(({ releases }) => Ref.get(releases))
        .unsafeRunPromise()

      expect(result).toBe(3)
    })
  })

  describe("someError", () => {
    it("extracts the value from Some", async () => {
      const result = await Managed.succeed(O.some(1))
        .someError()
        .useNow()
        .unsafeRunPromise()

      expect(result).toEqual(1)
    })

    it("fails on None", async () => {
      const result = await Managed.succeed(O.none)
        .someError()
        .exit()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail(O.none))
    })

    it("fails when given an exception", async () => {
      const exception = new RuntimeError("Failed Task")
      const result = await Managed.fail(exception)
        .someError()
        .exit()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail(O.some(exception)))
    })
  })

  describe("someOrElse", () => {
    it("extracts the value from Some", async () => {
      const result = await Managed.succeed(O.some(1))
        .someOrElse(2)
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("falls back to the default value if None", async () => {
      const result = await Managed.succeed(O.none)
        .someOrElse(42)
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("does not change failed state", async () => {
      const result = await Managed.fail(ExampleError)
        .someOrElse(42)
        .exit()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("someOrElseManaged", () => {
    it("extracts the value from Some", async () => {
      const result = await Managed.succeed(O.some(1))
        .someOrElseManaged(Managed.succeed(2))
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("falls back to the default value if None", async () => {
      const result = await Managed.succeed(O.none)
        .someOrElseManaged(Managed.succeed(42))
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("does not change failed state", async () => {
      const result = await Managed.fail(ExampleError)
        .someOrElseManaged(Managed.succeed(42))
        .exit()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("someOrFailException", () => {
    it("extracts the optional value", async () => {
      const result = await Managed.succeed(O.some(42))
        .someOrFailException()
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("fails when given a None", async () => {
      const result = await Managed.succeed(O.emptyOf<number>())
        .someOrFailException()
        .exit()
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe("reject", () => {
    it("returns failure ignoring value", async () => {
      const goodCase = Managed.succeed(0)
        .reject((n) => (n !== 0 ? O.some("Partial failed!") : O.none))
        .sandbox()
        .either()

      const badCase = Managed.succeed(1)
        .reject((n) => (n !== 0 ? O.some("Partial failed!") : O.none))
        .sandbox()
        .either()
        .map((_) => _.mapLeft(Cause.failureOrCause))

      const { badCaseResult, goodCaseResult } = await Effect.Do()
        .bind("goodCaseResult", () => goodCase.use(Effect.succeedNow))
        .bind("badCaseResult", () => badCase.use(Effect.succeedNow))
        .unsafeRunPromise()

      expect(goodCaseResult).toEqual(Either.right(0))
      expect(badCaseResult).toEqual(Either.left(Either.left("Partial failed!")))
    })
  })

  describe("rejectManaged", () => {
    it("returns failure ignoring value", async () => {
      const goodCase = Managed.succeed(0)
        .rejectManaged((n) =>
          n !== 0 ? O.some(Managed.succeed("Partial failed!")) : O.none
        )
        .sandbox()
        .either()

      const partialBadCase = Managed.succeed(1)
        .rejectManaged((n) =>
          n !== 0 ? O.some(Managed.fail("Partial failed!")) : O.none
        )
        .sandbox()
        .either()
        .map((_) => _.mapLeft(Cause.failureOrCause))

      const badCase = Managed.succeed(1)
        .rejectManaged((n) =>
          n !== 0 ? O.some(Managed.fail("Partial failed!")) : O.none
        )
        .sandbox()
        .either()
        .map((_) => _.mapLeft(Cause.failureOrCause))

      const { r1, r2, r3 } = await Effect.Do()
        .bind("r1", () => goodCase.use(Effect.succeedNow))
        .bind("r2", () => partialBadCase.use(Effect.succeedNow))
        .bind("r3", () => badCase.use(Effect.succeedNow))
        .unsafeRunPromise()

      expect(r1).toEqual(Either.right(0))
      expect(r2).toEqual(Either.left(Either.left("Partial failed!")))
      expect(r3).toEqual(Either.left(Either.left("Partial failed!")))
    })
  })

  describe("release", () => {
    it("closes the scope", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<string>()))
        .bindValue("a", ({ ref }) =>
          Managed.acquireReleaseWith(
            Ref.update_(ref, Chunk.append("acquiring a")),
            () => Ref.update_(ref, Chunk.append("releasing a"))
          )
        )
        .bindValue("b", ({ ref }) =>
          Managed.acquireReleaseWith(
            Ref.update_(ref, Chunk.append("acquiring b")),
            () => Ref.update_(ref, Chunk.append("releasing b"))
          )
        )
        .bindValue("c", ({ ref }) =>
          Managed.acquireReleaseWith(
            Ref.update_(ref, Chunk.append("acquiring c")),
            () => Ref.update_(ref, Chunk.append("releasing c"))
          )
        )
        .bindValue("managed", ({ a, b, c }) => a > b.release() > c)
        .tap(({ managed }) => managed.useNow())
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      const expected = [
        "acquiring a",
        "acquiring b",
        "releasing b",
        "acquiring c",
        "releasing c",
        "releasing a"
      ]
      expect(Chunk.toArray(result)).toEqual(expected)
    })
  })

  // TODO(Mike/Max): after implementation of Schedule
  // suite("retry")(
  //   it("Should retry the reservation") {
  //     for {
  //       retries <- Ref.make(0)
  //       program =
  //         ZManaged
  //           .acquireReleaseWith(retries.updateAndGet(_ + 1).flatMap(r => if (r == 3) ZIO.unit else ZIO.fail(())))(_ =>
  //             ZIO.unit
  //           )
  //       _ <- program.retry(Schedule.recurs(3)).use(_ => ZIO.unit).ignore
  //       r <- retries.get
  //     } yield assert(r)(equalTo(3))
  //   },
  //   it("Should retry the acquisition") {
  //     for {
  //       retries <- Ref.make(0)
  //       program = Managed.fromReservation(
  //                   Reservation(
  //                     retries.updateAndGet(_ + 1).flatMap(r => if (r == 3) ZIO.unit else ZIO.fail(())),
  //                     _ => ZIO.unit
  //                   )
  //                 )
  //       _ <- program.retry(Schedule.recurs(3)).use(_ => ZIO.unit).ignore
  //       r <- retries.get
  //     } yield assert(r)(equalTo(3))
  //   }
  // ) @@ zioTag(errors)

  describe("preallocationScope", () => {
    it("runs finalizer on interruption", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.preallocationScope
            .use((preallocate) =>
              preallocate(
                Managed.fromReservation(
                  Reservation(Effect.interrupt, () => Ref.update_(ref, (n) => n + 1))
                )
              )
                .exit()
                .ignore()
            )
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("runs finalizer when resource closes", async () => {
      const result = await Managed.preallocationScope
        .use((preallocate) =>
          Effect.Do()
            .bind("ref", () => Ref.make(0))
            .bindValue("res", ({ ref }) =>
              Managed.fromReservation(
                Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
              )
            )
            .tap(({ res }) =>
              preallocate(res).flatMap((_) => _.useDiscard(Effect.unit))
            )
            .flatMap(({ ref }) => Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("propagates failures in acquire", async () => {
      const result = await Managed.preallocationScope
        .use((preallocate) =>
          preallocate(Managed.fromEffect(Effect.fail("boom"))).either()
        )
        .unsafeRunPromise()

      expect(result).toEqual(Either.left("boom"))
    })

    it("propagates failures in reserve", async () => {
      const result = await Managed.preallocationScope
        .use((preallocate) =>
          preallocate(
            Managed.acquireReleaseWith(Effect.fail("boom"), () => Effect.unit)
          ).either()
        )
        .unsafeRunPromise()

      expect(result).toEqual(Either.left("boom"))
    })

    it("eagerly run acquisition when preallocate is invoked", async () => {
      const { r1, r2 } = await Managed.preallocationScope
        .use((preallocate) =>
          Effect.Do()
            .bind("ref", () => Ref.make(0))
            .bind("res", ({ ref }) =>
              preallocate(
                Managed.fromReservation(
                  Reservation(
                    Ref.update_(ref, (n) => n + 1),
                    () => Effect.unit
                  )
                )
              )
            )
            .bind("r1", ({ ref }) => Ref.get(ref))
            .tap(({ res }) => res.useDiscard(Effect.unit))
            .bind("r2", ({ ref }) => Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(r1).toBe(1)
      expect(r2).toBe(1)
    })

    it("run release on scope exit", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.preallocationScope
            .use((preallocate) =>
              preallocate(
                Managed.fromReservation(
                  Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
                )
              )
            )
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("don't run release twice", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.preallocationScope
            .use((preallocate) =>
              preallocate(
                Managed.fromReservation(
                  Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
                )
              ).flatMap((_) => _.useDiscard(Effect.unit))
            )
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("can be used multiple times", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.preallocationScope
            .use((preallocate) => {
              const res = Managed.fromReservation(
                Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
              )
              return preallocate(res).zipRight(preallocate(res))
            })
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(2)
    })
  })

  describe("scope", () => {
    it("runs finalizer on interruption", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("managed", ({ ref }) => makeTestManaged(ref))
        .bindValue("effect", ({ managed }) =>
          Managed.scope.use((scope) => scope(managed).fork().flatMap(Fiber.join))
        )
        .bind("fiber", ({ effect }) => effect.fork())
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("runs finalizer when close is called", async () => {
      const { res1, res2 } = await Managed.scope
        .use((scope) =>
          Effect.Do()
            .bind("ref", () => Ref.make(0))
            .bindValue("res", ({ ref }) =>
              Managed.fromReservation(
                Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
              )
            )
            .flatMap(({ ref, res }) =>
              scope(res).flatMap(({ tuple: [close, _] }) =>
                Effect.Do()
                  .bind("res1", () => Ref.get(ref))
                  .tap(() => close(Exit.unit))
                  .bind("res2", () => Ref.get(ref))
              )
            )
        )
        .unsafeRunPromise()

      expect(res1).toBe(0)
      expect(res2).toBe(1)
    })

    it("propagates failures in acquire", async () => {
      const result = await Managed.scope
        .use((scope) => scope(Managed.fromEffect(Effect.fail("boom"))).either())
        .unsafeRunPromise()

      expect(result).toEqual(Either.left("boom"))
    })

    it("propagates failures in reserve", async () => {
      const result = await Managed.scope
        .use((scope) =>
          scope(
            Managed.acquireReleaseWith(Effect.fail("boom"), () => Effect.unit)
          ).either()
        )
        .unsafeRunPromise()

      expect(result).toEqual(Either.left("boom"))
    })

    it("run release on scope exit", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.scope
            .use((scope) =>
              scope(
                Managed.fromReservation(
                  Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
                )
              )
            )
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("don't run release twice", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.scope
            .use((scope) =>
              scope(
                Managed.fromReservation(
                  Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
                )
              ).flatMap((_) => _.get(0)(Exit.unit))
            )
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("can be used multiple times", async () => {
      const result = await Ref.make(0)
        .flatMap((ref) =>
          Managed.scope
            .use((scope) => {
              const res = Managed.fromReservation(
                Reservation(Effect.unit, () => Ref.update_(ref, (n) => n + 1))
              )
              return scope(res).zipRight(scope(res))
            })
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toBe(2)
    })
  })

  describe("tap", () => {
    it("doesn't change the managed resource", async () => {
      const result = await Managed.succeed(1)
        .tap((n) => Managed.succeed(n + 1))
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    test("runs given effect", async () => {
      const result = await Ref.make(0)
        .toManaged()
        .tap((ref) => Ref.update_(ref, (n) => n + 1).toManaged())
        .mapEffect(Ref.get)
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("tapBoth", () => {
    it("doesn't change the managed resource", async () => {
      const result = await Managed.fromEither(Either.right(1))
        .tapBoth(
          () => Managed.unit,
          (n) => Managed.succeed(n + 1)
        )
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("runs given effect on failure", async () => {
      const result = await Managed.Do()
        .bind("ref", () => Ref.make(0).toManaged())
        .tap(({ ref }) =>
          Managed.fromEither(Either.left(1)).tapBoth(
            (e) => Ref.update_(ref, (n) => n + e).toManaged(),
            () => Managed.unit
          )
        )
        .flatMap(({ ref }) => Ref.get(ref).toManaged())
        .fold(identity, identity)
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("runs given effect on success", async () => {
      const result = await Managed.Do()
        .bind("ref", () => Ref.make(1).toManaged())
        .tap(({ ref }) =>
          Managed.fromEither(Either.right(2)).tapBoth(
            () => Managed.unit,
            (n) => Ref.update_(ref, (_) => _ + n).toManaged()
          )
        )
        .flatMap(({ ref }) => Ref.get(ref).toManaged())
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(3)
    })
  })

  describe("tapError", () => {
    test("doesn't change the managed resource", async () => {
      const result = await Managed.fromEither(Either.rightW<number, string>(1))
        .tapError((str) => Managed.succeed(str.length))
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("runs given effect on failure", async () => {
      const result = await Managed.Do()
        .bind("ref", () => Ref.make(0).toManaged())
        .tap(({ ref }) =>
          Managed.fromEither(Either.left(1)).tapError((e) =>
            Ref.update_(ref, (_) => _ + e).toManaged()
          )
        )
        .flatMap(({ ref }) => Ref.get(ref).toManaged())
        .fold(identity, identity)
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("doesn't run given effect on success", async () => {
      const result = await Managed.Do()
        .bind("ref", () => Ref.make(1).toManaged())
        .tap(({ ref }) =>
          Managed.fromEither(Either.rightW<number, number>(2)).tapError((n) =>
            Ref.update_(ref, (_) => _ + n).toManaged()
          )
        )
        .flatMap(({ ref }) => Ref.get(ref).toManaged())
        .useNow()
        .unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("tapErrorCause", () => {
    it("effectually peeks at the cause of the failure of the acquired resource", async () => {
      const { effect, result } = await Managed.Do()
        .bind("ref", () => Ref.make(false).toManaged())
        .bind("result", ({ ref }) =>
          Managed.dieMessage("die")
            .tapErrorCause(() => Ref.set_(ref, true).toManaged())
            .exit()
        )
        .bind("effect", ({ ref }) => Ref.get(ref).toManaged())
        .useNow()
        .unsafeRunPromise()

      expect(effect).toBe(true)
      expect(Exit.untraced(result)).toEqual(Exit.die(new RuntimeError("die")))
    })
  })

  describe("timed", () => {
    it("should time both the reservation and the acquisition", async () => {
      const managed = Managed.fromReservationEffect(
        Effect.sleep(10).zipRight(
          Effect.succeed(Reservation(Effect.sleep(10), () => Effect.unit))
        )
      )

      const test = managed
        .timed()
        .use(({ tuple: [duration, _] }) => Effect.succeed(duration))

      const result = await test.fork().flatMap(Fiber.join).unsafeRunPromise()

      expect(result).toBeGreaterThanOrEqual(20)
    })
  })

  describe("timeout", () => {
    it("returns Some if the timeout isn't reached", async () => {
      const result = await Managed.acquireReleaseWith(
        Effect.succeed(1),
        () => Effect.unit
      )
        .timeout(100000)
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toEqual(O.some(1))
    })

    it("returns None if the reservation takes longer than d", async () => {
      const { result } = await Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bindValue("managed", ({ latch }) =>
          Managed.acquireReleaseWith(Promise.await(latch), () => Effect.unit)
        )
        .bind("result", ({ managed }) => managed.timeout(0).use(Effect.succeedNow))
        .tap(({ latch }) => Promise.succeed_(latch, undefined))
        .unsafeRunPromise()

      expect(result).toBe(O.none)
    })

    it("returns None if the acquisition takes longer than d", async () => {
      const { result } = await Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bindValue("managed", ({ latch }) =>
          Managed.fromReservation(Reservation(Promise.await(latch), () => Effect.unit))
        )
        .bind("result", ({ managed }) => managed.timeout(0).use(Effect.succeedNow))
        .tap(({ latch }) => Promise.succeed_(latch, undefined))
        .unsafeRunPromise()

      expect(result).toBe(O.none)
    })

    it("runs finalizers if returning None and reservation is successful", async () => {
      const { result } = await Effect.Do()
        .bind("reserveLatch", () => Promise.make<never, void>())
        .bind("releaseLatch", () => Promise.make<never, void>())
        .bindValue("managed", ({ releaseLatch, reserveLatch }) =>
          Managed.fromReservation(
            Reservation(Promise.await(reserveLatch), () =>
              Promise.succeed_(releaseLatch, undefined)
            )
          )
        )
        .bind("result", ({ managed }) => managed.timeout(0).use(Effect.succeedNow))
        .tap(({ reserveLatch }) => Promise.succeed_(reserveLatch, undefined))
        .tap(({ releaseLatch }) => Promise.await(releaseLatch))
        .unsafeRunPromise()

      expect(result).toBe(O.none)
    })

    it("runs finalizers if returning None and reservation is successful after timeout", async () => {
      const { result } = await Effect.Do()
        .bind("acquireLatch", () => Promise.make<never, void>())
        .bind("releaseLatch", () => Promise.make<never, void>())
        .bindValue("managed", ({ acquireLatch, releaseLatch }) =>
          Managed.fromReservationEffect(
            Promise.await(acquireLatch).zipRight(
              Effect.succeed(
                Reservation(Effect.unit, () =>
                  Promise.succeed_(releaseLatch, undefined)
                )
              )
            )
          )
        )
        .bind("result", ({ managed }) => managed.timeout(0).use(Effect.succeedNow))
        .tap(({ acquireLatch }) => Promise.succeed_(acquireLatch, undefined))
        .tap(({ releaseLatch }) => Promise.await(releaseLatch))
        .unsafeRunPromise()

      expect(result).toBe(O.none)
    })
  })

  describe("toLayer", () => {
    it("converts a managed effect to a memoized Layer", async () => {
      const result = await Managed.service(EnvA)
        .provideSomeLayer(Managed.succeed({ a: 1 }).toLayer(EnvA))
        .useNow()
        .unsafeRunPromise()

      expect(result.a).toBe(1)
    })
  })

  describe("toLayerRaw", () => {
    it("converts a managed effect to a non-memoized Layer", async () => {
      const result = await Managed.service(EnvA)
        .provideSomeLayer(LiveEnvA)
        .useNow()
        .unsafeRunPromise()

      expect(result.a).toBe(1)
    })
  })

  describe("withEarlyRelease", () => {
    it("provides a canceler that can be used to eagerly evaluate the finalizer", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bindValue("managed", ({ ref }) =>
          Managed.acquireReleaseWith(Effect.unit, () =>
            Ref.set_(ref, true)
          ).withEarlyRelease()
        )
        .flatMap(({ managed, ref }) =>
          managed.use(({ tuple: [canceler, _] }) => canceler.zipRight(Ref.get(ref)))
        )
        .unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("the canceler should run uninterruptibly", async () => {
      const { interruption } = await Effect.Do()
        .bind("ref", () => Ref.make(true))
        .bind("latch", () => Promise.make<never, void>())
        .bindValue("managed", ({ latch, ref }) =>
          Managed.acquireReleaseWith(Effect.unit, () =>
            Promise.succeed_(latch, undefined).zipRight(
              Effect.never.whenEffect(Ref.get(ref))
            )
          ).withEarlyRelease()
        )
        .flatMap(({ latch, managed, ref }) =>
          managed.use(({ tuple: [canceler, _] }) =>
            Effect.Do()
              .bind("fiber", () => canceler.forkDaemon())
              .tap(() => Promise.await(latch))
              .bind("interruption", ({ fiber }) => Fiber.interrupt(fiber).timeout(1000))
              .tap(() => Ref.set_(ref, false))
          )
        )
        .unsafeRunPromise()

      expect(interruption).toEqual(O.none)
    })

    it("if completed, the canceler should cause the regular finalizer to not run", async () => {
      const result = await Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(0))
        .bindValue("managed", ({ ref }) =>
          Managed.acquireReleaseWith(Effect.unit, () =>
            Ref.update_(ref, (n) => n + 1)
          ).withEarlyRelease()
        )
        .tap(({ latch, managed }) =>
          managed.use((_) => _.get(0).ensuring(Promise.succeed_(latch, undefined)))
        )
        .tap(({ latch }) => Promise.await(latch))
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("the canceler will run with an exit value indicating the effect was interrupted", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bindValue("managed", ({ ref }) =>
          Managed.acquireReleaseExitWith(Effect.unit, (_, e) =>
            Ref.set_(ref, Exit.isInterrupted(e))
          )
        )
        .tap(({ managed }) => managed.withEarlyRelease().use((_) => _.get(0)))
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("the canceler disposes of all resources on a composite Managed", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(List.empty<string>()))
        .bindValue(
          "managed",
          ({ ref }) =>
            (label: string) =>
              Managed.finalizer(Ref.update_(ref, List.prepend(label)))
        )
        .bindValue("composite", ({ managed }) =>
          managed("1").zipRight(managed("2")).zipRight(managed("3")).withEarlyRelease()
        )
        .flatMap(({ composite, ref }) =>
          composite.use(({ tuple: [release, _] }) => release.zipRight(Ref.get(ref)))
        )
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["1", "2", "3"]))
    })
  })

  describe("withEarlyReleaseExit", () => {
    it("Allows specifying an exit value", async () => {
      const result = await Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bindValue("managed", ({ ref }) =>
          Managed.acquireReleaseExitWith(Effect.unit, (_, e) =>
            Ref.set_(ref, Exit.isSuccess(e))
          )
        )
        .tap(({ managed }) =>
          managed.withEarlyReleaseExit(Exit.unit).use((_) => _.get(0))
        )
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("withRuntimeConfig", () => {
    it("runs acquire, use, and release actions on the specified runtime configuration", async () => {
      const runtimeConfig = Effect.runtimeConfig
      const global = Effect.defaultRuntimeConfig

      const { acquire, after, before, def, release, use } = await Effect.Do()
        .bind("def", () => runtimeConfig)
        .bind("ref1", ({ def }) => Ref.make(def))
        .bind("ref2", ({ def }) => Ref.make(def))
        .bindValue("managed", ({ ref1, ref2 }) =>
          Managed.acquireRelease(
            runtimeConfig.flatMap((_) => Ref.set_(ref1, _)),
            runtimeConfig.flatMap((_) => Ref.set_(ref2, _))
          ).withRuntimeConfig(global)
        )
        .bind("before", () => runtimeConfig)
        .bind("use", ({ managed }) => managed.useDiscard(runtimeConfig))
        .bind("acquire", ({ ref1 }) => Ref.get(ref1))
        .bind("release", ({ ref2 }) => Ref.get(ref2))
        .bind("after", () => runtimeConfig)
        .unsafeRunPromise()

      expect(before).toEqual(def)
      expect(acquire).toEqual(global)
      expect(use).toEqual(global)
      expect(release).toEqual(global)
      expect(after).toEqual(def)
    })
  })

  describe("zipPar", () => {
    it("does not swallow exit cause if one reservation fails", async () => {
      const result = await Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bindValue("first", ({ latch }) =>
          Managed.fromEffect(
            Promise.succeed_(latch, undefined).zipRight(Effect.sleep(100000))
          )
        )
        .bindValue("second", ({ latch }) =>
          Managed.fromEffect(Promise.await(latch).zipRight(Effect.fail(undefined)))
        )
        .tap(({ first, second }) => first.zipPar(second).useDiscard(Effect.unit))
        .map(constVoid)
        .exit()
        .unsafeRunPromise()

      expect(Exit.isFailure(result)).toBe(true)
    })

    it("runs finalizers if one acquisition fails", async () => {
      const result = await Effect.Do()
        .bind("releases", () => Ref.make(0))
        .bindValue("first", () => Managed.unit)
        .bindValue("second", ({ releases }) =>
          Managed.fromReservation(
            Reservation(Effect.fail(undefined), () =>
              Ref.update_(releases, (n) => n + 1)
            )
          )
        )
        .tap(({ first, second }) =>
          first
            .zipPar(second)
            .use(() => Effect.unit)
            .ignore()
        )
        .flatMap(({ releases }) => Ref.get(releases))
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("does not swallow acquisition if one acquisition fails", async () => {
      const result = await Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("latch", () => Promise.make<never, void>())
        .bindValue("first", ({ latch }) =>
          Managed.fromEffect(
            Promise.succeed_(latch, undefined).zipRight(Effect.sleep(100000))
          )
        )
        .bindValue("second", ({ latch }) =>
          Managed.fromReservation(
            Reservation(
              Promise.await(latch).zipRight(Effect.fail(undefined)),
              () => Effect.unit
            )
          )
        )
        .tap(({ first, second }) => first.zipPar(second).useDiscard(Effect.unit))
        .map(constVoid)
        .exit()
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toHaveProperty("cause.right._tag", "Fail")
      expect(Exit.untraced(result)).toHaveProperty("cause.left.left._tag", "Interrupt")
      expect(Exit.untraced(result)).toHaveProperty("cause.left.right._tag", "Interrupt")
    })

    it("run finalizers if one reservation fails", async () => {
      const result = await Effect.Do()
        .bind("reserveLatch", () => Promise.make<never, void>())
        .bind("releases", () => Ref.make(0))
        .bindValue("first", ({ releases, reserveLatch }) =>
          Managed.fromReservation(
            Reservation(Promise.succeed_(reserveLatch, undefined), () =>
              Ref.update_(releases, (n) => n + 1)
            )
          )
        )
        .bindValue("second", ({ reserveLatch }) =>
          Managed.fromEffect(
            Promise.await(reserveLatch).zipRight(Effect.fail(undefined))
          )
        )
        .tap(({ first, second }) =>
          first.zipPar(second).useDiscard(Effect.unit).orElse(Effect.unit)
        )
        .flatMap(({ releases }) => Ref.get(releases))
        .unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("runs finalizers if it is interrupted", async () => {
      const { result1, result2 } = await Effect.Do()
        .bind("ref1", () => Ref.make(0))
        .bind("ref2", () => Ref.make(0))
        .bindValue("managed1", ({ ref1 }) => makeTestManaged(ref1))
        .bindValue("managed2", ({ ref2 }) => makeTestManaged(ref2))
        .bindValue("managed3", ({ managed1, managed2 }) => managed1.zipPar(managed2))
        .bind("fiber", ({ managed3 }) => managed3.useDiscard(Effect.unit).fork())
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .bind("result1", ({ ref1 }) => Ref.get(ref1))
        .bind("result2", ({ ref2 }) => Ref.get(ref2))
        .unsafeRunPromise()

      expect(result1).toBe(0)
      expect(result2).toBe(0)
    })
  })

  describe("flatten", () => {
    it("returns the same as Managed.flatten", async () => {
      const { flatten1, flatten2 } = await Managed.Do()
        .bind("flatten1", () => Managed.succeed(Managed.succeed("foo")).flatten())
        .bind("flatten2", () =>
          Managed.flatten(Managed.succeed(Managed.succeed("foo")))
        )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(flatten1).toBe("foo")
      expect(flatten2).toBe("foo")
    })
  })

  describe("absolve", () => {
    it("returns the same as Managed.absolve", async () => {
      const managedEither = Managed.succeed(Either.right("foo"))
      const { abs1, abs2 } = await Managed.Do()
        .bind("abs1", () => managedEither.absolve())
        .bind("abs2", () => Managed.absolve(managedEither))
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(abs1).toBe("foo")
      expect(abs2).toBe("foo")
    })
  })

  describe("switchable", () => {
    it("runs the right finalizer on interruption", async () => {
      const result = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ effects, latch }) =>
          Managed.switchable()
            .use(
              (_switch) =>
                _switch(
                  Managed.finalizer(Ref.update_(effects, List.prepend("First")))
                ) >
                _switch(
                  Managed.finalizer(Ref.update_(effects, List.prepend("Second")))
                ) >
                Promise.succeed_(latch, undefined) >
                Effect.never
            )
            .fork()
        )
        .tap(({ latch }) => Promise.await(latch))
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .flatMap(({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from(["Second", "First"]))
    })
  })

  describe("memoize", () => {
    it("acquires and releases exactly once", async () => {
      const result = await Effect.Do()
        .bind("effects", () => Ref.make(List.empty<number>()))
        .bindValue(
          "res",
          ({ effects }) =>
            (n: number) =>
              Managed.acquireReleaseWith(Ref.update_(effects, List.prepend(n)), () =>
                Ref.update_(effects, List.prepend(n))
              )
        )
        .bindValue("program", ({ res }) => res(1) > res(2) > res(3))
        .bindValue("memoized", ({ program }) => program.memoize())
        .tap(({ memoized }) =>
          memoized.use((managed) => {
            const use = managed.useDiscard(Effect.unit)
            return use > use > use
          })
        )
        .flatMap(({ effects }) => Ref.get(effects))
        .unsafeRunPromise()

      expect(result).toEqual(List.from([1, 2, 3, 3, 2, 1]))
    })

    test("acquires and releases nothing if the inner managed is never used", async () => {
      const result = await Effect.Do()
        .bind("acquired", () => Ref.make(false))
        .bind("released", () => Ref.make(false))
        .bindValue("managed", ({ acquired, released }) =>
          Managed.acquireReleaseWith(Ref.set_(acquired, true), () =>
            Ref.set_(released, true)
          )
        )
        .tap(({ managed }) => managed.memoize().useDiscard(Effect.unit))
        .flatMap(({ acquired, released }) => Ref.get(acquired).zip(Ref.get(released)))
        .unsafeRunPromise()

      expect(result).toEqual(Tp.tuple(false, false))
    })

    it("behaves like an ordinary Managed if flattened", async () => {
      const { res1, res2 } = await Effect.Do()
        .bind("resource", () => Ref.make(0))
        .bindValue("acquire", ({ resource }) => Ref.update_(resource, (n) => n + 1))
        .bindValue("release", ({ resource }) => Ref.update_(resource, (n) => n - 1))
        .bindValue("managed", ({ acquire, release }) =>
          Managed.acquireReleaseWith(acquire, () => release)
            .memoize()
            .flatten()
        )
        .bind("res1", ({ managed, resource }) => managed.useDiscard(Ref.get(resource)))
        .bind("res2", ({ resource }) => Ref.get(resource))
        .unsafeRunPromise()

      expect(res1).toBe(1)
      expect(res2).toBe(0)
    })

    it("properly raises an error if acquiring fails", async () => {
      const {
        error,
        res1: { v1, v2 },
        res2
      } = await Effect.Do()
        .bind("released", () => Ref.make(false))
        .bindValue("error", () => ":-o")
        .bindValue("managed", ({ error, released }) =>
          Managed.acquireReleaseWith(Effect.fail(error), () => Ref.set_(released, true))
        )
        .bind("res1", ({ managed }) =>
          managed.memoize().use((memoized) =>
            Effect.Do()
              .bind("v1", () => memoized.useDiscard(Effect.unit).either())
              .bind("v2", () => memoized.useDiscard(Effect.unit).either())
          )
        )
        .bind("res2", ({ released }) => Ref.get(released))
        .unsafeRunPromise()

      expect(v1).toEqual(Either.left(error))
      expect(v1).toStrictEqual(v2)
      expect(res2).toBe(false)
    })

    it("behaves properly if acquiring dies", async () => {
      const { ohNoes, res1, res2 } = await Effect.Do()
        .bind("released", () => Ref.make(false))
        .bindValue("ohNoes", () => ";-0")
        .bindValue("managed", ({ ohNoes, released }) =>
          Managed.acquireReleaseWith(Effect.dieMessage(ohNoes), () =>
            Ref.set_(released, true)
          )
        )
        .bind("res1", ({ managed }) =>
          managed.memoize().use((memoized) => memoized.useDiscard(Effect.unit).exit())
        )
        .bind("res2", ({ released }) => Ref.get(released))
        .unsafeRunPromise()

      expect(Exit.untraced(res1)).toHaveProperty("cause.cause.value.message", ohNoes)
      expect(res2).toBe(false)
    })

    it("behaves properly if releasing dies", async () => {
      const myBad = "#@*!"
      const managed = Managed.acquireReleaseWith(Effect.unit, () =>
        Effect.dieMessage(myBad)
      )
      const program = managed
        .memoize()
        .use((memoized) => memoized.useDiscard(Effect.unit))
      const result = await program.exit().unsafeRunPromise()

      expect(Exit.untraced(result)).toHaveProperty("cause.cause.value.message", myBad)
    })

    it("behaves properly if use dies", async () => {
      const { darn, v1, v2 } = await Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("released", () => Ref.make(false))
        .bindValue("darn", () => "darn")
        .bindValue("managed", ({ latch, released }) =>
          Managed.acquireReleaseWith(Effect.unit, () =>
            Ref.set_(released, true).zipRight(Promise.succeed_(latch, undefined))
          )
        )
        .bind("v1", ({ darn, managed }) =>
          managed
            .memoize()
            .use((memoized) => memoized.useDiscard(Effect.dieMessage(darn)))
            .exit()
        )
        .bind("v2", ({ released }) => Ref.get(released))
        .unsafeRunPromise()

      expect(Exit.untraced(v1)).toHaveProperty("cause.cause.value.message", darn)
      expect(v2).toBe(true)
    })

    it("behaves properly if use is interrupted", async () => {
      const { res1, res2, res3 } = await Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("latch3", () => Promise.make<never, void>())
        .bind("resource", () => Ref.make(0))
        .bindValue("acquire", ({ resource }) => Ref.update_(resource, (n) => n + 1))
        .bindValue("release", ({ latch3, resource }) =>
          Ref.update_(resource, (n) => n - 1).zipRight(
            Promise.succeed_(latch3, undefined)
          )
        )
        .bindValue("managed", ({ acquire, release }) =>
          Managed.acquireReleaseWith(acquire, () => release)
        )
        .bind("fiber", ({ latch1, latch2, managed }) =>
          managed
            .memoize()
            .use((memoized) =>
              memoized.useDiscard(
                Promise.succeed_(latch1, undefined).zipRight(Promise.await(latch2))
              )
            )
            .fork()
        )
        .tap(({ latch1 }) => Promise.await(latch1))
        .bind("res1", ({ resource }) => Ref.get(resource))
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .tap(({ latch3 }) => Promise.await(latch3))
        .bind("res2", ({ resource }) => Ref.get(resource))
        .bind("res3", ({ latch2 }) => Promise.isDone(latch2))
        .unsafeRunPromise()

      expect(res1).toBe(1)
      expect(res2).toBe(0)
      expect(res3).toBe(false)
    })

    it("resources are properly acquired and released", async () => {
      const result = await Effect.Do()
        .bind("ref", () =>
          Ref.make<Map.Map<number, Tp.Tuple<[number, number]>>>(Map.empty)
        )
        .bindValue(
          "acquire",
          ({ ref }) =>
            (n: number) =>
              Ref.update_(ref, (map) => {
                const {
                  tuple: [acquired, released]
                } = O.getOrElse_(Map.lookup_(map, n), () => Tp.tuple(0, 0))
                return Map.insert_(map, n, Tp.tuple(acquired + 1, released))
              })
        )
        .bindValue(
          "release",
          ({ ref }) =>
            (n: number) =>
              Ref.update_(ref, (map) => {
                const {
                  tuple: [acquired, released]
                } = O.getOrElse_(Map.lookup_(map, n), () => Tp.tuple(0, 0))
                return Map.insert_(map, n, Tp.tuple(acquired, released + 1))
              })
        )
        .bindValue(
          "managed",
          ({ acquire, release }) =>
            (n: number) =>
              Managed.acquireRelease(acquire(n), release(n))
        )
        .tap(({ managed }) =>
          Managed.memoize(managed).use((memoized) =>
            Effect.forEachParDiscard(Chunk.range(0, 100), (n) => memoized(n % 8))
          )
        )
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      const values = Array.from(result.values())
      expect(Array.from(result.keys())).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
      expect(values.map((_) => _.get(0))).toEqual(Array.from({ length: 8 }, () => 1))
      expect(values.map((_) => _.get(1))).toEqual(Array.from({ length: 8 }, () => 1))
    })

    it("resources are properly released in the event of interruption", async () => {
      const result = await Effect.Do()
        .bind("ref", () =>
          Ref.make<Map.Map<number, Tp.Tuple<[number, number]>>>(Map.empty)
        )
        .bindValue(
          "acquire",
          ({ ref }) =>
            (n: number) =>
              Ref.update_(ref, (map) => {
                const {
                  tuple: [acquired, released]
                } = O.getOrElse_(Map.lookup_(map, n), () => Tp.tuple(0, 0))
                return Map.insert_(map, n, Tp.tuple(acquired + 1, released))
              })
        )
        .bindValue(
          "release",
          ({ ref }) =>
            (n: number) =>
              Ref.update_(ref, (map) => {
                const {
                  tuple: [acquired, released]
                } = O.getOrElse_(Map.lookup_(map, n), () => Tp.tuple(0, 0))
                return Map.insert_(map, n, Tp.tuple(acquired, released + 1))
              })
        )
        .bindValue(
          "managed",
          ({ acquire, release }) =>
            (n: number) =>
              Managed.acquireRelease(acquire(n), release(n))
        )
        .bind("fiber", ({ managed }) =>
          Managed.memoize(managed)
            .use((memoized) =>
              Effect.forEachParDiscard(Chunk.range(0, 100), (n) =>
                memoized(n % 8).zipRight(Effect.never)
              )
            )
            .fork()
        )
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .flatMap(({ ref }) => Ref.get(ref))
        .unsafeRunPromise()

      const values = Array.from(result.values())
      expect(values.map((_) => _.get(0))).toEqual(Array.from({ length: 8 }, () => 1))
      expect(values.map((_) => _.get(1))).toEqual(Array.from({ length: 8 }, () => 1))
    })
  })

  describe("merge", () => {
    it("on flipped result", async () => {
      const managed = Managed.succeed(1)

      const { a, b } = await Effect.Do()
        .bind("a", () => managed.merge().use(Effect.succeedNow))
        .bind("b", () => managed.flip().merge().use(Effect.succeedNow))
        .unsafeRunPromise()

      expect(a).toStrictEqual(b)
    })
  })

  describe("catch", () => {
    it("catchAllCause", async () => {
      const managed = Managed.succeed("foo").flatMap(() => Managed.fail("Uh oh!"))
      const errorToValue = managed.catchAllCause((cause) =>
        Managed.succeed(O.getOrElse_(Cause.failureOption(cause), () => ""))
      )
      const result = await errorToValue.use(Effect.succeedNow).unsafeRunPromise()

      expect(result).toBe("Uh oh!")
    })

    it("catchSomeCause transforms cause if matched", async () => {
      const managed = Managed.succeed("foo").flatMap(() => Managed.fail("Uh oh!"))
      const errorToValue = managed.catchSomeCause((cause) =>
        Cause.isFailure(cause) ? O.some(Managed.succeed("matched")) : O.none
      )
      const result = await errorToValue.use(Effect.succeedNow).unsafeRunPromise()

      expect(result).toBe("matched")
    })

    it("catchSomeCause keeps the failure cause if not matched", async () => {
      const managed = Managed.succeed("foo").flatMap(() => Managed.fail("Uh oh!"))
      const errorToValue = managed.catchSomeCause((cause) =>
        Cause.isFailType(cause) && cause.value === "not matched"
          ? O.some(Managed.succeed("matched"))
          : O.none
      )
      const result = await errorToValue.use(Effect.succeedNow).exit().unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail("Uh oh!"))
    })
  })

  describe("continueOrFail", () => {
    it("continueOrFailManaged maps value if the partial function matched", async () => {
      const result = await Managed.succeed(42)
        .continueOrFailManaged("Oh No!", (n) =>
          n === 42 ? O.some(Managed.succeed(84)) : O.none
        )
        .use(Effect.succeedNow)
        .unsafeRunPromise()

      expect(result).toBe(84)
    })

    it("continueOrFailManaged produces given error if the partial function is not matched", async () => {
      const result = await Managed.succeed(42)
        .continueOrFailManaged("Oh No!", (n) =>
          n === 43 ? O.some(Managed.succeed(84)) : O.none
        )
        .use(Effect.succeedNow)
        .exit()
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail("Oh No!"))
    })
  })

  describe("ReleaseMap", () => {
    test("sequential release works when empty", async () => {
      const result = await ReleaseMap.make
        .flatMap((_) => _.releaseAll(Exit.unit, ExecutionStrategy.sequential))
        .map(constTrue)
        .unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("runs all finalizers in the presence of defects", async () => {
      const result = await Ref.make(List.empty<number>())
        .flatMap((ref) =>
          ReleaseMap.make
            .flatMap(
              (releaseMap) =>
                releaseMap.add((_) => Ref.update_(ref, List.prepend(1))) >
                releaseMap.add((_) => Effect.dieMessage("boom")) >
                releaseMap.add((_) => Ref.update_(ref, List.prepend(3))) >
                releaseMap.releaseAll(Exit.unit, ExecutionStrategy.sequential)
            )
            .exit()
            .zipRight(Ref.get(ref))
        )
        .unsafeRunPromise()

      expect(result).toEqual(List.from([1, 3]))
    })
  })

  describe("ignoreReleaseFailures", () => {
    it("preserves acquire failures", async () => {
      const result = await Managed.acquireRelease(
        Effect.fail(2),
        Effect.dieMessage("die")
      )
        .ignoreReleaseFailures()
        .use(() => Effect.unit)
        .exit()
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail(2))
    })

    it("preserves use failures", async () => {
      const result = await Managed.acquireRelease(
        Effect.succeed(2),
        Effect.dieMessage("die")
      )
        .ignoreReleaseFailures()
        .use((n) => Effect.fail(n + 3))
        .exit()
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.fail(5))
    })

    it("ignores release failures", async () => {
      const result = await Managed.acquireRelease(
        Effect.succeed(2),
        Effect.dieMessage("die")
      )
        .ignoreReleaseFailures()
        .use((n) => Effect.succeed(n + 3))
        .exit()
        .unsafeRunPromise()

      expect(Exit.untraced(result)).toEqual(Exit.succeed(5))
    })
  })
})
