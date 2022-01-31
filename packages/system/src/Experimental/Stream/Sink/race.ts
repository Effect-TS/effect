// ets_tracing: off

import * as E from "../../../Either/index.js"
import { identity } from "../../../Function/index.js"
import type * as C from "./core.js"
import * as Map from "./map.js"
import * as RaceBoth from "./raceBoth.js"

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function race_<R, R1, InErr, InErr1, In, In1, OutErr, OutErr1, L, L1, Z, Z1>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): C.Sink<R1 & R, InErr & InErr1, In & In1, OutErr | OutErr1, L | L1, Z | Z1> {
  return Map.map_(RaceBoth.raceBoth_(self, that), E.fold(identity, identity))
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function race<R1, InErr1, In1, OutErr1, L1, Z1>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, In, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    race_(self, that)
}
