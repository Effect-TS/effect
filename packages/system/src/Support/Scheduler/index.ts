import { LinkedList } from "../LinkedList"

export class Scheduler {
  running = false

  array = new LinkedList<() => void>()

  isRunning = (): boolean => this.running

  setImmediate(thunk: () => void) {
    const handle = setImmediate(() => this.dispatch(thunk))
    return () => {
      clearImmediate(handle)
    }
  }

  setImmediatePromise(thunk: () => void) {
    let cancelled = false
    Promise.resolve(thunk).then((t) => {
      if (!cancelled) {
        t()
      }
    })
    return () => {
      cancelled = true
    }
  }

  dispatchFn =
    typeof setImmediate === "function"
      ? (thunk: () => void) => this.setImmediate(thunk)
      : (thunk: () => void) => this.setImmediatePromise(thunk)

  run(): void {
    this.running = true
    let next = this.array.deleteHead()?.value

    while (next) {
      next()
      next = this.array.deleteHead()?.value
    }
    this.running = false
  }

  dispatch(thunk: () => void): void {
    this.array.append(thunk)

    if (!this.running) {
      this.run()
    }
  }

  dispatchLater(thunk: () => void): () => void {
    return this.dispatchFn(thunk)
  }
}

export const defaultScheduler: Scheduler = (() => new Scheduler())()
