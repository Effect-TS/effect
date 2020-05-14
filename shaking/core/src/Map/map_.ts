import * as RM from "../Readonly/Map/map_"

export const map_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => B
) => Map<E, B> = RM.map_ as any
