/**
 * @tsplus operator ets/Effect /
 * @tsplus fluent ets/Effect apply
 * @tsplus fluent ets/Effect meteredWith
 * @tsplus macro pipe
 */
export function pipeEffect<A, B>(a: A, f: (a: A) => B): B {
  return f(a)
}
