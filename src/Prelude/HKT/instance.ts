/**
 * @since 1.0.0
 */
export type Ignores = "F" | "G" | "CommutativeBoth" | "CommutativeEither"

/**
 * @since 1.0.0
 */
export const instance = <T>(_: Omit<T, Ignores>): T => _ as any
