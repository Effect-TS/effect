// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import { number } from "./number"

export interface IntBrand {
  readonly Int: unique symbol
}

export type Int = number & IntBrand

export const int: S.Schema<
  unknown,
  S.CompositionE<
    | S.NextE<S.RefinementE<S.LeafE<S.InvalidIntegerE>>>
    | S.PrevE<S.RefinementE<S.LeafE<S.ParseNumberE>>>
  >,
  number & IntBrand,
  number,
  S.RefinementE<S.LeafE<S.InvalidIntegerE>>,
  number & IntBrand,
  number,
  {}
> = pipe(
  number,
  S.arbitrary((_) => _.integer()),
  S.refine(
    (n): n is Int => Number.isInteger(n),
    (n) => S.leafE(S.invalidIntegerE(n))
  ),
  S.encoder((_) => _ as number),
  S.mapConstructorError((_) => Chunk.unsafeHead(_.errors).error),
  S.mapApi(() => ({}))
)
