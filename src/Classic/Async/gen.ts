/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import type { _E, _R } from "@effect-ts/system/Utils"
import { isEither, isOption } from "@effect-ts/system/Utils"

import { identity, pipe } from "../../Function"
import type { Either } from "../Either"
import type { Option } from "../Option"
import type { Sync } from "../Sync"
import { runEitherEnv } from "../Sync"
import type { Async } from "./core"
import { accessM, chain, fail, succeed, sync } from "./core"

export class GenAsync<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: Async<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenAsync<R, E, A>, A, any> {
    return yield this
  }
}

function isSync(u: unknown): u is Sync<unknown, unknown, unknown> {
  return typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "XPure"
}

const adapter = (_: any, __?: any) => {
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

export function gen<Eff extends GenAsync<any, any, any>, AEff>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenAsync<unknown, E, A>
    <A>(_: Option<A>): GenAsync<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenAsync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenAsync<R, E, A>
    <R, E, A>(_: Async<R, E, A>): GenAsync<R, E, A>
  }) => Generator<Eff, AEff, any>
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
