export class MockStorage implements Storage {
  [name: string]: any

  get length() {
    return this.st.length
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(private st: Array<[string, string]>) {}

  clear(): void {
    this.st = []
  }
  getItem(key: string): string | null {
    return this.st.find((x) => x[0] === key)?.[1] || null
  }
  key(index: number): string | null {
    return this.st[index]?.[0]
  }
  removeItem(key: string): void {
    const i = this.st.findIndex((x) => x[0] === key)

    if (i >= 0) {
      this.st = this.st.filter((_, i2) => i2 !== i)
    }
  }
  setItem(key: string, value: string): void {
    this.st.push([key, value])
  }
}
