import { Either } from "../../Either.js"
import { dual } from "../../Function.js"
import { Option } from "../../Option.js"
import type { STM } from "../../STM.js"
import type { TDeferred } from "../../TDeferred.js"
import type { TRef } from "../../TRef.js"
import * as core from "./core.js"
import * as stm from "./stm.js"
import * as tRef from "./tRef.js"

/** @internal */
const TDeferredSymbolKey = "effect/TDeferred"

/** @internal */
export const TDeferredTypeId: TDeferred.TDeferredTypeId = Symbol.for(
  TDeferredSymbolKey
) as TDeferred.TDeferredTypeId

/** @internal */
const tDeferredVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
class TDeferredImpl<E, A> implements TDeferred<E, A> {
  readonly [TDeferredTypeId] = tDeferredVariance
  constructor(readonly ref: TRef<Option<Either<E, A>>>) {}
}

/** @internal */
export const _await = <E, A>(self: TDeferred<E, A>): STM<never, E, A> =>
  stm.flatten(
    stm.collect(tRef.get(self.ref), (option) =>
      Option.isSome(option) ?
        Option.some(stm.fromEither(option.value)) :
        Option.none())
  )

/** @internal */
export const done = dual<
  <E, A>(either: Either<E, A>) => (self: TDeferred<E, A>) => STM<never, never, boolean>,
  <E, A>(self: TDeferred<E, A>, either: Either<E, A>) => STM<never, never, boolean>
>(2, (self, either) =>
  core.flatMap(
    tRef.get(self.ref),
    Option.match({
      onNone: () =>
        core.zipRight(
          tRef.set(self.ref, Option.some(either)),
          core.succeed(true)
        ),
      onSome: () => core.succeed(false)
    })
  ))

/** @internal */
export const fail = dual<
  <E>(error: E) => <A>(self: TDeferred<E, A>) => STM<never, never, boolean>,
  <E, A>(self: TDeferred<E, A>, error: E) => STM<never, never, boolean>
>(2, (self, error) => done(self, Either.left(error)))

/** @internal */
export const make = <E, A>(): STM<never, never, TDeferred<E, A>> =>
  core.map(
    tRef.make<Option<Either<E, A>>>(Option.none()),
    (ref) => new TDeferredImpl(ref)
  )

/** @internal */
export const poll = <E, A>(
  self: TDeferred<E, A>
): STM<never, never, Option<Either<E, A>>> => tRef.get(self.ref)

/** @internal */
export const succeed = dual<
  <A>(value: A) => <E>(self: TDeferred<E, A>) => STM<never, never, boolean>,
  <E, A>(self: TDeferred<E, A>, value: A) => STM<never, never, boolean>
>(2, (self, value) => done(self, Either.right(value)))
