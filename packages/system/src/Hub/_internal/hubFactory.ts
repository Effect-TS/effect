// tracing: off

import "../../Operator"

import { BoundedHubArb } from "./BoundedHubArb"
import { BoundedHubPow2 } from "./BoundedHubPow2"
import { BoundedHubSingle } from "./BoundedHubSingle"
import { ensureCapacity } from "./errors"
import type { Hub } from "./Hub"
import { UnboundedHub } from "./UnboundedHub"

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

export * from "./Hub"
