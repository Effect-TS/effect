// ets_tracing: off

import "../../Operator/index.js"

import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import { pipe } from "../../Function/index.js"
import { succeedF } from "../../Prelude/DSL/index.js"
import type { Access, Fail, Provide, Run } from "../../Prelude/FX/index.js"
import * as HKT from "../../Prelude/HKT/index.js"
import type { Applicative, Monad } from "../../Prelude/index.js"
import * as R from "../XReader/index.js"

export function monad<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Monad<[HKT.URI<R.XReaderURI>, ...F], HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function monad<F>(
  M: Monad<HKT.UHKT<F>>
): Monad<[HKT.URI<R.XReaderURI>, ...HKT.UHKT<F>], HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    flatten: <A, R, R2>(
      ffa: R.XReader<R, HKT.HKT<F, R.XReader<R2, HKT.HKT<F, A>>>>
    ): R.XReader<R & R2, HKT.HKT<F, A>> =>
      pipe(
        R.access((e: R & R2) => pipe(ffa, R.runEnv(e), M.map(R.runEnv(e)))),
        R.map(M.flatten)
      ),
    map: <A, B>(
      f: (a: A) => B
    ): (<R>(fa: R.XReader<R, HKT.HKT<F, A>>) => R.XReader<R, HKT.HKT<F, B>>) =>
      R.map(M.map(f))
  })
}

export function access<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Access<[HKT.URI<R.XReaderURI>, ...F], HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function access<F>(
  M: Monad<HKT.UHKT<F>>
): Access<[HKT.URI<R.XReaderURI>, ...HKT.UHKT<F>], HKT.V<"R", "-">> {
  return HKT.instance({
    access: (x) => pipe(x, R.access, R.map(succeedF(M)))
  })
}

export function provide<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Provide<[HKT.URI<R.XReaderURI>, ...F], HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function provide<F>(
  _: Monad<HKT.UHKT<F>>
): Provide<[HKT.URI<R.XReaderURI>, ...HKT.UHKT<F>], HKT.V<"R", "-">> {
  return HKT.instance({
    provide: <R>(r: R) => R.provideSome(() => r)
  })
}

export function applicative<F extends HKT.URIS, C>(
  M: Applicative<F, C>
): Applicative<[HKT.URI<R.XReaderURI>, ...F], HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function applicative<F>(
  M: Applicative<HKT.UHKT<F>>
): Applicative<[HKT.URI<R.XReaderURI>, ...HKT.UHKT<F>], HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    map: <A, B>(
      f: (a: A) => B
    ): (<R>(fa: R.XReader<R, HKT.HKT<F, A>>) => R.XReader<R, HKT.HKT<F, B>>) =>
      R.map(M.map(f)),
    both:
      <R2, B>(
        fb: R.XReader<R2, HKT.HKT<F, B>>
      ): (<R, A>(
        fa: R.XReader<R, HKT.HKT<F, A>>
      ) => R.XReader<R & R2, HKT.HKT<F, Tp.Tuple<[A, B]>>>) =>
      (x) =>
        pipe(
          x,
          R.zip(fb),
          R.map(({ tuple: [_a, _b] }) => pipe(_a, M.both(_b)))
        )
  })
}

export function run<F extends HKT.URIS, C>(
  M: Run<F, C>
): Run<[HKT.URI<R.XReaderURI>, ...F], HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function run<F>(
  M: Run<HKT.UHKT2<F>>
): Run<[HKT.URI<R.XReaderURI>, ...HKT.UHKT2<F>], HKT.V<"R", "-">> {
  return HKT.instance({
    either: (x) => pipe(x, R.map(M.either))
  })
}

export function fail<F extends HKT.URIS, C>(
  M: Fail<F, C>
): Fail<[HKT.URI<R.XReaderURI>, ...F], HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function fail<F>(
  M: Fail<HKT.UHKT2<F>>
): Fail<[HKT.URI<R.XReaderURI>, ...HKT.UHKT2<F>], HKT.V<"R", "-">> {
  return HKT.instance({
    fail: (x) => pipe(x, M.fail, R.succeed)
  })
}
