import * as A from "../../Array"
import * as O from "../../Option"
import { Empty, Then, Cause } from "../Cause/cause"
import { cause } from "../Effect/cause"
import { Sync, Async } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { map_ } from "../Effect/map_"
import { succeedNow } from "../Effect/succeedNow"
import { suspend } from "../Effect/suspend"
import { uncause } from "../Effect/uncause"
import { zipWith_ } from "../Effect/zipWith_"
import { AtomicNumber } from "../Support/AtomicNumber"
import { AtomicReference } from "../Support/AtomicReference"

/**
 * Represent Common Ops between Global | Local<A>
 */
export interface CommonScope<A> {
  /**
   * Determines if the scope is closed at the instant the effect executes.
   * Returns an effect that will succeed with `true` if the scope is closed,
   * and `false` otherwise.
   */
  readonly closed: Sync<boolean>

  /**
   * Prevents a previously added finalizer from being executed when the scope
   * is closed. The returned effect will succeed with `true` if the finalizer
   * will not be run by this scope, and `false` otherwise.
   */
  readonly deny: (key: Key) => Sync<boolean>

  /**
   * Determines if the scope is empty (has no finalizers) at the instant the
   * effect executes. The returned effect will succeed with `true` if the scope
   * is empty, and `false` otherwise.
   */
  readonly empty: Sync<boolean>

  /**
   * Adds a finalizer to the scope. If successful, this ensures that when the
   * scope exits, the finalizer will be run
   *
   * The returned effect will succeed with a key if the finalizer was added
   * to the scope, and `None` if the scope is already closed.
   */
  readonly ensure: (finalizer: (a: A) => Async<any>) => Sync<O.Option<Key>>

  /**
   * Extends the specified scope so that it will not be closed until this
   * scope is closed. Note that extending a scope into the global scope
   * will result in the scope *never* being closed!
   *
   * Scope extension does not result in changes to the scope contract: open
   * scopes must *always* be closed.
   */
  readonly extend: (that: Scope<any>) => Sync<boolean>

  /**
   * Determines if the scope is open at the moment the effect is executed.
   * Returns an effect that will succeed with `true` if the scope is open,
   * and `false` otherwise.
   */
  readonly open: Sync<boolean>

  /**
   * Determines if the scope has been released at the moment the effect is
   * executed. A scope can be closed yet unreleased, if it has been
   * extended by another scope which is not yet released.
   */
  readonly released: Sync<boolean>

  readonly unsafeEnsure: (finalizer: (_: A) => Async<any>) => O.Option<Key>
  readonly unsafeExtend: (that: Scope<any>) => boolean
  readonly unsafeDeny: (key: Key) => boolean
}

/**
 * Represents a key in a scope, which is associated with a single finalizer.
 */
export class Key {
  /**
   * Attempts to remove the finalizer associated with this key from the
   * scope. The returned effect will succeed with a boolean, which indicates
   * whether the attempt was successful. A value of `true` indicates the
   * finalizer will not be executed, while a value of `false` indicates the
   * finalizer was already executed.
   *
   * @return
   */
  remove: Sync<boolean> = succeedNow(false)
  constructor(remove?: Sync<boolean>) {
    if (remove) {
      this.remove = remove
    }
  }

  setRemove(remove: Sync<boolean>) {
    this.remove = remove
  }
}

/**
 * A `Scope<A>` is a value that allows adding finalizers identified by a key.
 * Scopes are closed with a value of type `A`, which is provided to all the
 * finalizers when the scope is released.
 *
 * For safety reasons, this interface has no method to close a scope. Rather,
 * an open scope may be required with `makeScope`, which returns a function
 * that can close a scope. This allows scopes to be safely passed around
 * without fear they will be accidentally closed.
 */
export type Scope<A> = Global | Local<A>

/**
 * The global scope, which is entirely stateless. Finalizers added to the
 * global scope will never be executed (nor kept in memory).
 */
export class Global implements CommonScope<never> {
  readonly _tag = "Global"

  constructor() {
    this.deny = this.deny.bind(this)
    this.ensure = this.ensure.bind(this)
    this.extend = this.extend.bind(this)
    this.unsafeEnsure = this.unsafeEnsure.bind(this)
    this.unsafeExtend = this.unsafeExtend.bind(this)
  }

  private unsafeEnsureResult = O.some(new Key(effectTotal(() => true)))

  private ensureResult = effectTotal(() => this.unsafeEnsureResult)

  get closed(): Sync<boolean> {
    return succeedNow(false)
  }

  deny(_key: Key): Sync<boolean> {
    return succeedNow(true)
  }

  get empty(): Sync<boolean> {
    return succeedNow(false)
  }

  ensure(_finalizer: (a: never) => Async<any>): Sync<O.Option<Key>> {
    return this.ensureResult
  }

  extend(that: Scope<any>): Sync<boolean> {
    return effectTotal(() => this.unsafeExtend(that))
  }

  get open(): Sync<boolean> {
    return map_(this.closed, (c) => !c)
  }

  get released(): Sync<boolean> {
    return succeedNow(false)
  }

  unsafeEnsure(_finalizer: (_: never) => Async<any>): O.Option<Key> {
    return this.unsafeEnsureResult
  }

  unsafeExtend(that: Scope<any>): boolean {
    switch (that._tag) {
      case "Global":
        return true
      case "Local":
        return that.unsafeAddRef()
    }
  }

  unsafeDeny() {
    return true
  }
}

export class OrderedFinalizer {
  constructor(readonly order: number, readonly finalizer: (_: any) => Async<any>) {}
}

const noCause =
  /*#__PURE__*/
  Empty

const noCauseEffect: Async<Cause<never>> =
  /*#__PURE__*/
  succeedNow(noCause)

export class Local<A> implements CommonScope<A> {
  readonly _tag = "Local"

  constructor(
    readonly finalizerCount: AtomicNumber,
    readonly exitValue: AtomicReference<A | null>,
    readonly references: AtomicNumber,
    readonly finalizers: Map<Key, OrderedFinalizer>
  ) {}

  get closed(): Sync<boolean> {
    return effectTotal(() => this.unsafeClosed)
  }

  get open(): Sync<boolean> {
    return map_(this.closed, (c) => !c)
  }

  deny(key: Key): Sync<boolean> {
    return effectTotal(() => this.unsafeDeny(key))
  }

  get empty(): Sync<boolean> {
    return effectTotal(() => this.finalizers.size === 0)
  }

  ensure(finalizer: (a: A) => Async<any>): Sync<O.Option<Key>> {
    return effectTotal(() => this.unsafeEnsure(finalizer))
  }

  extend(that: Scope<any>): Sync<boolean> {
    return effectTotal(() => this.unsafeExtend(that))
  }

  get released(): Sync<boolean> {
    return effectTotal(() => this.unsafeReleased())
  }

  unsafeExtend(that: Scope<any>): boolean {
    if (this === that) {
      return true
    }

    switch (that._tag) {
      case "Global":
        return true
      case "Local":
        if (this.unsafeClosed && that.unsafeClosed) {
          that.unsafeAddRef()
          this.unsafeEnsure((_) => that.release)
          return true
        } else {
          return false
        }
    }
  }

  get release(): Async<boolean> {
    return suspend(() => {
      const result = this.unsafeRelease()

      if (result != null) {
        return result
      } else {
        return succeedNow(false)
      }
    })
  }

  unsafeReleased() {
    return this.references.get <= 0
  }

  unsafeEnsure(finalizer: (_: A) => Async<any>): O.Option<Key> {
    if (this.unsafeClosed) {
      return O.none
    }

    const key = new Key()
    key.setRemove(this.deny(key))

    this.finalizers.set(
      key,
      new OrderedFinalizer(this.finalizerCount.incrementAndGet(), finalizer)
    )

    return O.some(key)
  }

  unsafeAddRef(): boolean {
    if (this.unsafeClosed) {
      return false
    }
    this.references.incrementAndGet()
    return true
  }

  get unsafeClosed() {
    return this.exitValue.get != null
  }

  unsafeDeny(key: Key) {
    if (this.unsafeClosed) {
      return false
    } else {
      return this.finalizers.delete(key)
    }
  }

  unsafeClose(a: A): Async<any> | null {
    this.exitValue.compareAndSet(null, a)

    return this.unsafeRelease()
  }

  unsafeRelease(): Async<any> | null {
    if (this.references.decrementAndGet() === 0) {
      const totalSize = this.finalizers.size

      if (totalSize === 0) {
        return null
      }

      const array = Array.from(this.finalizers.values())

      const sorted = array.sort((l, r) =>
        l == null ? -1 : r == null ? 1 : l.order - r.order
      )

      const a = this.exitValue.get

      return uncause(
        A.reduce_(sorted, noCauseEffect, (acc, o) =>
          o != null ? zipWith_(acc, cause(o.finalizer(a)), (a, b) => Then(a, b)) : acc
        )
      )
    } else {
      return null
    }
  }

  get unsafeEmpty() {
    return this.finalizers.size === 0
  }
}

/**
 * The global scope, which is entirely stateless. Finalizers added to the
 * global scope will never be executed (nor kept in memory).
 */
export const globalScope =
  /*#__PURE__*/
  new Global()

/**
 * A tuple that contains an open scope, together with a function that closes
 * the scope.
 */
export class Open<A> {
  constructor(readonly close: (_: A) => Async<boolean>, readonly scope: Local<A>) {}
}

export const unsafeMakeScope = <A>() => {
  const exitValue = new AtomicReference<A | null>(null)
  const finalizers = new Map<Key, OrderedFinalizer>()
  const scope = new Local(
    new AtomicNumber(Number.MIN_SAFE_INTEGER),
    exitValue,
    new AtomicNumber(1),
    finalizers
  )

  return new Open<A>((a) => {
    return suspend(() => {
      const result = scope.unsafeClose(a)

      if (result != null) {
        return map_(result, () => true)
      } else {
        return succeedNow(false)
      }
    })
  }, scope)
}

export const makeScope = <A>() => effectTotal(() => unsafeMakeScope<A>())
