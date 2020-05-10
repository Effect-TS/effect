import { identity } from "./identity"

/**
 * @since 2.0.0
 */
export const unsafeCoerce: <A, B>(a: A) => B = identity as any
