export function traceAs<F extends Function>(g: any, f: F): F {
  if (g["$trace"]) {
    f["$trace"] = g["$trace"]
  }
  return f
}

const traces = new Map<string, string>()

export function traceCall<T>(call: () => T, name: string, trace: string) {
  traces.set(name, trace)
  const x = call()
  traces.delete(name)
  return x
}

export function traceAsFrom<F extends Function>(
  name: string,
  g: any,
  f: F,
  clean = true
): F {
  const x = traces.get(name)
  if (x) {
    f["$trace"] = x
    if (clean) {
      traces.delete(name)
    }
  } else if (g["$trace"]) {
    f["$trace"] = g["$trace"]
  }
  return f
}

export function traceFrom<F extends Function>(name: string, f: F, clean = true): F {
  const x = traces.get(name)
  if (x) {
    f["$trace"] = x
    if (clean) {
      traces.delete(name)
    }
  }
  return f
}

export function accessCallTrace(name: string, clean = true) {
  const x = traces.get(name)

  if (clean) {
    traces.delete(name)
  }

  if (x) {
    return x
  }

  return undefined
}

export * from "./Global"
