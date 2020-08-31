import { succeedNow } from "../../Managed"
import { end } from "../Pull"
import type { Sync } from "./definitions"
import { Stream } from "./definitions"

/**
 * The empty stream
 */
export const empty: Sync<never> = new Stream(succeedNow(end))
