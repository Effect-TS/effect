// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import * as Th from "../These"
import { refinement } from "./refinement"

export const numberIdentifier = Symbol.for("@effect-ts/schema/ids/number")

export const number: S.Schema<
  unknown,
  S.RefinementE<S.LeafE<S.ParseNumberE>>,
  number,
  number,
  never,
  number,
  number,
  {}
> = pipe(
  refinement(
    (u): u is number => typeof u === "number",
    (v) => S.leafE(S.parseNumberE(v))
  ),
  S.arbitrary((_) => _.double()),
  S.constructor((n: number) => Th.succeed(n)),
  S.encoder((_) => _),
  S.mapApi(() => ({})),
  S.identified(numberIdentifier, {})
)
