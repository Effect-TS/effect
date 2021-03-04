// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import * as R from "../Dictionary"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils"
import { chain_ } from "./core"
import type { Effect } from "./effect"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach"
import { map_ } from "./map"

/**
 * Bind a record of effects in a do
 *
 * @dataFirst bindAll_
 * @trace 0
 */
export function bindAll<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  // @ts-expect-error
  return (s) => bindAll_(s, r)
}

/**
 * Bind a record of effects in a do
 *
 * @trace 1
 */
export function bindAll_<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    },
  R,
  E
>(
  s: Effect<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  return chain_(s, (k) =>
    map_(
      forEach_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      traceAs(r, (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return Object.assign(res, k)
      })
    )
  ) as any
}

/**
 * Bind a record of effects, in parallel, in a do
 *
 * @dataFirst bindAllPar_
 * @trace 0
 */
export function bindAllPar<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  // @ts-expect-error
  return (s) => bindAllPar_(s, r)
}

/**
 * Bind a record of effects, in parallel, in a do
 *
 * @trace 1
 */
export function bindAllPar_<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    },
  R,
  E
>(
  s: Effect<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  return chain_(s, (k) =>
    map_(
      forEachPar_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      traceAs(r, (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return Object.assign(res, k)
      })
    )
  ) as any
}

/**
 * Bind a record of effects, in parallel (up to N fibers), in a do
 *
 * @dataFirst bindAllParN_
 * @trace 1
 */
export function bindAllParN<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    }
>(
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): <R, E>(
  s: Effect<R, E, K>
) => Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  // @ts-expect-error
  return (s) => bindAllParN_(s, n, r)
}

/**
 * Bind a record of effects, in parallel (up to N fibers), in a do
 *
 * @trace 2
 */
export function bindAllParN_<
  K,
  NER extends Record<string, Effect<any, any, any>> &
    {
      [k in keyof K & keyof NER]?: never
    },
  R,
  E
>(
  s: Effect<R, E, K>,
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Effect<any, any, any>>
): Effect<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Effect<any, any, infer A>] ? A : never
    }
> {
  return chain_(s, (k) =>
    map_(
      forEachParN_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        n,
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      traceAs(r, (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return Object.assign(res, k)
      })
    )
  ) as any
}
