/**
 * @since 1.0.0
 */
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const TypeAliasHookId = "@fp-ts/schema/annotation/guard/TypeAliasHook"

/**
 * @since 1.0.0
 */
export interface TypeAliasHook {
  readonly handler: (...typeParameters: ReadonlyArray<Guard<any>>) => Guard<any>
}

/**
 * @since 1.0.0
 */
export const typeAliasHook = (
  handler: (...typeParameters: ReadonlyArray<Guard<any>>) => Guard<any>
): TypeAliasHook => ({ handler })

/**
 * @since 1.0.0
 */
export const getTypeAliasHook = I.getAnnotation<TypeAliasHook>(TypeAliasHookId)
