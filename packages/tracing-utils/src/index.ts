import { isTracingEnabled } from "./Global"

export const tracingSymbol = "$trace"

export const traceFnForFile = (file: string) => <F extends Function>(
  f: F,
  t: string
): F => {
  if (f) f[tracingSymbol] = file + t
  return f
}

export function traceAs<F extends Function>(g: any, f: F): F {
  if (g[tracingSymbol] && isTracingEnabled()) {
    f[tracingSymbol] = g[tracingSymbol]
  }
  return f
}

export function traceCall<F extends Function>(call: F, trace: string): F {
  if (!isTracingEnabled()) {
    return call
  }
  const y = call[tracingSymbol]
  const g = ((...args: any[]) => {
    call[tracingSymbol] = trace
    const x = call(...args)
    call[tracingSymbol] = y
    return x
  }) as any
  g[tracingSymbol] = y
  return g
}

export * from "./Global"
