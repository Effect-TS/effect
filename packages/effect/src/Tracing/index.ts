import type { Effect } from "../Effect"
import { ISuspend } from "../Effect/primitives"

/**
 * Marks f with the specified trace
 */
export function traceF_<F extends Function>(f: F, _trace?: string): F {
  if (_trace) {
    if ("$trace" in f) {
      return f
    }
    const g = ((...args: any[]) => f(...args)) as any
    g["$trace"] = _trace
    return g
  }
  return f
}

/**
 * Trace F as the first of inputs
 */
export function traceAs<F extends Function>(f: F, ...refs: any[]): F {
  switch (arguments.length) {
    case 2: {
      if (refs[0] && "$trace" in refs[0]) {
        const g = ((...args: any[]) => f(...args)) as any
        g["$trace"] = refs[0]["$trace"]
        return g
      }
      return f
    }
    default: {
      let trace: undefined | string = undefined
      for (let i = 0; i < refs.length; i++) {
        if (refs[i] && "$trace" in refs[i]) {
          trace = refs[i]["$trace"]
          i = refs.length
        }
      }
      if (trace) {
        const g = ((...args: any[]) => f(...args)) as any
        g["$trace"] = trace
        return g
      }
      return f
    }
  }
}

/**
 * Trace self using suspend
 */
export function traceSuspend<R, E, A>(self: Effect<R, E, A>, trace: string) {
  return new ISuspend(traceF_(() => self, trace))
}

export const traceSym = Symbol()

/**
 * Represent T + trace
 */
export class Traced<T> {
  readonly _sym = traceSym
  constructor(readonly value: T, readonly trace: string) {}
}

/**
 * Create a traced value if not already traced
 */
export function traceReplace<T>(
  value: T,
  trace: string
): [T] extends [Traced<infer X>] ? X : T {
  return (value && value["_sym"] === traceSym ? value : new Traced(value, trace)) as any
}

export function foldTraced_<T, A>(k: T, f: (t: T, _trace?: string) => A): A {
  if (k && k["_sym"] === traceSym) {
    return f(k["value"], k["trace"])
  }
  return f(k)
}

/**
 * Trace F as the first of inputs via binding
 */
export function traceAsBind<F extends Function>(f: F, ...refs: any[]): F {
  switch (arguments.length) {
    case 2: {
      if (refs[0] && "$trace" in refs[0]) {
        return f.bind({ $trace: refs[0]["$trace"] })
      }
      return f
    }
    default: {
      let trace: undefined | string = undefined
      for (let i = 0; i < refs.length; i++) {
        if (refs[i] && "$trace" in refs[i]) {
          trace = refs[i]["$trace"]
          i = refs.length
        }
      }
      if (trace) {
        return f.bind({ $trace: trace })
      }
      return f
    }
  }
}
