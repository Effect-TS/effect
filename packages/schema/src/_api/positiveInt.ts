// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import type { Int } from "./int"
import { int } from "./int"
import type { Positive, PositiveBrand } from "./positive"
import { positive } from "./positive"

export const positiveIntIdentifier = Symbol.for("@effect-ts/schema/ids/positiveInt")

export const positiveInt: S.Schema<
  unknown,
  S.CompositionE<
    | S.PrevE<
        S.CompositionE<
          | S.PrevE<S.RefinementE<S.LeafE<S.ParseNumberE>>>
          | S.NextE<S.RefinementE<S.LeafE<S.InvalidIntegerE>>>
        >
      >
    | S.NextE<S.RefinementE<S.LeafE<S.PositiveE>>>
  >,
  Int & PositiveBrand,
  number,
  S.CompositionE<
    | S.PrevE<S.RefinementE<S.LeafE<S.InvalidIntegerE>>>
    | S.NextE<S.RefinementE<S.LeafE<S.PositiveE>>>
  >,
  Int & PositiveBrand,
  number,
  {}
> = pipe(
  int,
  positive,
  S.arbitrary((FC) => FC.integer({ min: 1 }).map((_) => _ as Int & Positive)),
  S.mapApi(() => ({})),
  S.identified(positiveIntIdentifier, {})
)
