import { isTracingEnabled } from "./Global"

let tmp: any

export function traceCall<F extends Function>(f: F, trace: any): F {
  if (!isTracingEnabled()) {
    return f
  }
  // @ts-expect-error
  return (...args: any[]) => {
    tmp = trace
    const res = f(...args)
    tmp = undefined
    return res
  }
}

export function accessCallTrace(): string | undefined {
  if (!isTracingEnabled() || !tmp) {
    return undefined
  }
  const traces: any = tmp
  tmp = undefined
  return traces
}

export function traceFrom<F extends Function>(g: string | undefined, f: F): F {
  if (!f["$trace"]) {
    if (g && isTracingEnabled()) {
      const h = (...args: any[]) => f(...args)
      h["$trace"] = g
      return h as any
    }
  }
  return f
}

export function traceAs<F extends Function>(g: any, f: F): F {
  if (g && g["$trace"] && isTracingEnabled()) {
    const h = (...args: any[]) => f(...args)
    h["$trace"] = g["$trace"]
    return h as any
  }
  return f
}

export * from "./Global"
