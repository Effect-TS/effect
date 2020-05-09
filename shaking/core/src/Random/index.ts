import {
  random as randomIO,
  randomBool as randomBoolIO,
  randomInt as randomIntIO,
  randomRange as randomRangeIO
} from "fp-ts/lib/Random"

import { sync } from "../Effect"

export const random = sync(randomIO)

export const randomBool = sync(randomBoolIO)

export const randomInt = (low: number, high: number) => sync(randomIntIO(low, high))

export const randomRange = (low: number, high: number) => sync(randomRangeIO(low, high))
