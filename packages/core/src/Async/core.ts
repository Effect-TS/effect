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
import type { Has, Tag } from "@effect-ts/system/Has"

import { flow, identity, pipe } from "../Function"
import type { AsyncURI } from "../Modules"
import * as P from "../Prelude"
import type { Sync } from "../Sync"
import { runEitherEnv } from "../Sync"

export * from "@effect-ts/system/Async"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Covariant = P.instance<P.Covariant<[AsyncURI], V>>({
  map: A.map
})

export const Any = P.instance<P.Any<[AsyncURI], V>>({
  any: () => A.succeed({})
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[AsyncURI], V>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[AsyncURI], V>>({
  flatten
})

export const IdentityBoth = P.instance<P.IdentityBoth<[AsyncURI], V>>({
  ...Any,
  ...AssociativeBoth
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[AsyncURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const Applicative = P.instance<P.Applicative<[AsyncURI], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const Monad = P.instance<P.Monad<[AsyncURI], V>>({
  ...Covariant,
  ...IdentityFlatten
})

export const Fail = P.instance<P.FX.Fail<[AsyncURI], V>>({
  fail: A.fail
})

export const Run = P.instance<P.FX.Run<[AsyncURI], V>>({
  either: flow(
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

export const Provide = P.instance<P.FX.Provide<[AsyncURI], V>>({
  provide: A.provideAll
})

export const Access = P.instance<P.FX.Access<[AsyncURI], V>>({
  access: A.access
})

export const accessServiceM: <Service>(
  H: Tag<Service>
) => <R, E, A>(
  f: (_: Service) => A.Async<R, E, A>
) => A.Async<R & Has<Service>, E, A> = P.accessServiceMF({ ...Monad, ...Access })

export const accessService: <Service>(
  H: Tag<Service>
) => <A>(f: (_: Service) => A) => A.Async<Has<Service>, never, A> = (tag) => (f) =>
  accessServiceM(tag)((_) => A.succeed(f(_)))

export const provideService: <Service>(
  H: Tag<Service>
) => (
  S: Service
) => <R, E, A>(
  fa: A.Async<R & Has<Service>, E, A>
) => A.Async<R, E, A> = P.provideServiceF({ ...Monad, ...Provide, ...Access })

export const provideServiceM: <Service>(
  H: Tag<Service>
) => <R2, E2>(
  SM: A.Async<R2, E2, Service>
) => <R, E, A>(fa: A.Async<R & Has<Service>, E, A>) => A.Async<R & R2, E | E2, A> = (
  tag
) => (SM) => (fa) =>
  pipe(
    SM,
    A.chain((s) => pipe(fa, provideService(tag)(s)))
  )

export const gen_ = P.genF(Monad)

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
