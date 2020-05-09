import { AsyncCancelContFn } from "../../Common"
import { LinkedList } from "../LinkedList"

/**
 * An interface for the IO system runtime.
 *
 * Allows dispatching arbitrary blocks of code immediately or after some delay
 */
export interface Runtime {
  /**
   * Dispatch a thunk immediately.
   *
   * The default runtime trampolines this dispatch to for stack safety.
   * @param thunk the action to execute
   */
  dispatch<A>(thunk: (a: A) => void, a: A): void

  /**
   * Dispatch a thunk after some amount of time has elapsed.
   *
   * Returns an actions that may be used to cancel execution.
   * The default runtime delegates to setTimeout.
   * @param thunk the action to execute
   * @param ms delay in milliseconds
   */
  dispatchLater<A>(thunk: (a: A) => void, a: A, ms: number): AsyncCancelContFn
}

class RuntimeImpl implements Runtime {
  running = false

  array = new LinkedList<[(a: any) => void, any]>()

  isRunning = (): boolean => this.running

  run(): void {
    this.running = true
    let next = this.array.deleteHead()?.value

    while (next) {
      next[0](next[1])
      next = this.array.deleteHead()?.value
    }
    this.running = false
  }

  dispatch<A>(thunk: (a: A) => void, a: A): void {
    this.array.append([thunk, a])

    if (!this.running) {
      this.run()
    }
  }

  dispatchLater<A>(thunk: (a: A) => void, a: A, ms: number): AsyncCancelContFn {
    const handle = setTimeout(() => this.dispatch(thunk, a), ms)
    return (cb) => {
      clearTimeout(handle)
      cb()
    }
  }
}

export const defaultRuntime: Runtime = new RuntimeImpl()
