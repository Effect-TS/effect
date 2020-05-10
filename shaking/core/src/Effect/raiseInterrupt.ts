import { interrupt } from "../Exit"
import { Sync } from "../Support/Common/effect"

import { raised } from "./raised"

/**
 * An IO that is already interrupted
 */
export const raiseInterrupt: Sync<never> = raised(interrupt)
