// ets_tracing: off

import "../Operator/index.js"

/**
 * Async is a lightweight Effect data type that support as parameters:
 * - R: environment
 * - E: error
 * - A: output
 *
 * And additionally supports interruption
 */
import * as A from "@effect-ts/system/Async"
import * as E from "@effect-ts/system/Either"
import { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import type { Has, Tag } from "@effect-ts/system/Has"
import type * as O from "@effect-ts/system/Option"

import { identity, pipe } from "../Function/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import * as P from "../PreludeV2/index.js"
import type { Sync } from "../Sync/index.js"
import { runEitherEnv } from "../Sync/index.js"
import { isEither, isOption, isTag } from "../Utils/index.js"

export interface AsyncF extends P.HKT {
  readonly type: A.Async<this["R"], this["E"], this["A"]>
}

export const Covariant = P.instance<P.Covariant<AsyncF>>({
  map: A.map
})

export const Any = P.instance<P.Any<AsyncF>>({
  any: () => A.succeed({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<AsyncF>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<AsyncF>>({
  flatten
})

export const IdentityBoth = P.instance<P.IdentityBoth<AsyncF>>({
  ...Any,
  ...AssociativeBoth
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<AsyncF>>({
  ...Any,
  ...AssociativeFlatten
})

export const Applicative = P.instance<P.Applicative<AsyncF>>({
  ...Covariant,
  ...IdentityBoth
})

export const Monad = P.instance<P.Monad<AsyncF>>({
  ...Covariant,
  ...IdentityFlatten
})

export const Fail = P.instance<P.FX.Fail<AsyncF>>({
  fail: A.fail
})

export const Run = P.instance<P.FX.Run<AsyncF>>({
  either: (x) =>
    pipe(
      x,
      A.map(E.right),
      A.catchAll((e) => A.succeed(E.left(e)))
    )
})

export const either: <A, R, E>(
  fa: A.Async<R, E, A>
) => A.Async<R, never, E.Either<E, A>> = Run.either

export const getValidation = DSL.getValidationF({
  ...Monad,
  ...Run,
  ...Fail,
  ...Applicative
})

export const Provide = P.instance<P.FX.Provide<AsyncF>>({
  provide: A.provideAll
})

export const Access = P.instance<P.FX.Access<AsyncF>>({
  access: A.access
})

const genAdapter: {
  <A>(_: Tag<A>): DSL.GenHKT<A.Async<Has<A>, never, A>, A>
  <E, A>(_: O.Option<A>, onNone: () => E): DSL.GenHKT<A.Async<unknown, E, A>, A>
  <A>(_: O.Option<A>): DSL.GenHKT<A.Async<unknown, NoSuchElementException, A>, A>
  <E, A>(_: E.Either<E, A>): DSL.GenHKT<A.Async<unknown, E, A>, A>
  <R, E, A>(_: A.Async<R, E, A>): DSL.GenHKT<A.Async<R, E, A>, A>
} = (_: any, __?: any): any => {
  if (isTag(_)) {
    return new DSL.GenHKT(A.service(_))
  }
  if (isEither(_)) {
    return new DSL.GenHKT(_._tag === "Left" ? A.fail(_.left) : A.succeed(_.right))
  }
  if (isOption(_)) {
    return new DSL.GenHKT(
      _._tag === "None"
        ? A.fail(__ ? __() : new NoSuchElementException())
        : A.succeed(_.value)
    )
  }
  return new DSL.GenHKT(_)
}

export const gen = DSL.genF(Monad, {
  adapter: genAdapter
})

export function flatten<R, E, A, R2, E2>(
  ffa: A.Async<R2, E2, A.Async<R, E, A>>
): A.Async<R2 & R, E | E2, A> {
  return pipe(ffa, A.chain(identity))
}

export function fromEither<E, A>(_: E.Either<E, A>) {
  return _._tag === "Left" ? A.fail(_.left) : A.succeed(_.right)
}

export function fromSync<R, E, A>(_: Sync<R, E, A>) {
  return A.accessM((r: R) => fromEither(runEitherEnv(r)(_)))
}

export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<AsyncF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<AsyncF>()
const branch_ = DSL.conditionalF_<AsyncF>()

export { branch as if, branch_ as if_ }

export * from "@effect-ts/system/Async"
