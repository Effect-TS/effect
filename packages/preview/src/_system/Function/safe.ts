// from https://repl.it/@jamiedixon/safe-recur#index.js

export const recursive = <ARGS extends unknown[], Ret>(
  fn: (...args: ARGS) => Ret
): ((...args: ARGS) => Ret) => {
  let value: any = null
  let running = false
  const accumulated: any[] = []

  return new Proxy(fn, {
    apply(target, thisArg, args) {
      accumulated.push(args)

      if (running) {
        return
      }

      running = true

      while (accumulated.length) {
        value = Reflect.apply(target, thisArg, accumulated.shift())
      }

      running = false

      return value
    }
  })
}
