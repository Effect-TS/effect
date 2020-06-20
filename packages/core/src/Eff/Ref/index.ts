import * as O from "../../Option"
import { Sync } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { AtomicReference } from "../Support/AtomicReference"

export interface Ref<A> {
  readonly get: Sync<A>
  readonly getAndSet: (a: A) => Sync<A>
  readonly getAndUpdate: (f: (a: A) => A) => Sync<A>
  readonly getAndUpdateSome: (f: (a: A) => O.Option<A>) => Sync<A>
  readonly modify: <B>(f: (a: A) => [B, A]) => Sync<B>
  readonly modifySome: <B>(def: B, f: (a: A) => O.Option<[B, A]>) => Sync<B>
  readonly set: (a: A) => Sync<void>
  readonly update: (f: (a: A) => A) => Sync<void>
  readonly updateAndGet: (f: (a: A) => A) => Sync<A>
  readonly updateSome: (f: (a: A) => O.Option<A>) => Sync<void>
  readonly updateSomeAndGet: (f: (a: A) => O.Option<A>) => Sync<A>
  readonly unsafeUpdate: (f: (a: A) => A) => void
}

class RefImpl<A> implements Ref<A> {
  constructor(private value: AtomicReference<A>) {
    this.getAndSet = this.getAndSet.bind(this)
    this.getAndUpdate = this.getAndUpdate.bind(this)
    this.getAndUpdateSome = this.getAndUpdateSome.bind(this)
    this.modify = this.modify.bind(this)
    this.modifySome = this.modifySome.bind(this)
    this.set = this.set.bind(this)
    this.update = this.update.bind(this)
    this.updateAndGet = this.updateAndGet.bind(this)
    this.updateSome = this.updateSome.bind(this)
    this.updateSomeAndGet = this.updateSomeAndGet.bind(this)
    this.unsafeUpdate = this.unsafeUpdate.bind(this)
  }

  get get(): Sync<A> {
    return effectTotal(() => this.value.get)
  }

  getAndSet(a: A): Sync<A> {
    return effectTotal(() => {
      const v = this.value.get
      this.value.set(a)
      return v
    })
  }

  getAndUpdate(f: (a: A) => A): Sync<A> {
    return effectTotal(() => {
      const v = this.value.get
      this.value.set(f(v))
      return v
    })
  }

  getAndUpdateSome(f: (a: A) => O.Option<A>): Sync<A> {
    return effectTotal(() => {
      const v = this.value.get
      const o = f(v)
      if (o._tag === "Some") {
        this.value.set(o.value)
      }
      return v
    })
  }

  modify<B>(f: (a: A) => [B, A]): Sync<B> {
    return effectTotal(() => {
      const v = this.value.get
      const o = f(v)
      this.value.set(o[1])
      return o[0]
    })
  }

  modifySome<B>(def: B, f: (a: A) => O.Option<[B, A]>): Sync<B> {
    return effectTotal(() => {
      const v = this.value.get
      const o = f(v)

      if (o._tag === "Some") {
        this.value.set(o.value[1])
        return o.value[0]
      }

      return def
    })
  }

  set(a: A): Sync<void> {
    return effectTotal(() => {
      this.value.set(a)
    })
  }

  update(f: (a: A) => A): Sync<void> {
    return effectTotal(() => {
      this.value.set(f(this.value.get))
    })
  }

  updateAndGet(f: (a: A) => A): Sync<A> {
    return effectTotal(() => {
      this.value.set(f(this.value.get))
      return this.value.get
    })
  }

  updateSome(f: (a: A) => O.Option<A>): Sync<void> {
    return effectTotal(() => {
      const o = f(this.value.get)

      if (o._tag === "Some") {
        this.value.set(o.value)
      }
    })
  }

  updateSomeAndGet(f: (a: A) => O.Option<A>): Sync<A> {
    return effectTotal(() => {
      const o = f(this.value.get)

      if (o._tag === "Some") {
        this.value.set(o.value)
      }

      return this.value.get
    })
  }

  unsafeUpdate(f: (a: A) => A) {
    this.value.set(f(this.value.get))
  }
}

export const makeRef = <A>(a: A) =>
  effectTotal<Ref<A>>(() => new RefImpl(new AtomicReference(a)))
