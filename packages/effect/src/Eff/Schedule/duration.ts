import { elapsed } from "./elapsed"
import { untilOutput_ } from "./untilOutput"

export const duration = (duration: number) => untilOutput_(elapsed, (n) => n > duration)
