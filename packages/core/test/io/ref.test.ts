import { Tuple } from "../../src/collection/immutable/Tuple"
import { Either } from "../../src/data/Either"
import { identity } from "../../src/data/Function"
import { Option } from "../../src/data/Option"
import type { UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import { Ref } from "../../src/io/Ref"

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

function makeDerived<A>(a: A): UIO<Ref<A>> {
  return Ref.make(a).map((ref) =>
    ref.fold(identity, identity, Either.right, Either.right)
  )
}

function makeDerivedAll<A>(a: A): UIO<Ref<A>> {
  return Ref.make(a).map((ref) =>
    ref.foldAll(
      identity,
      identity,
      identity,
      (a) => () => Either.right(a),
      Either.right
    )
  )
}

describe("Ref", () => {
  describe("Atomic", () => {
    it("get", async () => {
      const program = Ref.make(current).flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(current)
    })

    it("getAndSet", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.getAndSet(update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdate", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.getAndUpdate(() => update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdateSome", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isClosed() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Active)
    })

    it("getAndUpdateSome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Changed)
      expect(v3).toEqual(Closed)
    })

    it("modify", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bind("v1", ({ ref }) => ref.modify(() => Tuple("hello", update)))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("hello")
      expect(v2).toBe(update)
    })

    it("modifySome", async () => {
      const program = Ref.make<State>(Active).flatMap((ref) =>
        ref.modifySome("state doesn't change", (state) =>
          state.isClosed() ? Option.some(Tuple("active", Active)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("state doesn't change")
    })

    it("modifySome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.modifySome("doesn't change the state", (state) =>
            state.isActive() ? Option.some(Tuple("changed", Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.modifySome("doesn't change the state", (state) =>
            state.isActive()
              ? Option.some(Tuple("changed", Changed))
              : state.isChanged()
              ? Option.some(Tuple("closed", Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("changed")
      expect(v2).toBe("closed")
    })

    it("set", async () => {
      const program = Ref.make(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("update", async () => {
      const program = Ref.make(current)
        .tap((ref) => ref.update(() => update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGet", async () => {
      const program = Ref.make(current).flatMap((ref) => ref.updateAndGet(() => update))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateSome", async () => {
      const program = Ref.make<State>(Active)
        .tap((ref) =>
          ref.updateSome((state) =>
            state.isClosed() ? Option.some(Changed) : Option.none
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(Active))
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get())
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })

    it("updateSomeAndGet", async () => {
      const program = Ref.make<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGet((state) =>
          state.isClosed() ? Option.some(Changed) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSomeAndGet twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })
  })

  describe("Derived", () => {
    it("atomicity", async () => {
      const program = makeDerived(0)
        .tap((ref) =>
          Effect.collectAllPar(
            Effect.replicate(
              100,
              ref.update((n) => n + 1)
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

    it("getAndSet", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived(current))
        .bind("v1", ({ ref }) => ref.getAndSet(update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdate", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived(current))
        .bind("v1", ({ ref }) => ref.getAndUpdate(() => update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdateSome", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isClosed() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Active)
    })

    it("getAndUpdateSome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Changed)
      expect(v3).toEqual(Closed)
    })

    it("modify", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived(current))
        .bind("v1", ({ ref }) => ref.modify(() => Tuple("hello", update)))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("hello")
      expect(v2).toBe(update)
    })

    it("modifySome", async () => {
      const program = makeDerived<State>(Active).flatMap((ref) =>
        ref.modifySome("state doesn't change", (state) =>
          state.isClosed() ? Option.some(Tuple("active", Active)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("state doesn't change")
    })

    it("modifySome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.modifySome("state doesn't change", (state) =>
            state.isActive() ? Option.some(Tuple("changed", Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.modifySome("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Tuple("changed", Changed))
              : state.isChanged()
              ? Option.some(Tuple("closed", Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("changed")
      expect(v2).toBe("closed")
    })

    it("set", async () => {
      const program = makeDerived(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("update", async () => {
      const program = makeDerived(current)
        .tap((ref) => ref.update(() => update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGet", async () => {
      const program = makeDerived(current).flatMap((ref) =>
        ref.updateAndGet(() => update)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateSome", async () => {
      const program = makeDerived<State>(Active)
        .tap((ref) =>
          ref.updateSome((state) =>
            state.isClosed() ? Option.some(Changed) : Option.none
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get())
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })

    it("updateSomeAndGet", async () => {
      const program = makeDerived<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGet((state) =>
          state.isClosed() ? Option.some(Changed) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSomeAndGet twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerived<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })
  })

  describe("DerivedAll", () => {
    it("atomicity", async () => {
      const program = makeDerivedAll(0)
        .tap((ref) =>
          Effect.collectAllPar(
            Effect.replicate(
              100,
              ref.update((n) => n + 1)
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

    it("getAndSet", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll(current))
        .bind("v1", ({ ref }) => ref.getAndSet(update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdate", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll(current))
        .bind("v1", ({ ref }) => ref.getAndUpdate(() => update))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(current)
      expect(v2).toBe(update)
    })

    it("getAndUpdateSome", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isClosed() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Active)
    })

    it("getAndUpdateSome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.getAndUpdateSome((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )
        .bind("v3", ({ ref }) => ref.get())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Active)
      expect(v2).toEqual(Changed)
      expect(v3).toEqual(Closed)
    })

    it("modify", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll(current))
        .bind("v1", ({ ref }) => ref.modify(() => Tuple("hello", update)))
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("hello")
      expect(v2).toBe(update)
    })

    it("modifySome", async () => {
      const program = makeDerivedAll<State>(Active).flatMap((ref) =>
        ref.modifySome("state doesn't change", (state) =>
          state.isClosed() ? Option.some(Tuple("active", Active)) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("state doesn't change")
    })

    it("modifySome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.modifySome("state doesn't change", (state) =>
            state.isActive() ? Option.some(Tuple("changed", Changed)) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.modifySome("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Tuple("changed", Changed))
              : state.isChanged()
              ? Option.some(Tuple("closed", Closed))
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe("changed")
      expect(v2).toBe("closed")
    })

    it("set", async () => {
      const program = makeDerivedAll(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("update", async () => {
      const program = makeDerivedAll(current)
        .tap((ref) => ref.update(() => update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateAndGet", async () => {
      const program = makeDerivedAll(current).flatMap((ref) =>
        ref.updateAndGet(() => update)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("updateSome", async () => {
      const program = makeDerivedAll<State>(Active)
        .tap((ref) =>
          ref.updateSome((state) =>
            state.isClosed() ? Option.some(Changed) : Option.none
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSome twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v1", ({ ref }) => ref.get())
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })

    it("updateSomeAndGet", async () => {
      const program = makeDerivedAll<State>(Active).flatMap((ref) =>
        ref.updateSomeAndGet((state) =>
          state.isClosed() ? Option.some(Changed) : Option.none
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Active)
    })

    it("updateSomeAndGet twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeDerivedAll<State>(Active))
        .bind("v1", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive() ? Option.some(Changed) : Option.none
          )
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive()
              ? Option.some(Changed)
              : state.isChanged()
              ? Option.some(Closed)
              : Option.none
          )
        )

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(Changed)
      expect(v2).toEqual(Closed)
    })
  })

  describe("combinators", () => {
    it("readOnly", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bindValue("readOnly", ({ ref }) => ref.readOnly())
        .tap(({ ref }) => ref.set(update))
        .flatMap(({ readOnly }) => readOnly.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(update)
    })

    it("writeOnly", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(current))
        .bindValue("writeOnly", ({ ref }) => ref.writeOnly())
        .tap(({ writeOnly }) => writeOnly.set(update))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(update)
    })
  })
})
