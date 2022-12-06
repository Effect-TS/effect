/**
 * @since 1.0.0
 */
import * as AST from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = I.makeSchema(AST.union([]))
