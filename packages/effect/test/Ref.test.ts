import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Effect, Option, pipe, Readable, Ref } from "effect"

const current = "value"
const update = "new value"

type State = Active | Changed | Closed

interface Active {
  readonly _tag: "Active"
}

interface Changed {
  readonly _tag: "Changed"
}

interface Closed {
  readonly _tag: "Closed"
}

export const Active: State = { _tag: "Active" }
export const Changed: State = { _tag: "Changed" }
export const Closed: State = { _tag: "Closed" }

const isActive = (self: State): boolean => self._tag === "Active"
const isChanged = (self: State): boolean => self._tag === "Changed"
const isClosed = (self: State): boolean => self._tag === "Closed"

describe("Ref", () => {
  it.effect("implements Readable", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(123)
      assertTrue(Readable.isReadable(ref))
      strictEqual(yield* ref, 123)
    }))

  it.effect("get", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Ref.make(current), Effect.flatMap(Ref.get))
      strictEqual(result, current)
    }))
  it.effect("getAndSet", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(current)
      const result1 = yield* Ref.getAndSet(ref, update)

      const result2 = yield* ref
      strictEqual(result1, current)
      strictEqual(result2, update)
    }))
  it.effect("getAndUpdate", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(current)
      const result1 = yield* Ref.getAndUpdate(ref, () => update)
      const result2 = yield* ref
      strictEqual(result1, current)
      strictEqual(result2, update)
    }))
  it.effect("getAndUpdateSome - once", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      const result1 = yield* Ref.getAndUpdateSome(
        ref,
        (state) => isClosed(state) ? Option.some(Changed) : Option.none()
      )
      const result2 = yield* Ref.get(ref)
      strictEqual(result1, Active)
      strictEqual(result2, Active)
    }))
  it.effect("getAndUpdateSome - twice", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      const result1 = yield* Ref.getAndUpdateSome(
        ref,
        (state) => isActive(state) ? Option.some(Changed) : Option.none()
      )
      const result2 = yield* Ref.getAndUpdateSome(ref, (state) =>
        isActive(state) ?
          Option.some(Changed) :
          isChanged(state) ?
          Option.some(Closed) :
          Option.none())
      const result3 = yield* Ref.get(ref)
      strictEqual(result1, Active)
      strictEqual(result2, Changed)
      strictEqual(result3, Closed)
    }))
  it.effect("set", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(current)
      yield* Ref.set(ref, update)
      const result = yield* Ref.get(ref)
      strictEqual(result, update)
    }))
  it.effect("update", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(current)
      yield* Ref.update(ref, () => update)
      const result = yield* Ref.get(ref)
      strictEqual(result, update)
    }))
  it.effect("updateAndGet", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(current)
      const result = yield* Ref.updateAndGet(ref, () => update)
      strictEqual(result, update)
    }))
  it.effect("updateSome - once", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      yield* Ref.updateSome(ref, (state) => isClosed(state) ? Option.some(Changed) : Option.none())
      const result = yield* Ref.get(ref)
      deepStrictEqual(result, Active)
    }))
  it.effect("updateSome - twice", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      yield* Ref.updateSome(ref, (state) => isActive(state) ? Option.some(Changed) : Option.none())
      const result1 = yield* Ref.get(ref)
      yield* Ref.updateSome(ref, (state) =>
        isActive(state) ?
          Option.some(Changed) :
          isChanged(state) ?
          Option.some(Closed) :
          Option.none())
      const result2 = yield* Ref.get(ref)
      deepStrictEqual(result1, Changed)
      deepStrictEqual(result2, Closed)
    }))
  it.effect("updateSomeAndGet - once", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      const result = yield* Ref.updateSomeAndGet(ref, (state) => isClosed(state) ? Option.some(Changed) : Option.none())
      strictEqual(result, Active)
    }))
  it.effect("updateSomeAndGet - twice", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      const result1 = yield* Ref.updateSomeAndGet(
        ref,
        (state) => isActive(state) ? Option.some(Changed) : Option.none()
      )
      const result2 = yield* Ref.updateSomeAndGet(ref, (state): Option.Option<State> => {
        return isActive(state) ?
          Option.some(Changed) :
          isChanged(state) ?
          Option.some(Closed) :
          Option.none()
      })
      deepStrictEqual(result1, Changed)
      deepStrictEqual(result2, Closed)
    }))
  it.effect("modify", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(current)
      const result1 = yield* Ref.modify(ref, () => ["hello", update])
      const result2 = yield* Ref.get(ref)
      strictEqual(result1, "hello")
      strictEqual(result2, update)
    }))
  it.effect("modifySome - once", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      const result = yield* Ref.modifySome(ref, "state does not change", (state) =>
        isClosed(state) ?
          Option.some(["active", Active]) :
          Option.none())
      strictEqual(result, "state does not change")
    }))
  it.effect("modifySome - twice", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<State>(Active)
      const result1 = yield* Ref.modifySome(ref, "state does not change", (state) =>
        isActive(state) ?
          Option.some(["changed", Changed]) :
          Option.none())
      const result2 = yield* Ref.modifySome(ref, "state does not change", (state) =>
        isActive(state) ?
          Option.some(["changed", Changed]) :
          isChanged(state) ?
          Option.some(["closed", Closed]) :
          Option.none())
      strictEqual(result1, "changed")
      strictEqual(result2, "closed")
    }))
})
