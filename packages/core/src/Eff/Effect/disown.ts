import { Fiber } from "../Fiber/fiber"

import { Sync } from "./effect"
import { IDisown } from "./primitives"

/**
 * Disowns the specified fiber, which means that when this fiber exits, the
 * specified fiber will not be interrupted. Disowned fibers become new root
 * fibers, and are not terminated automatically when any other fibers ends.
 */
export const disown = (fiber: Fiber<any, any>): Sync<boolean> => new IDisown(fiber)
