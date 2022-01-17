import "../../Operator"

export class AtomicReferenceArray<A> {
  private inner: Array<A>

  constructor(length: number) {
    this.inner = new Array(length)
  }

  get length(): number {
    return this.inner.length
  }

  get(i: number): A | undefined {
    return this.inner[i]
  }

  set(i: number, newValue: A): void {
    this.inner[i] = newValue
  }

  getAndGet(i: number, newValue: A): A | undefined {
    const ret = this.get(i)
    this.set(i, newValue)
    return ret
  }

  compareAndSet(i: number, expect: A, update: A): boolean {
    if (this.get(i) !== expect) {
      return false
    }
    this.set(i, update)
    return true
  }
}
