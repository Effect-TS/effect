/**
 * @since 1.0.0
 */
import { filterWith } from "@fp-ts/schema/data/filterWith"
import type { Decoder } from "@fp-ts/schema/Decoder"

/**
 * @since 1.0.0
 */
export const filter = <B>(
  id: unknown,
  decode: Decoder<B, B>["decode"]
) => filterWith(id, () => decode)(null)
