export function traceAs<F extends Function>(g: any, f: F): F {
  if (g["$trace"]) {
    f["$trace"] = g["$trace"]
  }
  return f
}
