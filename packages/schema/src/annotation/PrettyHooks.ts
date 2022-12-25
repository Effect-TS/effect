/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"

/**
 * @since 1.0.0
 */
export const TypeAliasHookId = "@fp-ts/schema/annotation/pretty/TypeAliasHook"

/**
 * @since 1.0.0
 */
export interface TypeAliasHook {
  readonly handler: (...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
}

/**
 * @since 1.0.0
 */
export const typeAliasHook = (
  handler: (...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
): TypeAliasHook => ({ handler })

/**
 * @since 1.0.0
 */
export const getTypeAliasHook = I.getAnnotation<TypeAliasHook>(TypeAliasHookId)
