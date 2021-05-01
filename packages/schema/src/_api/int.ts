// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import * as Constructor from "../Constructor"
import * as Th from "../These"
import { number } from "./number"
import { string } from "./string"

export interface IntBrand {
  readonly Int: unique symbol
}

export type Int = number & IntBrand

export const intIdentifier = Symbol.for("@effect-ts/schema/ids/int")

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
  S.mapApi(() => ({})),
  S.identified(intIdentifier, {})
)

const parseStringInt = (s: string) => {
  const parsed = Number.parseInt(s)
  if (Number.isNaN(parsed)) {
    return Th.fail(S.leafE(S.parseNumberE(s)))
  }
  return Th.succeed(parsed as Int)
}

export const stringIntIdentifier = Symbol.for("@effect-ts/schema/ids/stringInt")

export const stringInt = pipe(
  string,
  S.compose(pipe(int, S.parser(parseStringInt), S.constructor(parseStringInt))),
  S.constructor(Constructor.for(int)),
  S.encoder((_) => `${_}`),
  S.mapApi(() => ({})),
  S.identified(stringIntIdentifier, {})
)
