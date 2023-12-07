/** @internal */
export const internalize = <F extends (...args: Array<any>) => any>(f: F): F => {
  Object.defineProperty(f, "name", { value: "effect_cutpoint" })
  return f
}
