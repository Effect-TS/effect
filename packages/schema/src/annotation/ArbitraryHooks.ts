/**
 * @since 1.0.0
 */
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const TypeAliasHookId = "@fp-ts/schema/annotation/arbitrary/TypeAliasHook"

/**
 * @since 1.0.0
 */
export interface TypeAliasHook {
  readonly handler: (...typeParameters: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
}

/**
 * @since 1.0.0
 */
export const typeAliasHook = (
  handler: (...typeParameters: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
): TypeAliasHook => ({ handler })

/**
 * @since 1.0.0
 */
export const getTypeAliasHook = I.getAnnotation<TypeAliasHook>(TypeAliasHookId)
