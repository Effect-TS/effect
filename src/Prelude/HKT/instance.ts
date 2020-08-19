export type Ignores = "F" | "G" | "CommutativeBoth" | "CommutativeEither" | "C"

export const instance = <T>(_: Omit<T, Ignores>): T => _ as any
