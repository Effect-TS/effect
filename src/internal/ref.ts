import type * as Effect from "../Effect.js"
import { dual } from "../Function.js"
import * as MutableRef from "../MutableRef.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import type * as Ref from "../Ref.js"
import * as core from "./core.js"

/** @internal */
export const RefTypeId: Ref.RefTypeId = Symbol.for("effect/Ref") as Ref.RefTypeId

/** @internal */
export const refVariance = {
  _A: (_: never) => _
}

class RefImpl<A> implements Ref.Ref<A> {
  readonly [RefTypeId] = refVariance
  constructor(readonly ref: MutableRef.MutableRef<A>) {}
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B> {
    return core.sync(() => {
      const current = MutableRef.get(this.ref)
      const [b, a] = f(current)
      if ((current as unknown) !== (a as unknown)) {
        MutableRef.set(a)(this.ref)
      }
      return b
    })
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const unsafeMake = <A>(value: A): Ref.Ref<A> => new RefImpl(MutableRef.make(value))

/** @internal */
export const make = <A>(value: A): Effect.Effect<never, never, Ref.Ref<A>> => core.sync(() => unsafeMake(value))

/** @internal */
export const get = <A>(self: Ref.Ref<A>) => self.modify((a) => [a, a])

/** @internal */
export const set = dual<
  <A>(value: A) => (self: Ref.Ref<A>) => Effect.Effect<never, never, void>,
  <A>(self: Ref.Ref<A>, value: A) => Effect.Effect<never, never, void>
>(2, <A>(self: Ref.Ref<A>, value: A) => self.modify((): [void, A] => [void 0, value]))

/** @internal */
export const getAndSet = dual<
  <A>(value: A) => (self: Ref.Ref<A>) => Effect.Effect<never, never, A>,
  <A>(self: Ref.Ref<A>, value: A) => Effect.Effect<never, never, A>
>(2, <A>(self: Ref.Ref<A>, value: A) => self.modify((a): [A, A] => [a, value]))

/** @internal */
export const getAndUpdate = dual<
  <A>(f: (a: A) => A) => (self: Ref.Ref<A>) => Effect.Effect<never, never, A>,
  <A>(self: Ref.Ref<A>, f: (a: A) => A) => Effect.Effect<never, never, A>
>(2, <A>(self: Ref.Ref<A>, f: (a: A) => A) => self.modify((a): [A, A] => [a, f(a)]))

/** @internal */
export const getAndUpdateSome = dual<
  <A>(pf: (a: A) => Option.Option<A>) => (self: Ref.Ref<A>) => Effect.Effect<never, never, A>,
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, A>
>(2, <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>) =>
  self.modify((value): [A, A] => {
    const option = pf(value)
    switch (option._tag) {
      case "None": {
        return [value, value]
      }
      case "Some": {
        return [value, option.value]
      }
    }
  }))

/** @internal */
export const setAndGet = dual<
  <A>(value: A) => (self: Ref.Ref<A>) => Effect.Effect<never, never, A>,
  <A>(self: Ref.Ref<A>, value: A) => Effect.Effect<never, never, A>
>(2, <A>(self: Ref.Ref<A>, value: A) => self.modify((): [A, A] => [value, value]))

/** @internal */
export const modify = dual<
  <A, B>(f: (a: A) => readonly [B, A]) => (self: Ref.Ref<A>) => Effect.Effect<never, never, B>,
  <A, B>(self: Ref.Ref<A>, f: (a: A) => readonly [B, A]) => Effect.Effect<never, never, B>
>(2, (self, f) => self.modify(f))

/** @internal */
export const modifySome = dual<
  <B, A>(
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ) => (self: Ref.Ref<A>) => Effect.Effect<never, never, B>,
  <A, B>(
    self: Ref.Ref<A>,
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ) => Effect.Effect<never, never, B>
>(3, (self, fallback, pf) =>
  self.modify((value) => {
    const option = pf(value)
    switch (option._tag) {
      case "None": {
        return [fallback, value] as const
      }
      case "Some": {
        return option.value
      }
    }
  }))

/** @internal */
export const update = dual<
  <A>(f: (a: A) => A) => (self: Ref.Ref<A>) => Effect.Effect<never, never, void>,
  <A>(self: Ref.Ref<A>, f: (a: A) => A) => Effect.Effect<never, never, void>
>(2, <A>(self: Ref.Ref<A>, f: (a: A) => A) => self.modify((a): [void, A] => [void 0, f(a)]))

/** @internal */
export const updateAndGet = dual<
  <A>(f: (a: A) => A) => (self: Ref.Ref<A>) => Effect.Effect<never, never, A>,
  <A>(self: Ref.Ref<A>, f: (a: A) => A) => Effect.Effect<never, never, A>
>(2, <A>(self: Ref.Ref<A>, f: (a: A) => A) =>
  self.modify((a): [A, A] => {
    const result = f(a)
    return [result, result]
  }))

/** @internal */
export const updateSome = dual<
  <A>(f: (a: A) => Option.Option<A>) => (self: Ref.Ref<A>) => Effect.Effect<never, never, void>,
  <A>(self: Ref.Ref<A>, f: (a: A) => Option.Option<A>) => Effect.Effect<never, never, void>
>(2, <A>(self: Ref.Ref<A>, f: (a: A) => Option.Option<A>) =>
  self.modify(
    (a): [void, A] => [
      void 0,
      Option.match(f(a), {
        onNone: () => a,
        onSome: (b) => b
      })
    ]
  ))

/** @internal */
export const updateSomeAndGet = dual<
  <A>(pf: (a: A) => Option.Option<A>) => (self: Ref.Ref<A>) => Effect.Effect<never, never, A>,
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, A>
>(2, <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>) =>
  self.modify((value): [A, A] => {
    const option = pf(value)
    switch (option._tag) {
      case "None": {
        return [value, value]
      }
      case "Some": {
        return [option.value, option.value]
      }
    }
  }))

/** @internal */
export const unsafeGet = <A>(self: Ref.Ref<A>): A => MutableRef.get((self as RefImpl<A>).ref)
