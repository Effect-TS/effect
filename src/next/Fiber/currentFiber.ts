import { AtomicReference } from "../Support/AtomicReference"

import { FiberContext } from "./context"

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null)
