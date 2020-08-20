import * as A from "@effect-ts/system/Array"

import { pipe, tuple } from "../../Function"
import type { EnforceNonEmptyRecord, UnionToIntersection } from "../../Utils"
import type { ApplicativeF, ApplicativeK } from "../Applicative"
import type { HKT_, HKTFull, KindFull, URIS } from "../HKT"
import type {
  InferEnvF,
  InferEnvK,
  InferErrF,
  InferErrK,
  InferInF,
  InferInK,
  InferKF,
  InferKK,
  InferNKF,
  InferNKK,
  InferOutF,
  InferOutK,
  InferXF,
  InferXK,
  OrNever
} from "../HKT/infer"
import { anyF } from "./core"

export function sequenceSF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: ApplicativeK<F, TL0, TL1, TL2, TL3>
): <SIO>() => <
  S,
  NER extends Record<
    string,
    KindFull<F, TL0, TL1, TL2, TL3, any, any, SIO, SIO, any, any, S, any, any, any>
  >
>(
  r: EnforceNonEmptyRecord<NER>
) => KindFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  {
    [K in keyof NER]: InferKK<F, NER[K]>
  }[keyof NER],
  {
    [K in keyof NER]: InferNKK<F, NER[K]>
  }[keyof NER],
  SIO,
  SIO,
  {
    [K in keyof NER]: InferXK<F, NER[K]>
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: OrNever<InferInK<F, NER[K]>>
    }[keyof NER]
  >,
  S,
  UnionToIntersection<
    {
      [K in keyof NER]: OrNever<InferEnvK<F, NER[K]>>
    }[keyof NER]
  >,
  {
    [K in keyof NER]: InferErrK<F, NER[K]>
  }[keyof NER],
  {
    [K in keyof NER]: InferOutK<F, NER[K]>
  }
>
export function sequenceSF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: ApplicativeF<F, TL0, TL1, TL2, TL3>
): <SIO>() => <
  S,
  NER extends Record<
    string,
    HKTFull<F, TL0, TL1, TL2, TL3, any, any, SIO, SIO, any, any, S, any, any, any>
  >
>(
  r: EnforceNonEmptyRecord<NER>
) => HKTFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  {
    [K in keyof NER]: InferKF<F, NER[K]>
  }[keyof NER],
  {
    [K in keyof NER]: InferNKF<F, NER[K]>
  }[keyof NER],
  SIO,
  SIO,
  {
    [K in keyof NER]: InferXF<F, NER[K]>
  }[keyof NER],
  UnionToIntersection<
    {
      [K in keyof NER]: OrNever<InferInF<F, NER[K]>>
    }[keyof NER]
  >,
  S,
  UnionToIntersection<
    {
      [K in keyof NER]: OrNever<InferEnvF<F, NER[K]>>
    }[keyof NER]
  >,
  {
    [K in keyof NER]: InferErrF<F, NER[K]>
  }[keyof NER],
  {
    [K in keyof NER]: InferOutF<F, NER[K]>
  }
>
export function sequenceSF<F>(
  F: ApplicativeF<F>
): () => (r: Record<string, HKT_<F, any>>) => HKT_<F, Record<string, any>> {
  return () => (r) =>
    pipe(
      Object.keys(r).map((k) => tuple(k, r[k])),
      A.reduce(anyF(F)([] as readonly (readonly [string, any])[]), (b, a) =>
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
