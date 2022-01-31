// ets_tracing: off

import "../../Operator/index.js"

import { BoundedHubArb } from "./BoundedHubArb.js"
import { BoundedHubPow2 } from "./BoundedHubPow2.js"
import { BoundedHubSingle } from "./BoundedHubSingle.js"
import { ensureCapacity } from "./errors.js"
import type { Hub } from "./Hub.js"
import { UnboundedHub } from "./UnboundedHub.js"

function nextPow2(n: number): number {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2.0))

  return Math.max(Math.pow(2, nextPow), 2)
}

export function makeBounded<A>(requestedCapacity: number): Hub<A> {
  ensureCapacity(requestedCapacity)

  if (requestedCapacity === 1) {
    return new BoundedHubSingle()
  } else if (nextPow2(requestedCapacity) === requestedCapacity) {
    return new BoundedHubPow2(requestedCapacity)
  } else {
    return new BoundedHubArb(requestedCapacity)
  }
}

export function makeUnbounded<A>(): Hub<A> {
  return new UnboundedHub()
}

export * from "./Hub.js"
