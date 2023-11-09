import type { Effect } from "../Effect.js"
import { dual, pipe } from "../Function.js"
import { Option } from "../Option.js"
import type { SynchronizedRef } from "../SynchronizedRef.js"
import * as core from "./core.js"
import * as _ref from "./ref.js"

/** @internal */
export const getAndUpdateEffect = dual<
  <A, R, E>(f: (a: A) => Effect<R, E, A>) => (self: SynchronizedRef<A>) => Effect<R, E, A>,
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect<R, E, A>) => Effect<R, E, A>
>(2, (self, f) =>
  self.modifyEffect(
    (value) => core.map(f(value), (result) => [value, result] as const)
  ))

/** @internal */
export const getAndUpdateSomeEffect = dual<
  <A, R, E>(
    pf: (a: A) => Option<Effect<R, E, A>>
  ) => (self: SynchronizedRef<A>) => Effect<R, E, A>,
  <A, R, E>(
    self: SynchronizedRef<A>,
    pf: (a: A) => Option<Effect<R, E, A>>
  ) => Effect<R, E, A>
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
  <A, B>(f: (a: A) => readonly [B, A]) => (self: SynchronizedRef<A>) => Effect<never, never, B>,
  <A, B>(self: SynchronizedRef<A>, f: (a: A) => readonly [B, A]) => Effect<never, never, B>
>(2, (self, f) => self.modify(f))

/** @internal */
export const modifyEffect = dual<
  <A, R, E, B>(
    f: (a: A) => Effect<R, E, readonly [B, A]>
  ) => (self: SynchronizedRef<A>) => Effect<R, E, B>,
  <A, R, E, B>(
    self: SynchronizedRef<A>,
    f: (a: A) => Effect<R, E, readonly [B, A]>
  ) => Effect<R, E, B>
>(2, (self, f) => self.modifyEffect(f))

/** @internal */
export const modifySomeEffect = dual<
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option<Effect<R, E, readonly [B, A]>>
  ) => (self: SynchronizedRef<A>) => Effect<R, E, B>,
  <A, B, R, E>(
    self: SynchronizedRef<A>,
    fallback: B,
    pf: (a: A) => Option<Effect<R, E, readonly [B, A]>>
  ) => Effect<R, E, B>
>(3, (self, fallback, pf) =>
  self.modifyEffect(
    (value) => pipe(pf(value), Option.getOrElse(() => core.succeed([fallback, value] as const)))
  ))

/** @internal */
export const updateEffect = dual<
  <A, R, E>(
    f: (a: A) => Effect<R, E, A>
  ) => (self: SynchronizedRef<A>) => Effect<R, E, void>,
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect<R, E, A>) => Effect<R, E, void>
>(2, (self, f) =>
  self.modifyEffect((value) =>
    core.map(
      f(value),
      (result) => [undefined as void, result] as const
    )
  ))

/** @internal */
export const updateAndGetEffect = dual<
  <A, R, E>(f: (a: A) => Effect<R, E, A>) => (self: SynchronizedRef<A>) => Effect<R, E, A>,
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect<R, E, A>) => Effect<R, E, A>
>(2, (self, f) =>
  self.modifyEffect(
    (value) => core.map(f(value), (result) => [result, result] as const)
  ))

/** @internal */
export const updateSomeEffect = dual<
  <A, R, E>(
    pf: (a: A) => Option<Effect<R, E, A>>
  ) => (self: SynchronizedRef<A>) => Effect<R, E, void>,
  <A, R, E>(
    self: SynchronizedRef<A>,
    pf: (a: A) => Option<Effect<R, E, A>>
  ) => Effect<R, E, void>
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
