export {}

declare global {
  namespace jest {
    interface Matchers<T> {
      equals(b: unknown): void
    }
  }
}
