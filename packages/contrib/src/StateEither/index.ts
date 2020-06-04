/* adapted from https://github.com/gcanti/fp-ts */

import { CMonad3, CApplicative3 } from "@matechs/core/Base"
import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as Ex from "@matechs/core/Exit"
import * as F from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as R from "@matechs/core/Ref"
import * as TU from "@matechs/core/Tuple"

export interface State<S, A> {
  (s: S): [A, S]
}

export const StateURI = "@matechs/core/StateEither/StateURI"

export interface StateEnv<S> {
  [StateURI]: {
    state: R.Ref<S>
  }
}

export const mkState = <S>(_: S): T.Sync<StateEnv<S>> =>
  pipe(
    R.makeRef(_),
    T.map((state) => ({
      [StateURI]: {
        state
      }
    }))
  )

export const runToEither = <E, A>(_: T.SyncE<E, A>): E.Either<E, A> =>
  pipe(
    T.runSync(_),
    Ex.fold(
      E.right,
      E.left,
      (a) => {
        throw a
      },
      () => {
        throw new Error("Bug: op interrupted")
      }
    )
  )

export interface StateEither<S, E, A> extends T.SyncRE<StateEnv<S>, E, A> {}

export const evalState: <S, E, A>(ma: StateEither<S, E, A>, s: S) => E.Either<E, A> = (
  ma,
  s
) =>
  pipe(
    mkState(s),
    T.chain((env) => T.provide(env)(ma)),
    runToEither
  )

export const execState: <S, E, A>(ma: StateEither<S, E, A>, s: S) => E.Either<E, S> = <
  S,
  E,
  A
>(
  ma: StateEither<S, E, A>,
  s: S
): E.Either<E, S> =>
  pipe(
    mkState(s),
    T.chain((env) =>
      T.provide(env)(
        T.chain_(ma, () =>
          T.accessM(({ [StateURI]: { state } }: StateEnv<S>) => state.get)
        )
      )
    ),
    runToEither
  )

export function left<S, E, A = never>(e: E): StateEither<S, E, A> {
  return T.raiseError(e)
}

export const right: <S, E = never, A = never>(a: A) => StateEither<S, E, A> = T.pure

export const rightState = <S, E = never, A = never>(
  ma: State<S, A>
): StateEither<S, E, A> =>
  T.accessM((_: StateEnv<S>) => pipe(_[StateURI].state.get, T.map(ma), T.map(TU.fst)))

export function leftState<S, E = never, A = never>(
  me: State<S, E>
): StateEither<S, E, A> {
  return T.accessM((_: StateEnv<S>) =>
    pipe(_[StateURI].state.get, T.map(me), T.chain(F.flow(TU.fst, T.raiseError)))
  )
}

export const get = <S, E = never>(): StateEither<S, E, S> =>
  pipe(T.accessM((_: StateEnv<S>) => _[StateURI].state.get))

export const put = <S, E = never>(s: S): StateEither<S, E, void> =>
  pipe(T.accessM((_: StateEnv<S>) => T.asUnit(_[StateURI].state.set(s))))

export const modify = <S, E = never>(f: (s: S) => S): StateEither<S, E, void> =>
  T.accessM((_: StateEnv<S>) => _[StateURI].state.update(f))

export const gets = <S, E = never, A = never>(f: (s: S) => A): StateEither<S, E, A> =>
  T.accessM((_: StateEnv<S>) => pipe(_[StateURI].state.get, T.map(f)))

export const fromEither = <S, E, A>(ma: E.Either<E, A>): StateEither<S, E, A> =>
  T.encaseEither(ma)

export function fromEitherK<E, A extends Array<unknown>, B>(
  f: (...a: A) => E.Either<E, B>
): <S>(...a: A) => StateEither<S, E, B> {
  return (...a) => fromEither(f(...a))
}

export function chainEitherK<E, A, B>(
  f: (a: A) => E.Either<E, B>
): <S>(ma: StateEither<S, E, A>) => StateEither<S, E, B> {
  return <S>(ma: StateEither<S, E, A>) =>
    pipe(
      ma,
      T.chain((a) => fromEitherK(f)<S>(a))
    )
}

export const URI = "@matechs/core/StateEither"
export type URI = typeof URI

declare module "@matechs/core/Base/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: StateEither<R, E, A>
  }
}

export const stateEither: CMonad3<URI> & CApplicative3<URI> = {
  URI,
  map: T.map,
  of: right,
  ap: T.ap,
  chain: T.chain
}

export const ap: <R, E, A>(
  fa: StateEither<R, E, A>
) => <B>(fab: StateEither<R, E, (a: A) => B>) => StateEither<R, E, B> = T.ap

export const apFirst: <R, E, B>(
  fb: StateEither<R, E, B>
) => <A>(fa: StateEither<R, E, A>) => StateEither<R, E, A> = T.apFirst

export const apSecond: <R, E, B>(
  fb: StateEither<R, E, B>
) => <A>(fa: StateEither<R, E, A>) => StateEither<R, E, B> = T.apSecond

export const chain: <R, E, A, B>(
  f: (a: A) => StateEither<R, E, B>
) => (ma: StateEither<R, E, A>) => StateEither<R, E, B> = T.chain

export const chainTap: <R, E, A, B>(
  f: (a: A) => StateEither<R, E, B>
) => (ma: StateEither<R, E, A>) => StateEither<R, E, A> = T.chainTap

export const filterOrElse: {
  <E, A, B extends A>(refinement: F.Refinement<A, B>, onFalse: (a: A) => E): <R>(
    ma: StateEither<R, E, A>
  ) => StateEither<R, E, B>
  <E, A>(predicate: F.Predicate<A>, onFalse: (a: A) => E): <R>(
    ma: StateEither<R, E, A>
  ) => StateEither<R, E, A>
} = T.filterOrElse

export const flatten: <R, E, A>(
  mma: StateEither<R, E, StateEither<R, E, A>>
) => StateEither<R, E, A> = (mma) => T.chain_(mma, F.identity)

export const fromOption: <E>(
  onNone: () => E
) => <R, A>(ma: O.Option<A>) => StateEither<R, E, A> = (onNone) => (ma) =>
  T.encaseOption(ma, onNone)

export const fromPredicate: {
  <E, A, B extends A>(refinement: F.Refinement<A, B>, onFalse: (a: A) => E): <U>(
    a: A
  ) => StateEither<U, E, B>
  <E, A>(predicate: F.Predicate<A>, onFalse: (a: A) => E): <R>(
    a: A
  ) => StateEither<R, E, A>
} = T.fromPredicate

export const map: <A, B>(
  f: (a: A) => B
) => <R, E>(fa: StateEither<R, E, A>) => StateEither<R, E, B> = T.map
