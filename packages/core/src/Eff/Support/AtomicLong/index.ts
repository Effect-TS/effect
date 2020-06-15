export class AtomicLong {
  private current = 0 | 0

  getAndIncrement(): number {
    const ret = this.current

    this.current = ((this.current | 0) + (1 | 0)) | 0

    return ret
  }
}
