import { map_, sync, Sync } from "../Effect"

export const random: Sync<number> = sync(() => Math.random())

export const randomBool: Sync<boolean> = map_(random, (n) => n < 0.5)

export const randomInt = (low: number, high: number): Sync<number> =>
  map_(random, (n) => Math.floor((high - low + 1) * n + low))

export const randomRange = (min: number, max: number): Sync<number> =>
  map_(random, (n) => (max - min) * n + min)
