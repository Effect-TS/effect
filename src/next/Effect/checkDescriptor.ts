import { Descriptor } from "../Fiber/descriptor"

import { Effect } from "./effect"
import { IDescriptor } from "./primitives"

/**
 * Constructs an effect based on information about the current fiber, such as
 * its identity.
 */
export const checkDescriptor = <S, R, E, A>(
  f: (_: Descriptor) => Effect<S, R, E, A>
): Effect<S, R, E, A> => new IDescriptor(f)
