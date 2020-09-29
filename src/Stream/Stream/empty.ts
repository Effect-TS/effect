import { succeedNow } from "../../Managed"
import { end } from "../Pull"
import type { UIO } from "./definitions"
import { Stream } from "./definitions"

/**
 * The empty stream
 */
export const empty: UIO<never> = new Stream(succeedNow(end))
