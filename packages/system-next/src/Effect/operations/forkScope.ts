// ets_tracing: off

import type { Scope } from "../../Scope"
import type { UIO } from "../definition"
import { IGetForkScope } from "../definition"
import { succeed } from "./succeed"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export const forkScope: UIO<Scope> = new IGetForkScope((_) => succeed(() => _))
