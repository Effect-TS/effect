import * as RR from "../Readonly/Record"

export const toArray: <K extends string, A>(
  r: Record<K, A>
) => Array<[K, A]> = RR.toReadonlyArray as any
