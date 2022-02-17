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
import type { AsyncURI } from "../Modules/index.js"
import type { URI } from "../Prelude/index.js"
import * as P from "../Prelude/index.js"
import type { Sync } from "../Sync/index.js"
import { runEitherEnv } from "../Sync/index.js"
import { isEither, isOption, isTag } from "../Utils/index.js"

export { branch as if, branch_ as if_ }

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Covariant = P.instance<P.Covariant<[URI<AsyncURI>], V>>({
  map: A.map
})

export const Any = P.instance<P.Any<[URI<AsyncURI>], V>>({
  any: () => A.succeed({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<AsyncURI>], V>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<AsyncURI>], V>>({
  flatten
})

export const IdentityBoth = P.instance<P.IdentityBoth<[URI<AsyncURI>], V>>({
  ...Any,
  ...AssociativeBoth
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[URI<AsyncURI>], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const Applicative = P.instance<P.Applicative<[URI<AsyncURI>], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const Monad = P.instance<P.Monad<[URI<AsyncURI>], V>>({
  ...Covariant,
  ...IdentityFlatten
})

export const Fail = P.instance<P.FX.Fail<[URI<AsyncURI>], V>>({
  fail: A.fail
})

export const Run = P.instance<P.FX.Run<[URI<AsyncURI>], V>>({
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

export const getValidation = P.getValidationF({
  ...Monad,
  ...Run,
  ...Applicative,
  ...Fail
})

export const Provide = P.instance<P.FX.Provide<[URI<AsyncURI>], V>>({
  provide: A.provideAll
})

export const Access = P.instance<P.FX.Access<[URI<AsyncURI>], V>>({
  access: A.access
})

const genAdapter: {
  <A>(_: Tag<A>): P.GenHKT<A.Async<Has<A>, never, A>, A>
  <E, A>(_: O.Option<A>, onNone: () => E): P.GenHKT<A.Async<unknown, E, A>, A>
  <A>(_: O.Option<A>): P.GenHKT<A.Async<unknown, NoSuchElementException, A>, A>
  <E, A>(_: E.Either<E, A>): P.GenHKT<A.Async<unknown, E, A>, A>
  <R, E, A>(_: A.Async<R, E, A>): P.GenHKT<A.Async<R, E, A>, A>
} = (_: any, __?: any): any => {
  if (isTag(_)) {
    return new P.GenHKT(A.service(_))
  }
  if (isEither(_)) {
    return new P.GenHKT(_._tag === "Left" ? A.fail(_.left) : A.succeed(_.right))
  }
  if (isOption(_)) {
    return new P.GenHKT(
      _._tag === "None"
        ? A.fail(__ ? __() : new NoSuchElementException())
        : A.succeed(_.value)
    )
  }
  return new P.GenHKT(_)
}

export const gen = P.genF(Monad, {
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
  P.matchers(Covariant)

/**
 * Conditionals
 */
const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)

export * from "@effect-ts/system/Async"
