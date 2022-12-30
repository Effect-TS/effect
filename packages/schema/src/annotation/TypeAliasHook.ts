/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export interface TypeAliasHook<A> {
  readonly handler: (...typeParameters: ReadonlyArray<A>) => A
}

/**
 * @since 1.0.0
 */
export const typeAliasHook = (
  handler: (...typeParameters: ReadonlyArray<any>) => any
): TypeAliasHook<any> => ({ handler })

/**
 * @since 1.0.0
 */
export const getTypeAliasHook = I.getAnnotation

/**
 * @since 1.0.0
 */
export const ArbitraryTypeAliasHookId = "@fp-ts/schema/annotation/ArbitraryTypeAliasHookId"

/**
 * @since 1.0.0
 */
export const DecoderTypeAliasHookId = "@fp-ts/schema/annotation/DecoderTypeAliasHookId"

/**
 * @since 1.0.0
 */
export const EncoderTypeAliasHookId = "@fp-ts/schema/annotation/EncoderTypeAliasHookId"

/**
 * @since 1.0.0
 */
export const GuardTypeAliasHookId = "@fp-ts/schema/annotation/GuardTypeAliasHookId"

/**
 * @since 1.0.0
 */
export const PrettyTypeAliasHookId = "@fp-ts/schema/annotation/PrettyTypeAliasHookId"
