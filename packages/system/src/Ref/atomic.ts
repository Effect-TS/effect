// tracing: off

import { succeedWith } from "../Effect/core"
import type { UIO } from "../Effect/effect"
import type * as O from "../Option"
import type { Atomic } from "./XRef"

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

export function modify<A, B>(self: Atomic<A>, f: (a: A) => readonly [B, A]): UIO<B> {
  return succeedWith(() => {
    const v = self.value.get
    const o = f(v)
    self.value.set(o[1])
    return o[0]
  })
}

export function modifySome<A, B>(
  self: Atomic<A>,
  def: B,
  f: (a: A) => O.Option<readonly [B, A]>
) {
  return succeedWith(() => {
    const v = self.value.get
    const o = f(v)

    if (o._tag === "Some") {
      self.value.set(o.value[1])
      return o.value[0]
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
