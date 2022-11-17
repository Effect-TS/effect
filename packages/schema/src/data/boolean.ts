/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Annotation"
import * as internal from "@fp-ts/codec/internal/Schema"
import type * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<boolean> = internal.declare([
  A.makeNameAnnotation("@fp-ts/codec/data/boolean")
])
