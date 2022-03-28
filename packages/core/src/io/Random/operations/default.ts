import { Random } from "../definition"

/**
 * @tsplus static ets/RandomOps default
 */
export const defaultRandom = Random.live((Math.random() * 4294967296) >>> 0)
