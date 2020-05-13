import { sync, Sync } from "../Effect"

export const random: Sync<number> = sync(() => Math.random())
