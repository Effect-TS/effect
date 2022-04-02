// ets_tracing: off

import "../Operator/index.js"

import { pipe } from "../Function/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import type { Access, Fail, Provide, Run } from "../PreludeV2/FX/index.js"
import type { Applicative, AssociativeEither, Monad } from "../PreludeV2/index.js"
import * as P from "../PreludeV2/index.js"
import * as RD from "../Reader/index.js"

export interface ReaderT<F extends P.HKT> extends P.HKT {
  readonly type: RD.Reader<this["R"], P.Kind<F, unknown, this["E"], this["A"]>>
}

export function monad<F extends P.HKT>(M: Monad<F>) {
  return P.instance<Monad<ReaderT<F>>>({
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
  return P.instance<Access<ReaderT<F>>>({
    access: (f) => pipe(RD.access(f), RD.map(DSL.succeedF(M)))
  })
}
export function associativeEither<F extends P.HKT>(M: AssociativeEither<F>) {
  return P.instance<AssociativeEither<ReaderT<F>>>({
    orElseEither: (fb) => (fa) => (r) => M.orElseEither(() => fb()(r))(fa(r))
  })
}

export function provide<F extends P.HKT>(M: Monad<F>) {
  return P.instance<Provide<ReaderT<F>>>({
    provide: (r) => (fa) =>
      pipe(
        fa,
        RD.provideSome(() => r)
      )
  })
}

export function applicative<F extends P.HKT>(M: Applicative<F>) {
  return P.instance<Applicative<ReaderT<F>>>({
    any: () => RD.succeed(M.any()),
    map: (f) => (fa) => pipe(fa, RD.map(M.map(f))),
    both: (fb) => (fa) =>
      pipe(
        fa,
        RD.zip(fb),
        RD.map(({ tuple: [_a, _b] }) => M.both(_b)(_a))
      )
  })
}

export function run<F extends P.HKT>(M: Run<F>) {
  return P.instance<Run<ReaderT<F>>>({
    either: (fa) => pipe(fa, RD.map(M.either))
  })
}

export function fail<F extends P.HKT>(M: Fail<F>) {
  return P.instance<Fail<ReaderT<F>>>({
    fail: (e) => pipe(e, M.fail, RD.succeed)
  })
}
