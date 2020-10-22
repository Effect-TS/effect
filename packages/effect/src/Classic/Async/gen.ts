/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import type { _E, _R } from "@effect-ts/system/Utils"
import { isEither, isOption, isSync, isTag } from "@effect-ts/system/Utils"

import { identity, pipe } from "../../Function"
import type { Sync } from "../../Sync"
import { runEitherEnv } from "../../Sync"
import type { Either } from "../Either"
import type { Has, Tag } from "../Has"
import type { Option } from "../Option"
import type { Async } from "./core"
import { accessM, accessService, chain, fail, succeed, sync } from "./core"

export class GenAsync<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: Async<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenAsync<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (isTag(_)) {
    return new GenAsync(accessService(_)(identity))
  }
  if (isSync(_)) {
    return new GenAsync(
      accessM((r) => {
        const ex = runEitherEnv(r)(_)
        if (ex._tag === "Left") {
          return fail(ex.left)
        } else {
          return succeed(ex.right)
        }
      })
    )
  }
  if (isEither(_)) {
    return new GenAsync(_._tag === "Left" ? fail(_.left) : succeed(_.right))
  }
  if (isOption(_)) {
    return new GenAsync(
      _._tag === "None"
        ? fail(__ ? __() : new NoSuchElementException())
        : succeed(_.value)
    )
  }
  return new GenAsync(_)
}

export function gen<RBase, EBase, AEff>(): <Eff extends GenAsync<RBase, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenAsync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenAsync<unknown, E, A>
    <A>(_: Option<A>): GenAsync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenAsync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenAsync<R, E, A>
    <R, E, A>(_: Async<R, E, A>): GenAsync<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Async<_R<Eff>, _E<Eff>, AEff>
export function gen<EBase, AEff>(): <Eff extends GenAsync<any, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenAsync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenAsync<unknown, E, A>
    <A>(_: Option<A>): GenAsync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenAsync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenAsync<R, E, A>
    <R, E, A>(_: Async<R, E, A>): GenAsync<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Async<_R<Eff>, _E<Eff>, AEff>
export function gen<AEff>(): <Eff extends GenAsync<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenAsync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenAsync<unknown, E, A>
    <A>(_: Option<A>): GenAsync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenAsync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenAsync<R, E, A>
    <R, E, A>(_: Async<R, E, A>): GenAsync<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Async<_R<Eff>, _E<Eff>, AEff>
export function gen<Eff extends GenAsync<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenAsync<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenAsync<unknown, E, A>
    <A>(_: Option<A>): GenAsync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenAsync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenAsync<R, E, A>
    <R, E, A>(_: Async<R, E, A>): GenAsync<R, E, A>
  }) => Generator<Eff, AEff, any>
): Async<_R<Eff>, _E<Eff>, AEff>
export function gen(...args: any[]): any {
  function gen_<Eff extends GenAsync<any, any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): Async<_R<Eff>, _E<Eff>, AEff> {
    return pipe(
      sync(() => {
        const iterator = f(adapter as any)
        const state = iterator.next()

        function run(
          state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
        ): Async<any, any, AEff> {
          if (state.done) {
            return succeed(state.value)
          }
          return pipe(
            state.value["effect"],
            chain((val) => {
              const next = iterator.next(val)
              return run(next)
            })
          )
        }

        return run(state)
      }),
      chain(identity)
    )
  }

  if (args.length === 0) {
    return (f: any) => gen_(f)
  }
  return gen_(args[0])
}
