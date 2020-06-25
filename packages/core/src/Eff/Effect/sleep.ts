import { sleep as clockSleep } from "../Clock"

/**
 * Sleeps for `ms` milliseconds
 */
export const sleep = (ms: number) => clockSleep(ms)
