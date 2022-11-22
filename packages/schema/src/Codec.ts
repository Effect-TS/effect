/**
 * @since 1.0.0
 */

import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import * as I from "@fp-ts/codec/internal/common"
import type { Schema } from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const CodecId = I.CodecId

/**
 * @since 1.0.0
 */
export interface Codec<in out S, in out A> extends Schema<A>, Decoder<S, A>, Encoder<S, A> {}
