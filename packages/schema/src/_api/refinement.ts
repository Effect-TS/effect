// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import type { Refinement } from "@effect-ts/core/Function"
import { pipe } from "@effect-ts/core/Function"

import type { RefinementE } from "../_schema/error"
import { mapConstructorError, mapParserError, refine } from "../_schema/primitives"
import type { Schema } from "../_schema/schema"
import { unknown } from "./unknown"

export function refinement<E, NewParsedShape>(
  refinement: Refinement<unknown, NewParsedShape>,
  error: (value: unknown) => E
): Schema<
  unknown,
  RefinementE<E>,
  NewParsedShape,
  unknown,
  RefinementE<E>,
  NewParsedShape,
  unknown,
  {}
> {
  return pipe(
    unknown,
    refine(refinement, error),
    mapParserError((e) => Chunk.unsafeHead(e.errors).error),
    mapConstructorError((e) => Chunk.unsafeHead(e.errors).error)
  )
}
