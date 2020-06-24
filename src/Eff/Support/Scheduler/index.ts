import { LinkedList } from "../LinkedList"

export class Scheduler {
  running = false

  array = new LinkedList<() => void>()

  isRunning = (): boolean => this.running

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

  dispatchLater(thunk: () => void, ms: number): () => void {
    const handle = setTimeout(() => this.dispatch(thunk), ms)
    return () => {
      clearTimeout(handle)
    }
  }
}

export const defaultScheduler: Scheduler =
  /*#__PURE__*/
  (() => new Scheduler())()
