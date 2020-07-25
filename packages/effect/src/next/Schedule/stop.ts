import { recurs } from "./recurs"
import { unit } from "./unit"

export const stop = unit(recurs(0))
