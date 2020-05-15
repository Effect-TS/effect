import type { Eq } from "../Eq"
import { elem as elem_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export const elem: <A>(E: Eq<A>) => (a: A, fa: Record<string, A>) => boolean = elem_1
