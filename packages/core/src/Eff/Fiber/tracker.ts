import { AtomicReference } from "../Support/AtomicReference"

import { FiberContext } from "./context"

export const currentFiber = new AtomicReference<FiberContext<any, any> | null>(null)

export const rootFibers = new Set<FiberContext<any, any>>()

export const track = (context: FiberContext<any, any>) => {
  if (context != null) {
    rootFibers.add(context)

    context.onDone(() => {
      rootFibers.delete(context)
    })
  }
}

export const untrack = (context: FiberContext<any, any>) => {
  return context != null ? rootFibers.delete(context) : false
}
