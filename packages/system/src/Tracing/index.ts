import { identity } from "../Function"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { AtomicNumber } from "../Support/AtomicNumber"

export const reg = /(\/|\\)(.*?):(\d+):(\d+)/

export const globalTracingEnabled = new AtomicBoolean(true)
export const globalTracesQuantity = new AtomicNumber(100)

export class ExecutionTrace {
  constructor(readonly file: string, readonly op: string) {}
}

export function traceWith(name: string) {
  if (globalTracingEnabled.get) {
    const line = new Error()?.stack?.split("\n")?.[5]

    if (line) {
      const ref = reg.exec(line)

      if (ref) {
        return <X>(x: X) => {
          if ("$trace" in x) {
            return x
          }
          x["$trace"] = new ExecutionTrace(`/${ref[2]}:${ref[3]}:${ref[4]}`, name)
          return x
        }
      }
    }
  }
  return identity
}

export function traceFrom<F>(f: F) {
  return <G>(g: G): G => {
    if (globalTracingEnabled.get && "$trace" in f) {
      g["$trace"] = f["$trace"]
    }
    return g
  }
}

export function traceF(f: () => <A>(a: A) => A): <A>(a: A) => A {
  if (globalTracingEnabled.get) {
    return f()
  }
  return identity
}
