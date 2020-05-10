/**
 * @since 2.0.0
 */
export function absurd<A>(_: never): A {
  throw new Error("Called `absurd` function which should be uncallable")
}
