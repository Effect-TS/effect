export class WeakReference<A> {
  private value: A | undefined = undefined
  constructor(value: A) {
    this.value = value
  }

  deref(): A | undefined {
    return this.value
  }

  clear() {
    this.value = undefined
  }
}
