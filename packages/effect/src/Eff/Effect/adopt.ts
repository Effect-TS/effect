import { Fiber } from "../Fiber/fiber"

import { Sync } from "./effect"
import { IAdopt } from "./primitives"

/**
 * Returns an effect that adopts the specified fiber as a child of the fiber
 * running this effect. Note that adoption will succeed only if the specified
 * fiber is not a child of any other fiber.
 *
 * The returned effect will succeed with true if the fiber has been adopted,
 * and false otherwise.
 *
 * See also `disown`.
 */
export const adopt = (fiber: Fiber<any, any>): Sync<boolean> => new IAdopt(fiber)
