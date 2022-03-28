import type { AtomicHub } from "./AtomicHub"
import { BoundedHubArb } from "./BoundedHubArb"
import { BoundedHubPow2 } from "./BoundedHubPow2"
import { BoundedHubSingle } from "./BoundedHubSingle"
import { ensureCapacity } from "./errors"

function nextPow2(n: number): number {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2.0))

  return Math.max(Math.pow(2, nextPow), 2)
}

export function makeBounded<A>(requestedCapacity: number): AtomicHub<A> {
  ensureCapacity(requestedCapacity)

  if (requestedCapacity === 1) {
    return new BoundedHubSingle()
  } else if (nextPow2(requestedCapacity) === requestedCapacity) {
    return new BoundedHubPow2(requestedCapacity)
  } else {
    return new BoundedHubArb(requestedCapacity)
  }
}
