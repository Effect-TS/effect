import * as R from "../Record"
import type { _E, _R, EnforceNonEmptyRecord } from "../Utils"
import { chain_, map_ } from "./core"
import { forEach_, forEachPar_, forEachParN_ } from "./forEach"
import type { Managed } from "./managed"

export function struct<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
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
      ([_, e]) => map_(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      values.forEach(([k, v]) => {
        res[k] = v
      })
      return res
    }
  ) as any
}

export function structPar<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
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
      ([_, e]) => map_(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      values.forEach(([k, v]) => {
        res[k] = v
      })
      return res
    }
  ) as any
}

/**
 * @dataFirst structParN_
 */
export function structParN(
  n: number
): <NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
) => Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return (r) =>
    map_(
      forEachParN_(
        R.collect_(r, (k, v) => [k, v] as const),
        n,
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return res
      }
    ) as any
}

export function structParN_<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  n: number
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
      ([_, e]) => map_(e, (a) => [_, a] as const)
    ),
    (values) => {
      const res = {}
      values.forEach(([k, v]) => {
        res[k] = v
      })
      return res
    }
  ) as any
}

/**
 * @dataFirst bindAll_
 */
export function bindAll<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
    }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        forEach_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return Object.assign(res, k)
        }
      )
    ) as any
}

export function bindAll_<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never },
  R,
  E
>(
  s: Managed<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
    }
> {
  return chain_(s, (k) =>
    map_(
      forEach_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return Object.assign(res, k)
      }
    )
  ) as any
}

/**
 * @dataFirst bindAllPar_
 */
export function bindAllPar<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
    }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        forEachPar_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return Object.assign(res, k)
        }
      )
    ) as any
}

export function bindAllPar_<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never },
  R,
  E
>(
  s: Managed<R, E, K>,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
    }
> {
  return chain_(s, (k) =>
    map_(
      forEachPar_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return Object.assign(res, k)
      }
    )
  ) as any
}

/**
 * @dataFirst bindAllParN_
 */
export function bindAllParN<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never }
>(
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): <R, E>(
  s: Managed<R, E, K>
) => Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
    }
> {
  return (s) =>
    chain_(s, (k) =>
      map_(
        forEachParN_(
          R.collect_(r(k), (k, v) => [k, v] as const),
          n,
          ([_, e]) => map_(e, (a) => [_, a] as const)
        ),
        (values) => {
          const res = {}
          values.forEach(([k, v]) => {
            res[k] = v
          })
          return Object.assign(res, k)
        }
      )
    ) as any
}

export function bindAllParN_<
  K,
  NER extends Record<string, Managed<any, any, any>> &
    { [k in keyof K & keyof NER]?: never },
  R,
  E
>(
  s: Managed<R, E, K>,
  n: number,
  r: (k: K) => EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K &
    {
      [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
    }
> {
  return chain_(s, (k) =>
    map_(
      forEachParN_(
        R.collect_(r(k), (k, v) => [k, v] as const),
        n,
        ([_, e]) => map_(e, (a) => [_, a] as const)
      ),
      (values) => {
        const res = {}
        values.forEach(([k, v]) => {
          res[k] = v
        })
        return Object.assign(res, k)
      }
    )
  ) as any
}
