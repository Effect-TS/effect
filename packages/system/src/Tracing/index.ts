import { identity } from "../Function"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { AtomicNumber } from "../Support/AtomicNumber"
import { parse } from "./parse"

export const globalTracingEnabled = new AtomicBoolean(true)
export const globalTracesQuantity = new AtomicNumber(100)

export class ExecutionTrace {
  constructor(readonly file: string, readonly op: string) {}
}

export function traceWith(name: string) {
  if (globalTracingEnabled.get) {
    const stack = new Error()?.stack

    if (stack) {
      const trace = parse(stack)[4]
      if (trace && trace.file && trace.lineNumber && trace.column) {
        return <X extends Function>(x: X): X => {
          if ("$trace" in x) {
            return x
          }
          const f = (...args: any[]) => x(...args)
          f["$trace"] = new ExecutionTrace(
            `${trace.file}:${trace.lineNumber}:${trace.column}`,
            name
          )
          return f as any
        }
      }
      return identity
    }
    return identity
  }
  return identity
}

export function traceFrom<F extends Function>(f: F) {
  return <G extends Function>(g: G): G => {
    if (globalTracingEnabled.get && "$trace" in f) {
      g["$trace"] = f["$trace"]
    }
    return g
  }
}

export function traceF(
  f: () => <A extends Function>(a: A) => A
): <A extends Function>(a: A) => A {
  if (globalTracingEnabled.get) {
    return f()
  }
  return identity
}

export { parse as parseStackTrace } from "./parse"
