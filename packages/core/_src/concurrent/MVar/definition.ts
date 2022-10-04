export const MVarSym = Symbol.for("@effect/core/concurrent/MVar")
export type MVarSym = typeof MVarSym

/**
 * An `MVar<A>` is a mutable location that is either empty or contains a value
 * of type `A`. It has two fundamental operations: `put` which fills an `MVar`
 * if it is empty and blocks otherwise, and `take` which empties an `MVar` if it
 * is full and blocks otherwise. They can be used in multiple different ways:
 *
 *   - As synchronized mutable variables,
 *   - As channels, with `take` and `put` as `receive` and `send`, and
 *   - As a binary semaphore `MVar<void>`, with `take` and `put` as `wait` and
 *     `signal`.
 *
 * They were introduced in the paper "Concurrent Haskell" by Simon Peyton Jones,
 * Andrew Gordon and Sigbjorn Finne.
 *
 * @tsplus type effect/core/concurrent/MVar
 */
export interface MVar<A> extends MVarInternal<A> {}

/**
 * @tsplus type effect/core/concurrent/MVar.Ops
 */
export interface MVarOps {
  readonly $: MVarAspects
}
export const MVar: MVarOps = {
  $: {}
}

/**
 * @tsplus type effect/core/concurrent/MVar.Aspects
 */
export interface MVarAspects {}

export class MVarInternal<A> {
  readonly [MVarSym]: MVarSym = MVarSym

  private _content: TRef<Maybe<A>>

  constructor(content: TRef<Maybe<A>>) {
    this._content = content
  }

  /**
   * Check whether the `MVar` is empty.
   *
   * Notice that the boolean value returned is just a snapshot of the state of
   * the `MVar`. By the time you get to react on its result, the `MVar` may have
   * been filled (or emptied) - so be extremely careful when using this
   * operation. Use `tryTake` instead if possible.
   */
  get isEmpty(): Effect<never, never, boolean> {
    return this._content.get.map((maybe) => maybe.isNone()).commit
  }

  /**
   * A slight variation on `update` that allows a value to be returned (`b`) in
   * addition to the modified value of the `MVar`.
   */
  modify<B>(f: (a: A) => readonly [B, A]): Effect<never, never, B> {
    return this._content.get.collect((maybe) => {
      if (maybe.isSome()) {
        const [b, newA] = f(maybe.value)
        return Maybe.some([b, Maybe.some(newA)] as const)
      }
      return Maybe.none
    }).flatMap(([b, newA]) => this._content.set(newA).as(b)).commit
  }

  /**
   * Put a `value` into an `MVar`. If the `MVar` is currently full, `put` will
   * wait until it becomes empty.
   */
  put(value: A): Effect<never, never, void> {
    return this._content
      .get
      .collect((maybe) => maybe.isNone() ? Maybe.some(undefined) : Maybe.none)
      .zipRight(this._content.set(Maybe.some(value)))
      .commit
  }

  /**
   * Atomically read the contents of an `MVar`. If the `MVar` is currently
   * empty, `read` will wait until it is full. `read` is guaranteed to receive
   * the next `put`.
   */
  get read(): Effect<never, never, A> {
    return this._content.get.collect(identity).commit
  }

  /**
   * Take a value from an `MVar`, put a new value into the `MVar` and return the
   * value taken.
   */
  swap(value: A): Effect<never, never, A> {
    return Do(($) => {
      const ref = $(this._content.get)
      return $(ref.fold(
        STM.retry,
        (other) => this._content.set(Maybe.some(value)).as(other)
      ))
    }).commit
  }

  /**
   * Return the contents of the `MVar`. If the `MVar` is currently empty, `take`
   * will wait until it is full. After a `take`, the `MVar` is left empty.
   */
  get take(): Effect<never, never, A> {
    return this._content.get
      .collect(identity)
      .flatMap((a) => this._content.set(Maybe.none).as(a))
      .commit
  }

  /**
   * A non-blocking version of `put`. The `tryPut` function attempts to put the
   * `value` into the `MVar`, returning `true` if it was successful, or
   * `false` otherwise.
   */
  tryPut(value: A): Effect<never, never, boolean> {
    return this._content.get.flatMap((maybe) =>
      maybe.fold(
        this._content.set(Maybe.some(value)).as(true),
        () => STM.succeed(false)
      )
    ).commit
  }

  /**
   * A non-blocking version of `read`. The `tryRead` function returns
   * immediately, with `None` if the `MVar` was empty, or `Some(x)` if the
   * `MVar` was full with contents.
   */
  get tryRead(): Effect<never, never, Maybe<A>> {
    return this._content.get.commit
  }

  /**
   * A non-blocking version of `take`. The `tryTake` action returns immediately,
   * with `None` if the `MVar` was empty, or `Some(x)` if the `MVar` was full
   * with contents. After `tryTake`, the `MVar` is left empty.
   */
  get tryTake(): Effect<never, never, Maybe<A>> {
    return Do(($) => {
      const content = $(this._content.get)
      return $(content.fold(
        STM.succeed(Maybe.none),
        (value) => this._content.set(Maybe.none).zipRight(STM.succeed(Maybe.some(value)))
      ))
    }).commit
  }

  /**
   * Replaces the contents of an `MVar` with the result of `f(a)`.
   */
  update(f: (a: A) => A): Effect<never, never, void> {
    return this._content.get
      .collect((maybe) =>
        maybe.isSome() ?
          Maybe.some(Maybe.some(f(maybe.value))) :
          Maybe.none
      )
      .flatMap((value) => this._content.set(value))
      .commit
  }
}
