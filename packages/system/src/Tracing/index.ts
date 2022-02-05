// ets_tracing: off

import { isTracingEnabled } from "./Global/index.js"

export const tracingSymbol = "$trace"

let currentTraceCall: string | undefined

export function traceCall<F extends Function>(f: F, trace: string | undefined): F {
  if (!isTracingEnabled() || !trace) {
    return f
  }
  // @ts-expect-error
  return (...args: any[]) => {
    currentTraceCall = trace
    const res = f(...args)
    currentTraceCall = undefined
    return res
  }
}

export function traceCallLast<A, B>(
  f: (a: A, __trace?: string) => B,
  __trace: string | undefined
): (a: A, __trace?: string) => B {
  return (a, t) => (t ? f(a, t) : f(a, __trace))
}

export function accessCallTrace(): string | undefined {
  if (!isTracingEnabled() || !currentTraceCall) {
    return undefined
  }
  const callTrace: any = currentTraceCall
  currentTraceCall = undefined
  return callTrace
}

export * from "./Global/index.js"
