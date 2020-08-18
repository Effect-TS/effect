export type Ignores = "F" | "G"

export const instance = <T>(_: Omit<T, Ignores>): T => _ as any
