// ets_tracing: off

import "../Operator/index.js"

import { pipe } from "../Function/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import type { Access, Fail, Provide, Run } from "../PreludeV2/FX/index.js"
import type { Applicative, AssociativeEither, Monad } from "../PreludeV2/index.js"
import * as P from "../PreludeV2/index.js"
import * as RD from "../Reader/index.js"

export type ReaderTF<F extends P.HKT> = P.ComposeF<RD.ReaderF, F>

export function monad<F extends P.HKT>(M: Monad<F>) {
  return P.instance<Monad<ReaderTF<F>>>({
    any: () => M.any,
    flatten: (ffa) => (r) =>
      pipe(
        ffa(r),
        M.map((f) => f(r)),
        M.flatten
      ),
    map: (f) => (fa) => (r) => M.map(f)(fa(r))
  })
}

export function access<F extends P.HKT>(M: Monad<F>) {
  return P.instance<Access<ReaderTF<F>>>({
    access: (f) => pipe(RD.access(f), RD.map(DSL.succeedF(M)))
  })
}
export function associativeEither<F extends P.HKT>(M: AssociativeEither<F>) {
  return P.instance<AssociativeEither<ReaderTF<F>>>({
    orElseEither: (fb) => (fa) => (r) => M.orElseEither(() => fb()(r))(fa(r))
  })
}

export function provide<F extends P.HKT>(M: Monad<F>) {
  return P.instance<Provide<ReaderTF<F>>>({
    provide:
      <R>(r: R) =>
      <X, I, E, A>(fa: RD.Reader<R, P.Kind<F, X, I, R, E, A>>) =>
        pipe(
          fa,
          RD.provideSome(() => r)
        ) as RD.Reader<unknown, P.Kind<F, X, I, unknown, E, A>>
  })
}

export function applicative<F extends P.HKT>(M: Applicative<F>) {
  return P.instance<Applicative<ReaderTF<F>>>({
    any: () => RD.succeed(M.any()),
    map:
      <A, B>(f: (a: A) => B) =>
      <X, I, R, E>(fa: RD.Reader<R, P.Kind<F, X, I, R, E, A>>) =>
        pipe(fa, RD.map(M.map(f))),
    both: (fb) => (fa) =>
      pipe(
        fa,
        RD.zip(fb),
        RD.map(({ tuple: [_a, _b] }) => M.both(_b)(_a))
      )
  })
}

export function run<F extends P.HKT>(M: Run<F>) {
  return P.instance<Run<ReaderTF<F>>>({
    either: (fa) => pipe(fa, RD.map(M.either))
  })
}

export function fail<F extends P.HKT>(M: Fail<F>) {
  return P.instance<Fail<ReaderTF<F>>>({
    fail: (e) => pipe(e, M.fail, RD.succeed)
  })
}
