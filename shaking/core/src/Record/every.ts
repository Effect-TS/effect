import type { Predicate } from "fp-ts/lib/function"

import { every as every_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export const every: <A>(
  predicate: Predicate<A>
) => (r: Record<string, A>) => boolean = every_1
