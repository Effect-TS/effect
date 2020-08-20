export type Excludes =
  | "URI"
  | "TL0"
  | "TL1"
  | "TL2"
  | "TL3"
  | "CommutativeBoth"
  | "CommutativeEither"
  | "Derive"

export function instance<K>(_: Omit<K, Excludes>): K {
  return _ as any
}
