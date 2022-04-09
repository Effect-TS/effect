export class RingBuffer<T> {
  private values = new DoublyLinkedList<T>();
  private ignored = 0;

  constructor(readonly size: number, readonly ignoreFn?: Predicate<T>) {}

  push(value: T) {
    if (this.values.length - this.ignored >= this.size) {
      this.values.shift();
    }
    this.values.add(value);
    if (this.ignoreFn && this.ignoreFn(value)) {
      this.ignored++;
    }
    return this.values;
  }

  pop() {
    const popped = this.values.pop();
    if (popped && this.ignoreFn && this.ignoreFn(popped)) {
      this.ignored--;
    }
    return this.values;
  }

  toChunk(): Chunk<T> {
    const chunk = Chunk.builder<T>();
    this.values.forEach((t) => {
      chunk.append(t);
    });
    return chunk.build();
  }

  toChunkReversed(): Chunk<T> {
    return Chunk.from(this.toChunk().reverse());
  }
}
