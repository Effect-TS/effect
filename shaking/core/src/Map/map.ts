import * as RM from "../Readonly/Map/map"

export const map: <A, B>(
  f: (a: A) => B
) => <E>(fa: Map<E, A>) => Map<E, B> = RM.map as any
