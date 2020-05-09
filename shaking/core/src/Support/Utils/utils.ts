export function tuple2<A, B>(a: A, b: B): readonly [A, B] {
  return [a, b] as const
}

export function fst<A>(a: A): A {
  return a
}

export function snd<A, B>(_: A, b: B): B {
  return b
}
