// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import { unknown } from "./unknown"

export const unknownArrayIdentifier = Symbol.for("@effect-ts/schema/ids/unknownArray")

export const unknownArray: S.Schema<
  unknown,
  S.RefinementE<S.LeafE<S.UnknownArrayE>>,
  readonly unknown[],
  unknown,
  S.RefinementE<S.LeafE<S.UnknownArrayE>>,
  readonly unknown[],
  readonly unknown[],
  {}
> = pipe(
  unknown,
  S.refine(
    (u): u is readonly unknown[] => Array.isArray(u),
    (val) => S.leafE(S.unknownArrayE(val))
  ),
  S.mapParserError((_) => Chunk.unsafeHead(_.errors).error),
  S.mapConstructorError((_) => Chunk.unsafeHead(_.errors).error),
  S.encoder((_) => _),
  S.identified(unknownArrayIdentifier, {})
)
