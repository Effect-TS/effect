import { some as some_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export const some: <A>(
  predicate: (a: A) => boolean
) => (r: Record<string, A>) => boolean = some_1
