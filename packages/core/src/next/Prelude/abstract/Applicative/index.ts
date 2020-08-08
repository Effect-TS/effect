import * as A from "../../../../Array"
import { pipe, tuple } from "../../../../Function"
import { UnionToIntersection } from "../../../Utils"
import { succeedF } from "../Any"
import { CovariantK, CovariantF } from "../Covariant"
import { HKT, Kind, URIS } from "../HKT"
import { IdentityBothK, IdentityBothF } from "../IdentityBoth"

export type ApplicativeF<F> = IdentityBothF<F> & CovariantF<F>

export type ApplicativeK<F extends URIS> = IdentityBothK<F> & CovariantK<F>

export function makeApplicative<URI extends URIS>(
  _: URI
): (_: Omit<ApplicativeK<URI>, "URI">) => ApplicativeK<URI>
export function makeApplicative<URI>(
  URI: URI
): (_: Omit<ApplicativeF<URI>, "URI">) => ApplicativeF<URI>
export function makeApplicative<URI>(
  URI: URI
): (_: Omit<ApplicativeF<URI>, "URI">) => ApplicativeF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export function sequenceSF<F extends URIS>(
  F: ApplicativeK<F>
): <S, NER extends Record<string, Kind<F, any, any, S, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind<
  F,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind<F, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends In
          ? never
          : In
        : never
    }[keyof NER]
  >,
  S,
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind<F, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? A
      : never
  }
>
export function sequenceSF<F>(
  F: ApplicativeF<F>
): <NER extends Record<string, HKT<F, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => HKT<F, { [K in keyof NER]: [NER[K]] extends [HKT<F, infer A>] ? A : never }>
export function sequenceSF<F>(
  F: ApplicativeF<F>
): (r: Record<string, HKT<F, any>>) => HKT<F, Record<string, any>> {
  return (r) =>
    pipe(
      Object.keys(r).map((k) => tuple(k, r[k])),
      A.reduce(succeedF(F)([] as readonly [string, any][]), (b, a) =>
        pipe(
          b,
          F.both(a[1]),
          F.map(([x, y]) => [...x, tuple(a[0], y)])
        )
      ),
      F.map((a) => {
        const res = {}
        a.forEach(([k, v]) => {
          res[k] = v
        })
        return res
      })
    )
}
