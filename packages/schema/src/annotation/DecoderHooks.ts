/**
 * @since 1.0.0
 */
import type { Decoder } from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const TypeAliasHookId = "@fp-ts/schema/annotation/decoder/TypeAliasHook"

/**
 * @since 1.0.0
 */
export interface TypeAliasHook {
  readonly handler: (
    ...typeParameters: ReadonlyArray<Decoder<unknown, any>>
  ) => Decoder<unknown, any>
}

/**
 * @since 1.0.0
 */
export const typeAliasHook = (
  handler: (...typeParameters: ReadonlyArray<Decoder<unknown, any>>) => Decoder<unknown, any>
): TypeAliasHook => ({ handler })

/**
 * @since 1.0.0
 */
export const getTypeAliasHook = I.getAnnotation<TypeAliasHook>(TypeAliasHookId)
