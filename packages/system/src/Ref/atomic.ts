// ets_tracing: off

import type * as Tp from "../Collections/Immutable/Tuple/index.js"
import { succeedWith } from "../Effect/core.js"
import type { UIO } from "../Effect/effect.js"
import type * as O from "../Option/index.js"
import type { Atomic } from "./XRef.js"

export function getAndSet<A>(self: Atomic<A>, a: A): UIO<A> {
  return succeedWith(() => {
    const v = self.value.get
    self.value.set(a)
    return v
  })
}

export function getAndUpdate<A>(self: Atomic<A>, f: (a: A) => A): UIO<A> {
  return succeedWith(() => {
    const v = self.value.get
    self.value.set(f(v))
    return v
  })
}

export function getAndUpdateSome<A>(self: Atomic<A>, f: (a: A) => O.Option<A>): UIO<A> {
  return succeedWith(() => {
    const v = self.value.get
    const o = f(v)
    if (o._tag === "Some") {
      self.value.set(o.value)
    }
    return v
  })
}

export function modify<A, B>(self: Atomic<A>, f: (a: A) => Tp.Tuple<[B, A]>): UIO<B> {
  return succeedWith(() => {
    const v = self.value.get
    const o = f(v)
    self.value.set(o.get(1))
    return o.get(0)
  })
}

export function modifySome<A, B>(
  self: Atomic<A>,
  def: B,
  f: (a: A) => O.Option<Tp.Tuple<[B, A]>>
) {
  return succeedWith(() => {
    const v = self.value.get
    const o = f(v)

    if (o._tag === "Some") {
      self.value.set(o.value.get(1))
      return o.value.get(0)
    }

    return def
  })
}

export function update<A>(self: Atomic<A>, f: (a: A) => A): UIO<void> {
  return succeedWith(() => {
    self.value.set(f(self.value.get))
  })
}

export function updateAndGet<A>(self: Atomic<A>, f: (a: A) => A): UIO<A> {
  return succeedWith(() => {
    self.value.set(f(self.value.get))
    return self.value.get
  })
}

export function updateSome<A>(self: Atomic<A>, f: (a: A) => O.Option<A>): UIO<void> {
  return succeedWith(() => {
    const o = f(self.value.get)

    if (o._tag === "Some") {
      self.value.set(o.value)
    }
  })
}

export function updateSomeAndGet<A>(self: Atomic<A>, f: (a: A) => O.Option<A>): UIO<A> {
  return succeedWith(() => {
    const o = f(self.value.get)

    if (o._tag === "Some") {
      self.value.set(o.value)
    }

    return self.value.get
  })
}

export function unsafeUpdate<A>(self: Atomic<A>, f: (a: A) => A) {
  self.value.set(f(self.value.get))
}
