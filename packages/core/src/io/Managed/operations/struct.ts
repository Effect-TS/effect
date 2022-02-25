import * as R from "../../../collection/immutable/Dictionary"
import type { _E, _R, EnforceNonEmptyRecord } from "../../../data/Utils"
import { Managed } from "../definition"

/**
 * @tsplus static ets/ManagedOps struct
 */
export function struct<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __tsplusTrace?: string
): Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return Managed.forEach(
    R.collect_(r, (k, v) => [k, v] as const),
    ([_, e]) => e.map((a) => [_, a] as const)
  ).map((values) => {
    const res = {}
    for (const [k, v] of values) {
      res[k] = v
    }
    return res
  }) as any
}

/**
 * @tsplus static ets/ManagedOps structPar
 */
export function structPar<NER extends Record<string, Managed<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Managed<any, any, any>>,
  __tsplusTrace?: string
): Managed<
  _R<NER[keyof NER]>,
  _E<NER[keyof NER]>,
  {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return Managed.forEachPar(
    R.collect_(r, (k, v) => [k, v] as const),
    ([_, e]) => e.map((a) => [_, a] as const)
  ).map((values) => {
    const res = {}
    for (const [k, v] of values) {
      res[k] = v
    }
    return res
  }) as any
}

/**
 * @tsplus fluent ets/Managed bindAll
 */
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
  __tsplusTrace?: string
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return s.flatMap((k) =>
    Managed.forEach(
      R.collect_(r(k), (k, v) => [k, v] as const),
      ([_, e]) => e.map((a) => [_, a] as const)
    ).map((values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return Object.assign(res, k)
    })
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
  __tsplusTrace?: string
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
  return (s) => bindAll_(s, r)
}

/**
 * @tsplus fluent ets/Managed bindAllPar
 */
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
  __tsplusTrace?: string
): Managed<
  R & _R<NER[keyof NER]>,
  E | _E<NER[keyof NER]>,
  K & {
    [K in keyof NER]: [NER[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return s.flatMap((k) =>
    Managed.forEachPar(
      R.collect_(r(k), (k, v) => [k, v] as const),
      ([_, e]) => e.map((a) => [_, a] as const)
    ).map((values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return Object.assign(res, k)
    })
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
  __tsplusTrace?: string
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
  return (s) => bindAllPar_(s, r)
}
