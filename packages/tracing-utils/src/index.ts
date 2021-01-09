import { isTracingEnabled } from "./Global"

export function traceCall<F extends Function>(f: F, trace: any): F {
  if (!isTracingEnabled()) {
    return f
  }
  // @ts-expect-error
  return (...args: any[]) => {
    f["$traceCall"] = trace
    const res = f(...args)
    delete f["$traceCall"]
    return res
  }
}

const empty: string[] = []

export function accessTraces<ARGS extends readonly any[], B>(
  f: (...args: ARGS) => B
): string[] {
  if (!isTracingEnabled() || !f["$traceCall"]) {
    return empty
  }
  const traces: any[] = f["$traceCall"]
  delete f["$traceCall"]
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
