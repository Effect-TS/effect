import type * as Effect from "../Effect.js"
import { dual, pipe } from "../Function.js"
import * as Option from "../Option.js"
import type * as Synchronized from "../SynchronizedRef.js"
import * as core from "./core.js"
import * as _ref from "./ref.js"

/** @internal */
export const getAndUpdateEffect = dual<
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, A>,
  <A, R, E>(self: Synchronized.SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(2, (self, f) =>
  self.modifyEffect(
    (value) => core.map(f(value), (result) => [value, result] as const)
  ))

/** @internal */
export const getAndUpdateSomeEffect = dual<
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, A>,
  <A, R, E>(
    self: Synchronized.SynchronizedRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => Effect.Effect<R, E, A>
>(2, (self, pf) =>
  self.modifyEffect((value) => {
    const result = pf(value)
    switch (result._tag) {
      case "None": {
        return core.succeed([value, value] as const)
      }
      case "Some": {
        return core.map(result.value, (newValue) => [value, newValue] as const)
      }
    }
  }))

/** @internal */
export const modify = dual<
  <A, B>(f: (a: A) => readonly [B, A]) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<never, never, B>,
  <A, B>(self: Synchronized.SynchronizedRef<A>, f: (a: A) => readonly [B, A]) => Effect.Effect<never, never, B>
>(2, (self, f) => self.modify(f))

/** @internal */
export const modifyEffect = dual<
  <A, R, E, B>(
    f: (a: A) => Effect.Effect<R, E, readonly [B, A]>
  ) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, B>,
  <A, R, E, B>(
    self: Synchronized.SynchronizedRef<A>,
    f: (a: A) => Effect.Effect<R, E, readonly [B, A]>
  ) => Effect.Effect<R, E, B>
>(2, (self, f) => self.modifyEffect(f))

/** @internal */
export const modifySomeEffect = dual<
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, B>,
  <A, B, R, E>(
    self: Synchronized.SynchronizedRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ) => Effect.Effect<R, E, B>
>(3, (self, fallback, pf) =>
  self.modifyEffect(
    (value) => pipe(pf(value), Option.getOrElse(() => core.succeed([fallback, value] as const)))
  ))

/** @internal */
export const updateEffect = dual<
  <A, R, E>(
    f: (a: A) => Effect.Effect<R, E, A>
  ) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, void>,
  <A, R, E>(self: Synchronized.SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, void>
>(2, (self, f) =>
  self.modifyEffect((value) =>
    core.map(
      f(value),
      (result) => [undefined as void, result] as const
    )
  ))

/** @internal */
export const updateAndGetEffect = dual<
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, A>,
  <A, R, E>(self: Synchronized.SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(2, (self, f) =>
  self.modifyEffect(
    (value) => core.map(f(value), (result) => [result, result] as const)
  ))

/** @internal */
export const updateSomeEffect = dual<
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, void>,
  <A, R, E>(
    self: Synchronized.SynchronizedRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => Effect.Effect<R, E, void>
>(2, (self, pf) =>
  self.modifyEffect((value) => {
    const result = pf(value)
    switch (result._tag) {
      case "None": {
        return core.succeed([void 0, value] as const)
      }
      case "Some": {
        return core.map(result.value, (a) => [void 0, a] as const)
      }
    }
  }))
