// copyright https://github.com/frptools

export class MappableIterator<T, U> implements IterableIterator<U> {
  private it: IterableIterator<T>

  constructor(private iterable: Iterable<T>, private map: (value: T) => U) {
    this.it = <IterableIterator<T>>this.iterable[Symbol.iterator]()
  }

  next(value?: any): IteratorResult<U> {
    const result = <IteratorResult<any>>this.it.next(value)
    if (result.done) {
      result.value = void 0
    } else {
      result.value = this.map(result.value)
    }
    return result
  }

  [Symbol.iterator](): IterableIterator<U> {
    return this
  }
}
