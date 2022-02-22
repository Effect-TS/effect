// ets_tracing: off

import "../Operator/index.js"

import type { Cause } from "../Cause/cause.js"
import { combineSeq, empty } from "../Cause/cause.js"
/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Scope.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import * as A from "../Collections/Immutable/Array/index.js"
import { cause } from "../Effect/cause.js"
import { succeed, succeedWith, suspend } from "../Effect/core.js"
import type { UIO } from "../Effect/effect.js"
import { map_ } from "../Effect/map.js"
import { uncause } from "../Effect/uncause.js"
import { zipWith_ } from "../Effect/zipWith.js"
import * as E from "../Either/index.js"
import { AtomicNumber } from "../Support/AtomicNumber/index.js"
import { AtomicReference } from "../Support/AtomicReference/index.js"

/**
 * Represent Common Ops between Global | Local<A>
 */
export interface CommonScope<A> {
  /**
   * Determines if the scope is closed at the instant the effect executes.
   * Returns an effect that will succeed with `true` if the scope is closed,
   * and `false` otherwise.
   */
  readonly closed: UIO<boolean>

  /**
   * Prevents a previously added finalizer from being executed when the scope
   * is closed. The returned effect will succeed with `true` if the finalizer
   * will not be run by this scope, and `false` otherwise.
   */
  readonly deny: (key: Key) => UIO<boolean>

  /**
   * Determines if the scope is empty (has no finalizers) at the instant the
   * effect executes. The returned effect will succeed with `true` if the scope
   * is empty, and `false` otherwise.
   */
  readonly empty: UIO<boolean>

  /**
   * Adds a finalizer to the scope. If successful, this ensures that when the
   * scope exits, the finalizer will be run
   *
   * The returned effect will succeed with a key if the finalizer was added
   * to the scope, and `None` if the scope is already closed.
   */
  readonly ensure: (finalizer: (a: A) => UIO<any>) => UIO<E.Either<A, Key>>

  /**
   * Extends the specified scope so that it will not be closed until this
   * scope is closed. Note that extending a scope into the global scope
   * will result in the scope *never* being closed!
   *
   * Scope extension does not result in changes to the scope contract: open
   * scopes must *always* be closed.
   */
  readonly extend: (that: Scope<any>) => UIO<boolean>

  /**
   * Determines if the scope is open at the moment the effect is executed.
   * Returns an effect that will succeed with `true` if the scope is open,
   * and `false` otherwise.
   */
  readonly open: UIO<boolean>

  /**
   * Determines if the scope has been released at the moment the effect is
   * executed. A scope can be closed yet unreleased, if it has been
   * extended by another scope which is not yet released.
   */
  readonly released: UIO<boolean>

  readonly unsafeEnsure: (finalizer: (_: A) => UIO<any>) => E.Either<A, Key>
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
   */
  remove: UIO<boolean> = succeed(false)
  constructor(remove?: UIO<boolean>) {
    if (remove) {
      this.remove = remove
    }
  }

  setRemove(remove: UIO<boolean>) {
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

  private unsafeEnsureResult = E.right(new Key(succeedWith(() => true)))

  private ensureResult = succeedWith(() => this.unsafeEnsureResult)

  get closed(): UIO<boolean> {
    return succeed(false)
  }

  deny(_key: Key): UIO<boolean> {
    return succeed(true)
  }

  get empty(): UIO<boolean> {
    return succeed(false)
  }

  ensure(_finalizer: (a: never) => UIO<any>): UIO<E.Either<never, Key>> {
    return this.ensureResult
  }

  extend(that: Scope<any>): UIO<boolean> {
    return succeedWith(() => this.unsafeExtend(that))
  }

  get open(): UIO<boolean> {
    return map_(this.closed, (c) => !c)
  }

  get released(): UIO<boolean> {
    return succeed(false)
  }

  unsafeEnsure(_finalizer: (_: never) => UIO<any>): E.Either<never, Key> {
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
  constructor(readonly order: number, readonly finalizer: (_: any) => UIO<any>) {}
}

const noCause = empty

const noCauseEffect: UIO<Cause<never>> = succeed(noCause)

export class Local<A> implements CommonScope<A> {
  readonly _tag = "Local"

  constructor(
    readonly finalizerCount: AtomicNumber,
    readonly exitValue: AtomicReference<A | null>,
    readonly references: AtomicNumber,
    readonly finalizers: Map<Key, OrderedFinalizer>
  ) {}

  get closed(): UIO<boolean> {
    return succeedWith(() => this.unsafeClosed)
  }

  get open(): UIO<boolean> {
    return map_(this.closed, (c) => !c)
  }

  deny(key: Key): UIO<boolean> {
    return succeedWith(() => this.unsafeDeny(key))
  }

  get empty(): UIO<boolean> {
    return succeedWith(() => this.finalizers.size === 0)
  }

  ensure(finalizer: (a: A) => UIO<any>): UIO<E.Either<A, Key>> {
    return succeedWith(() => this.unsafeEnsure(finalizer))
  }

  extend(that: Scope<any>): UIO<boolean> {
    return succeedWith(() => this.unsafeExtend(that))
  }

  get released(): UIO<boolean> {
    return succeedWith(() => this.unsafeReleased())
  }

  unsafeExtend(that: Scope<any>): boolean {
    if (this === that) {
      return true
    }

    switch (that._tag) {
      case "Global":
        return true
      case "Local":
        if (!this.unsafeClosed && !that.unsafeClosed) {
          that.unsafeAddRef()
          this.unsafeEnsure((_) => that.release)
          return true
        } else {
          return false
        }
    }
  }

  get release(): UIO<boolean> {
    return suspend(() => {
      const result = this.unsafeRelease()

      if (result != null) {
        return map_(result, () => true)
      } else {
        return succeed(false)
      }
    })
  }

  unsafeReleased() {
    return this.references.get <= 0
  }

  unsafeEnsure(finalizer: (_: A) => UIO<any>): E.Either<A, Key> {
    if (this.unsafeClosed) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return E.left(this.exitValue.get!)
    }

    const key = new Key()
    key.setRemove(this.deny(key))

    this.finalizers.set(
      key,
      new OrderedFinalizer(this.finalizerCount.incrementAndGet(), finalizer)
    )

    return E.right(key)
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

  unsafeClose(a: A): UIO<any> | null {
    this.exitValue.compareAndSet(null, a)

    return this.unsafeRelease()
  }

  unsafeRelease(): UIO<any> | null {
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
          o != null
            ? zipWith_(acc, cause(o.finalizer(a)), (a, b) => combineSeq(a, b))
            : acc
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
export const globalScope = new Global()

/**
 * A tuple that contains an open scope, together with a function that closes
 * the scope.
 */
export class Open<A> {
  constructor(readonly close: (_: A) => UIO<boolean>, readonly scope: Local<A>) {}
}

export function unsafeMakeScope<A>() {
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
        return succeed(false)
      }
    })
  }, scope)
}

export function makeScope<A>() {
  return succeedWith(() => unsafeMakeScope<A>())
}
