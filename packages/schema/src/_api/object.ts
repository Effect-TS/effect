// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import * as Th from "../These"
import { refinement } from "./refinement"

export const objectIdentifier = Symbol.for("@effect-ts/schema/ids/object")

export const object: S.Schema<
  unknown,
  S.RefinementE<S.LeafE<S.ParseObjectE>>,
  {},
  {},
  never,
  {},
  {},
  {}
> = pipe(
  refinement(
    (u): u is {} => typeof u === "object" && u != null,
    (v) => S.leafE(S.parseObjectE(v))
  ),
  S.constructor((s: {}) => Th.succeed(s)),
  S.arbitrary((_) => _.object()),
  S.encoder((_) => _),
  S.mapApi(() => ({})),
  S.identified(objectIdentifier, {})
)
