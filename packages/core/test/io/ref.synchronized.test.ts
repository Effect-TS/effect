import { Tuple } from "../../src/collection/immutable/Tuple"
import { identity } from "../../src/data/Function"
import { Option } from "../../src/data/Option"
import type { UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import { Promise } from "../../src/io/Promise"
import { Synchronized } from "../../src/io/Ref/Synchronized"

/**
 * @tsplus type ets/TestRefState
 */
export type State = Active | Changed | Closed

/**
 * @tsplus type ets/TestRefStateOps
 */
export interface StateOps {}
export const State: StateOps = {}

export interface Active {
  readonly _tag: "Active"
}

export interface Changed {
  readonly _tag: "Changed"
}

export interface Closed {
  readonly _tag: "Closed"
}
/**
 * @tsplus static ets/TestRefStateOps Active
 */
export const Active: State = {
  _tag: "Active"
}
/**
 * @tsplus static ets/TestRefStateOps Changed
 */
export const Changed: State = {
  _tag: "Changed"
}
/**
 * @tsplus static ets/TestRefStateOps Closed
 */
export const Closed: State = {
  _tag: "Closed"
}

/**
 * @tsplus fluent ets/TestRefState isActive
 */
export function isActive(self: State): boolean {
  return self._tag === "Active"
}

/**
 * @tsplus fluent ets/TestRefState isChanged
 */
export function isChanged(self: State): boolean {
  return self._tag === "Changed"
}

/**
 * @tsplus fluent ets/TestRefState isClosed
 */
export function isClosed(self: State): boolean {
  return self._tag === "Closed"
}

const current = "value"
const update = "new value"
const failure = "failure"
const fatalError = ":-0"

function makeDerived<A>(a: A): UIO<Synchronized<A>> {
  return Synchronized.make(a).map((ref) =>
    ref.foldEffect(identity, identity, Effect.succeedNow, Effect.succeedNow)
  )
}

function makeDerivedAll<A>(a: A): UIO<Synchronized<A>> {
  return Synchronized.make(a).map((ref) =>
    ref.foldAllEffect(
      identity,
      identity,
      identity,
      (a) => () => Effect.succeedNow(a),
      Effect.succeedNow
    )
  )
}

describe("Ref.Synchronized", () => {
  describe("Atomic", () => {
    it("get", async () => {
      const program = Synchronized.make(current).flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(current)
    })

    it("getAndUpdateEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make(current))
        .bind("v1", ({ ref }) => ref.getAndUpdateEffect(() => Effect.succeed(update)))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdateEffect with failure", async () => {
      const program = Synchronized.make(current).flatMap((ref) =>
        ref.getAndUpdateEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("getAndUpdateSomeEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Active)
    })

    it("getAndUpdateSomeEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed()
              ? Option.some(Effect.succeed(Active))
              : state.isChanged()
              ? Option.some(Effect.succeed(Closed))
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Changed)
      expect(v3).toEqual(Closed)
    })

    it("getAndUpdateSomeEffect with failure", async () => {
      const program = Synchronized.make<State>(Active).flatMap((ref) =>
        ref.getAndUpdateSomeEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("interrupt parent fiber and update", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, Synchronized<State>>())
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "makeAndWait",
          ({ latch, promise }) =>
            promise.complete(Synchronized.make<State>(Active)) > latch.await()
        )
        .bind("fiber", ({ makeAndWait }) => makeAndWait.fork())
        .bind("ref", ({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.updateAndGetEffect(() => Effect.succeed(Closed)))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Closed)
    })

    it("modifyEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make(current))
        .bind("v1", ({ ref }) =>
          ref.modifyEffect(() => Effect.succeed(Tuple("hello", update)))
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("hello")
      expect(v2).toBe(update)
    })

    it("modifyEffect with failure", async () => {
      const program = Synchronized.make(current).flatMap((ref) =>
        ref.modifyEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("modifySomeEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make<State>(Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isClosed()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get())

      const { r1, v1 } = await program.unsafeRunPromise()

      expect(r1).toBe("state doesn't change")
      expect(v1).toEqual(Active)
    })

    it("modifySomeEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make<State>(Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get())
        .bind("r2", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : state.isChanged()
              ? Option.some(Effect.succeed(Tuple("closed", Closed)))
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { r1, r2, v1, v2 } = await program.unsafeRunPromise()

      expect(r1).toBe("changed")
      expect(v1).toEqual(Changed)
      expect(r2).toBe("closed")
      expect(v2).toEqual(Closed)
    })

    it("modifySomeEffect with failure not triggered", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make<State>(Active))
        .bind("r", ({ ref }) =>
          ref
            .modifySomeEffect("state doesn't change", (state) =>
              state.isClosed() ? Option.some(Effect.fail(failure)) : Option.none
            )
            .orDieWith(() => new Error())
        )
        .bind("v", ({ ref }) => ref.get())

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("state doesn't change")
      expect(v).toEqual(Active)
    })

    it("modifySomeEffect with failure", async () => {
      const program = Synchronized.make<State>(Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("modifySomeEffect with fatal error", async () => {
      const program = Synchronized.make<State>(Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.dieMessage(fatalError)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
    })

    it("set", async () => {
      const program = Synchronized.make(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGetEffect", async () => {
      const program = Synchronized.make(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.succeed(update))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGetEffect with failure", async () => {
      const program = Synchronized.make(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("updateSomeAndGetEffect", async () => {
      const program = Synchronized.make<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isClosed() ? Option.some(Effect.succeed(Changed)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSomeAndGetEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Synchronized.make<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Changed))
              : state.isChanged()
              ? Option.some(Effect.succeed(Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })

    it("updateSomeAndGetEffect with failure", async () => {
      const program = Synchronized.make<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })
  })

  describe("Derived", () => {
    it("atomicity", async () => {
      const program = makeDerived(0)
        .tap((ref) =>
          Effect.collectAllPar(
            Effect.replicate(
              100,
              ref.updateEffect((n) => Effect.succeed(n + 1))
            )
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(100)
    })

    it("get", async () => {
      const program = makeDerived(current).flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(current)
    })

    it("getAndUpdateEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived(current))
        .bind("v1", ({ ref }) => ref.getAndUpdateEffect(() => Effect.succeed(update)))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdateEffect with failure", async () => {
      const program = makeDerived(current).flatMap((ref) =>
        ref.getAndUpdateEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("getAndUpdateSomeEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Active)
    })

    it("getAndUpdateSomeEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Changed))
              : state.isChanged()
              ? Option.some(Effect.succeed(Closed))
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Changed)
      expect(v3).toEqual(Closed)
    })

    it("getAndUpdateSomeEffect with failure", async () => {
      const program = makeDerived<State>(Active).flatMap((ref) =>
        ref.getAndUpdateSomeEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("interrupt parent fiber and update", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, Synchronized<State>>())
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "makeAndWait",
          ({ latch, promise }) =>
            promise.complete(makeDerived<State>(Active)) > latch.await()
        )
        .bind("fiber", ({ makeAndWait }) => makeAndWait.fork())
        .bind("ref", ({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.updateAndGetEffect(() => Effect.succeed(Closed)))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Closed)
    })

    it("modifyEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived(current))
        .bind("r", ({ ref }) =>
          ref.modifyEffect(() => Effect.succeed(Tuple("hello", update)))
        )
        .bind("v", ({ ref }) => ref.get())

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("hello")
      expect(v).toBe(update)
    })

    it("modifyEffect with failure", async () => {
      const program = makeDerived(current).flatMap((ref) =>
        ref.modifyEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("modifySomeEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("r", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isClosed()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : Option.none
          )
        )
        .bind("v", ({ ref }) => ref.get())

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("state doesn't change")
      expect(v).toEqual(Active)
    })

    it("modifyEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get())
        .bind("r2", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : state.isChanged()
              ? Option.some(Effect.succeed(Tuple("closed", Closed)))
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { r1, r2, v1, v2 } = await program.unsafeRunPromise()

      expect(r1).toBe("changed")
      expect(v1).toEqual(Changed)
      expect(r2).toBe("closed")
      expect(v2).toEqual(Closed)
    })

    it("modifySomeEffect with failure not triggered", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("r", ({ ref }) =>
          ref
            .modifySomeEffect("state doesn't change", (state) =>
              state.isClosed() ? Option.some(Effect.fail(failure)) : Option.none
            )
            .orDieWith((s) => new Error(s))
        )
        .bind("v", ({ ref }) => ref.get())

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("state doesn't change")
      expect(v).toEqual(Active)
    })

    it("modifySomeEffect with failure", async () => {
      const program = makeDerived<State>(Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("modifySomeEffect with fatal error", async () => {
      const program = makeDerived<State>(Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.dieMessage(fatalError)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
    })

    it("set", async () => {
      const program = makeDerived(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGetEffect", async () => {
      const program = makeDerived(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.succeed(update))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGetEffect with failure", async () => {
      const program = makeDerived(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("updateSomeAndGetEffect", async () => {
      const program = makeDerived<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isClosed() ? Option.some(Effect.succeed(Active)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSomeAndGetEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Changed))
              : state.isChanged()
              ? Option.some(Effect.succeed(Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })

    it("updateSomeAndGetEffect with failure", async () => {
      const program = makeDerived<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })
  })

  describe("DerivedAll", () => {
    it("atomicity", async () => {
      const program = makeDerivedAll(0)
        .tap((ref) =>
          Effect.collectAllPar(
            Effect.replicate(
              100,
              ref.updateEffect((n) => Effect.succeed(n + 1))
            )
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(100)
    })

    it("get", async () => {
      const program = makeDerivedAll(current).flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(current)
    })

    it("getAndUpdateEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll(current))
        .bind("v1", ({ ref }) => ref.getAndUpdateEffect(() => Effect.succeed(update)))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdateEffect with failure", async () => {
      const program = makeDerivedAll(current).flatMap((ref) =>
        ref.getAndUpdateEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("getAndUpdateSomeEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Active)
    })

    it("getAndUpdateSomeEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Changed))
              : state.isChanged()
              ? Option.some(Effect.succeed(Closed))
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Changed)
      expect(v3).toEqual(Closed)
    })

    it("getAndUpdateSomeEffect with failure", async () => {
      const program = makeDerivedAll<State>(Active).flatMap((ref) =>
        ref.getAndUpdateSomeEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("interrupt parent fiber and update", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, Synchronized<State>>())
        .bind("latch", () => Promise.make<never, void>())
        .bindValue(
          "makeAndWait",
          ({ latch, promise }) =>
            promise.complete(makeDerivedAll<State>(Active)) > latch.await()
        )
        .bind("fiber", ({ makeAndWait }) => makeAndWait.fork())
        .bind("ref", ({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.updateAndGetEffect(() => Effect.succeed(Closed)))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Closed)
    })

    it("modifyEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll(current))
        .bind("r", ({ ref }) =>
          ref.modifyEffect(() => Effect.succeed(Tuple("hello", update)))
        )
        .bind("v", ({ ref }) => ref.get())

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("hello")
      expect(v).toBe(update)
    })

    it("modifyEffect with failure", async () => {
      const program = makeDerivedAll(current).flatMap((ref) =>
        ref.modifyEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("modifySomeEffect", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("r", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isClosed()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : Option.none
          )
        )
        .bind("v", ({ ref }) => ref.get())

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("state doesn't change")
      expect(v).toEqual(Active)
    })

    it("modifySomeEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get())
        .bind("r2", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", Changed)))
              : state.isChanged()
              ? Option.some(Effect.succeed(Tuple("closed", Closed)))
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { r1, r2, v1, v2 } = await program.unsafeRunPromise()

      expect(r1).toBe("changed")
      expect(v1).toEqual(Changed)
      expect(r2).toBe("closed")
      expect(v2).toEqual(Closed)
    })

    it("modifySomeEffect with failure not triggered", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("r", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isClosed() ? Option.some(Effect.fail(failure)) : Option.none
          )
        )
        .bind("v", ({ ref }) => ref.get())

      const { r, v } = await program.unsafeRunPromise()

      expect(r).toBe("state doesn't change")
      expect(v).toEqual(Active)
    })

    it("modifySomeEffect with failure", async () => {
      const program = makeDerivedAll<State>(Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("modifySomeEffect with fatal error", async () => {
      const program = makeDerivedAll<State>(Active).flatMap((ref) =>
        ref.modifySomeEffect("state doesn't change", (state) =>
          state.isActive() ? Option.some(Effect.dieMessage(fatalError)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
    })

    it("set", async () => {
      const program = makeDerivedAll(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGetEffect", async () => {
      const program = makeDerivedAll(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.succeed(update))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGetEffect with failure", async () => {
      const program = makeDerivedAll(current).flatMap((ref) =>
        ref.updateAndGetEffect(() => Effect.fail(failure))
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })

    it("updateSomeAndGetEffect", async () => {
      const program = makeDerivedAll<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isClosed() ? Option.some(Effect.succeed(Changed)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSomeAndGetEffect twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive() ? Option.some(Effect.succeed(Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGetEffect((state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Changed))
              : state.isChanged()
              ? Option.some(Effect.succeed(Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })

    it("updateSomeAndGetEffect with failure", async () => {
      const program = makeDerivedAll<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGetEffect((state) =>
          state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(failure))
    })
  })

  describe("zip", () => {
    it("updates can be performed atomically", async () => {
      const program = Effect.Do()
        .bind("left", () => Synchronized.make(0))
        .bind("right", () => Synchronized.make(1))
        .bindValue("composed", ({ left, right }) => left.zip(right))
        .bindValue("effect", ({ composed }) =>
          composed.update(({ tuple: [a, b] }) => Tuple(b, a + b))
        )
        .tap(({ effect }) => Effect.collectAllParDiscard(Effect.replicate(20, effect)))
        .flatMap(({ composed }) => composed.get())

      const {
        tuple: [a, b]
      } = await program.unsafeRunPromise()

      expect(a).toBe(6765)
      expect(b).toBe(10946)
    })

    it("partial writes cannot be observed by other fibers", async () => {
      const program = Effect.Do()
        .bind("left", () => Synchronized.make(0))
        .bind("right", () => Synchronized.make(0))
        .bindValue("composed", ({ left, right }) => left.zip(right))
        .bindValue("effect", ({ composed }) =>
          composed.getAndUpdate(({ tuple: [a, b] }) => Tuple(a + 1, b + 1))
        )
        .tap(({ effect }) => Effect.forkAllDiscard(Effect.replicate(100, effect)))
        .flatMap(({ composed }) => composed.get())

      const {
        tuple: [a, b]
      } = await program.unsafeRunPromise()

      expect(a).toBe(b)
    })
  })
})
