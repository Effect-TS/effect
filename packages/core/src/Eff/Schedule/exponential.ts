import { forever } from "./forever"
import { fromDelays } from "./fromDelays"
import { map_ } from "./map_"

export const exponential = (base: number, factor = 2.0) =>
  fromDelays(map_(forever, (i) => base * Math.pow(factor, i)))
