import * as A from "../../../../Array"
import { pipe, tuple } from "../../../../Function"
import { UnionToIntersection } from "../../../Utils"
import { succeedF } from "../Any"
import { Covariant6, CovariantF } from "../Covariant"
import { HKT, Kind6, URIS6 } from "../HKT"
import { IdentityBoth6, IdentityBothF } from "../IdentityBoth"

export type ApplicativeF<F> = IdentityBothF<F> & CovariantF<F>

export type Applicative6<F extends URIS6> = IdentityBoth6<F> & Covariant6<F>

export function makeApplicative<URI extends URIS6>(
  _: URI
): (_: Omit<Applicative6<URI>, "URI">) => Applicative6<URI>
export function makeApplicative<URI>(
  URI: URI
): (_: Omit<ApplicativeF<URI>, "URI">) => ApplicativeF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export function sequenceSF<F extends URIS6>(
  F: Applicative6<F>
): <S, NER extends Record<string, Kind6<F, any, any, S, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind6<
  F,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind6<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? X
      : never
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: [NER[K]] extends [
        Kind6<F, infer X, infer In, infer S, infer R, infer E, infer A>
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
        Kind6<F, infer X, infer In, infer S, infer R, infer E, infer A>
      ]
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof NER]
  >,
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind6<F, infer X, infer In, infer S, infer S, infer E, infer A>
    ]
      ? E
      : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [
      Kind6<F, infer X, infer In, infer S, infer S, infer E, infer A>
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
