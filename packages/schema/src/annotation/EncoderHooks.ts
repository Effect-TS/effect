/**
 * @since 1.0.0
 */
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const TypeAliasHookId = "@fp-ts/schema/annotation/encoder/TypeAliasHook"

/**
 * @since 1.0.0
 */
export interface TypeAliasHook {
  readonly handler: (...typeParameters: ReadonlyArray<Encoder<any, any>>) => Encoder<any, any>
}

/**
 * @since 1.0.0
 */
export const typeAliasHook = (
  handler: (...typeParameters: ReadonlyArray<Encoder<any, any>>) => Encoder<any, any>
): TypeAliasHook => ({ handler })

/**
 * @since 1.0.0
 */
export const getTypeAliasHook = I.getAnnotation<TypeAliasHook>(TypeAliasHookId)
