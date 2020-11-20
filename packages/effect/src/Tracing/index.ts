/**
 * Marks f with the specified trace
 */
export function traceF_<F extends Function>(f: F, _trace: string): F {
  const g = ((...args: any[]) => f(...args)) as any
  g["$trace"] = _trace
  return g
}

/**
 * Trace F as the first of inputs
 */
export function traceAs(...refs: any[]) {
  switch (arguments.length) {
    case 1: {
      return <F extends Function>(f: F): F => {
        if ("$trace" in refs[0]) {
          const g = ((...args: any[]) => f(...args)) as any
          g["$trace"] = refs[0]["$trace"]
          return g
        }
        return f
      }
    }
    default: {
      return <F extends Function>(f: F): F => {
        for (const r of refs) {
          if (r && "$trace" in r) {
            const g = ((...args: any[]) => f(...args)) as any
            g["$trace"] = r["$trace"]
            return g
          }
        }
        return f
      }
    }
  }
}
