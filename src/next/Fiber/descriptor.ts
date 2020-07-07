import * as S from "../../Set"
import { Exit } from "../Exit/exit"
import { Scope } from "../Scope"

import { FiberID } from "./id"
import { InterruptStatus } from "./interruptStatus"
import { Status } from "./status"

/**
 * A record containing information about a `Fiber`.
 *
 * @param id            The fiber's unique identifier
 * @param interruptors  The set of fibers attempting to interrupt the fiber or its ancestors.
 * @param children      The fiber's forked children.
 */
export class Descriptor {
  constructor(
    readonly id: FiberID,
    readonly status: Status,
    readonly interruptors: S.Set<FiberID>,
    readonly interruptStatus: InterruptStatus,
    readonly scope: Scope<Exit<any, any>>
  ) {}
}
