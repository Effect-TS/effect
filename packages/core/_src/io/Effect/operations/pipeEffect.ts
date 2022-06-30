/**
 * @tsplus operator effect/core/io/Effect /
 * @tsplus fluent effect/core/io/Effect apply
 * @tsplus fluent effect/core/io/Effect meteredWith
 * @tsplus macro pipe
 */
export function pipeEffect<A, B>(a: A, f: (a: A) => B): B {
  return f(a)
}
