import { map_ as map__1 } from "../Readonly/Record"

export const map_: <A, B>(
  fa: Record<string, A>,
  f: (a: A) => B
) => Record<string, B> = map__1
