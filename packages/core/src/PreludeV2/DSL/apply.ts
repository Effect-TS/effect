// ets_tracing: off

import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import { pipe, tuple } from "../../Function/index.js"
import type { EnforceNonEmptyRecord } from "../../Utils/index.js"
import type { Apply } from "../Apply/index.js"
import { chainF } from "../DSL/chain.js"
import * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"

export function getApplyF<F extends HKT.HKT>(F_: Monad<F>): Apply<F> {
  const chain = chainF(F_)
  return HKT.instance<Apply<F>>({
    map: F_.map,
    both: (fb) => (fa) =>
      pipe(
        fb,
        chain((a) =>
          pipe(
            fa,
            F_.map((b) => Tp.tuple(b, a))
          )
        )
      )
  })
}

export function apF<F extends HKT.HKT>(F_: Apply<F>) {
  return <R, E, A>(fa: HKT.Kind<F, R, E, A>) =>
    <R2, E2, B>(
      fab: HKT.Kind<F, R2, E2, (a: A) => B>
    ): HKT.Kind<F, R & R2, E | E2, B> =>
      pipe(
        F_.both(fab)(fa),
        F_.map(({ tuple: [a, f] }) => f(a))
      )
}

export function getZip<F extends HKT.HKT>(F_: Apply<F>) {
  return <R, E, A, R1, E1, A1>(
    fa: HKT.Kind<F, R, E, A>,
    fb: HKT.Kind<F, R1, E1, A1>
  ): HKT.Kind<F, R & R1, E | E1, readonly [A, A1]> =>
    pipe(
      fa,
      F_.both(fb),
      F_.map(({ tuple: [a, b] }) => [a, b] as const)
    )
}

function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const combined = acc.concat([x])
    // eslint-disable-next-line prefer-spread
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
  }
}

function getRecordConstructor(keys: ReadonlyArray<string>) {
  const len = keys.length
  return curried(
    (...args: ReadonlyArray<unknown>) => {
      const r: Record<string, unknown> = {}
      for (let i = 0; i < len; i++) {
        r[keys[i]!] = args[i]
      }
      return r
    },
    len - 1,
    []
  )
}

export const structF =
  <F extends HKT.HKT>(F_: Apply<F>) =>
  <NER extends Record<string, HKT.Kind<F, any, any, unknown>>>(
    r: EnforceNonEmptyRecord<NER>
  ): HKT.Kind<
    F,
    HKT.Infer<F, "R", NER[keyof NER]>,
    HKT.Infer<F, "E", NER[keyof NER]>,
    { [K in keyof NER]: HKT.Infer<F, "A", NER[K]> }
  > => {
    const ap = apF(F_)
    const keys = Object.keys(r)
    const len = keys.length
    const f = getRecordConstructor(keys)
    let fr = F_.map(f)(r[keys[0]!]!)
    for (let i = 1; i < len; i++) {
      fr = ap(r[keys[i]!]!)(fr)
    }
    return fr
  }

const tupleConstructors: Record<number, (a: unknown) => unknown> = {}

function getTupleConstructor(len: number): (a: unknown) => any {
  // eslint-disable-next-line no-prototype-builtins
  if (!tupleConstructors.hasOwnProperty(len)) {
    tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return tupleConstructors[len]!
}

export const tupleF =
  <F extends HKT.HKT>(F_: Apply<F>) =>
  <T extends Array<HKT.Kind<F, any, any, unknown>>>(
    ...args: T
  ): HKT.Kind<
    F,
    HKT.Infer<F, "R", T[number]>,
    HKT.Infer<F, "E", T[number]>,
    {
      [K in keyof T]: [T[K]] extends [HKT.Kind<F, any, any, infer A>] ? A : never
    }
  > => {
    const ap = apF(F_)
    const len = args.length
    const f = getTupleConstructor(len)
    let fas = F_.map(f)(args[0]!)
    for (let i = 1; i < len; i++) {
      fas = ap(args[i]!)(fas)
    }
    return fas
  }
