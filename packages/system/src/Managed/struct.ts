// ets_tracing: off

import * as R from "../Collections/Immutable/Dictionary/index.js"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils/index.js"
import { chain_, map_ } from "./core.js"
import { forEach_, forEachPar_, forEachParN_ } from "./forEach.js"
import type { Managed } from "./managed.js"

export function struct<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEach_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const),
      __trace
    ),
    (values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return res
    }
  ) as any
}

export function structPar<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEachPar_(
      R.collect_(r, (k, v) => [k, v] as const),
      ([_, e]) => map_(e, (a) => [_, a] as const),
      __trace
    ),
    (values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return res
    }
  ) as any
}

/**
 * @ets_data_first structParN_
 */
export function structParN(
  n: number,
  __trace?: string
): <NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
) => Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (r) => structParN_(r, n, __trace)
}

export function structParN_<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  n: number,
  __trace?: string
): Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return map_(
    forEachParN_(
      R.collect_(r, (k, v) => [k, v] as const),
      n,
      ([_, e]) => map_(e, (a) => [_, a] as const),
      __trace
    ),
    (values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return res
    }
  ) as any
}

/**
 * @ets_data_first bindAll_
 */
export function bindAll<
  K,
  NER extends Record<string, Managed<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAll_(s, r, __trace)
}

export function bindAll_<
  K,
  NER extends Record<string, Managed<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Managed<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return chain_(s, (k) =>
    map_(
      forEach_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const),
        __trace
      ),
      (values) => {
        const res = {}
        for (const [k, v] of values) {
          res[k] = v
        }
        return Object.assign(res, k)
      }
    )
  ) as any
}

/**
 * @ets_data_first bindAllPar_
 */
export function bindAllPar<
  K,
  NER extends Record<string, Managed<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAllPar_(s, r, __trace)
}

export function bindAllPar_<
  K,
  NER extends Record<string, Managed<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Managed<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return chain_(s, (k) =>
    map_(
      forEachPar_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const),
        __trace
      ),
      (values) => {
        const res = {}
        for (const [k, v] of values) {
          res[k] = v
        }
        return Object.assign(res, k)
      }
    )
  ) as any
}

/**
 * @ets_data_first bindAllParN_
 */
export function bindAllParN<
  K,
  NER extends Record<string, Managed<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  }
>(
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  // @ts-expect-error
  return (s) => bindAllParN_(s, n, r, __trace)
}

export function bindAllParN_<
  K,
  NER extends Record<string, Managed<any, any, any>> & {
    [k in keyof K & keyof NER]?: never
  },
  R,
  E
>(
  s: Managed<R, E, K>,
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __trace?: string
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return chain_(s, (k) =>
    map_(
      forEachParN_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        n,
        ([_, e]) => map_(e, (a) => [_, a] as const),
        __trace
      ),
      (values) => {
        const res = {}
        for (const [k, v] of values) {
          res[k] = v
        }
        return Object.assign(res, k)
      }
    )
  ) as any
}
