// ets_tracing: off

import type * as Fiber from "../../Fiber"
import type { UIO } from "../definition"
import { descriptorWith } from "./descriptorWith"
import { succeedNow } from "./succeedNow"

/**
 * Returns information about the current fiber, such as its identity.
 */
export const descriptor: UIO<Fiber.Descriptor> = descriptorWith(succeedNow)
