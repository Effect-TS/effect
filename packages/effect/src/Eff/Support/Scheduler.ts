import { LinkedList } from "./LinkedList"

export class Scheduler {
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

  dispatchLater<A>(thunk: (a: A) => void, a: A, ms: number): () => void {
    const handle = setTimeout(() => this.dispatch(thunk, a), ms)
    return () => {
      clearTimeout(handle)
    }
  }
}

export const defaultScheduler: Scheduler =
  /*#__PURE__*/
  (() => new Scheduler())()
