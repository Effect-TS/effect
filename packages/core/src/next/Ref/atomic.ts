import * as O from "../../Option"
import { Sync } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"

import { Atomic } from "./XRef"

export const getAndSet = <A>(a: A) => (self: Atomic<A>): Sync<A> =>
  effectTotal(() => {
    const v = self.value.get
    self.value.set(a)
    return v
  })

export const getAndUpdate = <A>(f: (a: A) => A) => (self: Atomic<A>): Sync<A> =>
  effectTotal(() => {
    const v = self.value.get
    self.value.set(f(v))
    return v
  })

export const getAndUpdateSome = <A>(f: (a: A) => O.Option<A>) => (
  self: Atomic<A>
): Sync<A> =>
  effectTotal(() => {
    const v = self.value.get
    const o = f(v)
    if (o._tag === "Some") {
      self.value.set(o.value)
    }
    return v
  })

export const modify = <A, B>(f: (a: A) => [B, A]) => (self: Atomic<A>): Sync<B> =>
  effectTotal(() => {
    const v = self.value.get
    const o = f(v)
    self.value.set(o[1])
    return o[0]
  })

export const modifySome = <B>(def: B) => <A>(f: (a: A) => O.Option<[B, A]>) => (
  self: Atomic<A>
): Sync<B> =>
  effectTotal(() => {
    const v = self.value.get
    const o = f(v)

    if (o._tag === "Some") {
      self.value.set(o.value[1])
      return o.value[0]
    }

    return def
  })

export const update = <A>(f: (a: A) => A) => (self: Atomic<A>): Sync<void> =>
  effectTotal(() => {
    self.value.set(f(self.value.get))
  })

export const updateAndGet = <A>(f: (a: A) => A) => (self: Atomic<A>): Sync<A> => {
  return effectTotal(() => {
    self.value.set(f(self.value.get))
    return self.value.get
  })
}

export const updateSome = <A>(f: (a: A) => O.Option<A>) => (
  self: Atomic<A>
): Sync<void> =>
  effectTotal(() => {
    const o = f(self.value.get)

    if (o._tag === "Some") {
      self.value.set(o.value)
    }
  })

export const updateSomeAndGet = <A>(f: (a: A) => O.Option<A>) => (
  self: Atomic<A>
): Sync<A> => {
  return effectTotal(() => {
    const o = f(self.value.get)

    if (o._tag === "Some") {
      self.value.set(o.value)
    }

    return self.value.get
  })
}

export const unsafeUpdate = <A>(f: (a: A) => A) => (self: Atomic<A>) => {
  self.value.set(f(self.value.get))
}
