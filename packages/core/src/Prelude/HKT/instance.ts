export type Ignores =
  | "F"
  | "G"
  | "CommutativeBoth"
  | "CommutativeEither"
  | "AssociativeCompose"
  | "C"
  | "CF"
  | "CG"

export const instance = <T>(_: Omit<T, Ignores>): T => _ as any
