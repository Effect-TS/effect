// tracing: off

import { accessCallTrace, traceCall } from "@effect-ts/tracing-utils"

import { NoSuchElementException } from "../GlobalExceptions"
import * as O from "../Option"
import { succeed } from "./core"
import type { IO } from "./effect"
import { fail } from "./fail"

/**
 * Lifts an Option into an Effect, if the option is not defined it fails with NoSuchElementException.
 *
 * @trace call
 */
export function getOrFail<A>(v: O.Option<A>): IO<NoSuchElementException, A> {
  const trace = accessCallTrace()
  return O.fold_(v, () => traceCall(fail, trace)(new NoSuchElementException()), succeed)
}

/**
 * Lifts an Option into a IO, if the option is not defined it fails with Unit.
 *
 * @trace call
 */
export function getOrFailUnit<A>(v: O.Option<A>): IO<void, A> {
  const trace = accessCallTrace()
  return O.fold_(
    v,
    () => traceCall(fail, trace)(undefined),
    (a) => succeed(a)
  )
}
