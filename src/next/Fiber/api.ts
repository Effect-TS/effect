import * as E from "../../Either"
import * as O from "../../Option"
import * as Cause from "../Cause/core"
import * as Exit from "../Exit/api"
import * as IT from "../Iterable"

import * as T from "./_internal/effect"
import * as Fiber from "./core"

/**
 * Lifts an IO into a `Fiber`.
 */
export const fromEffect = <E, A>(
  effect: T.AsyncE<E, A>
): T.Async<Fiber.Syntetic<E, A>> => T.map_(T.result(effect), Fiber.done)

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export const interrupt = <E, A>(fiber: Fiber.Fiber<E, A>) =>
  T.chain_(T.fiberId(), (id) => fiber.interruptAs(id))

/**
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs = (id: Fiber.FiberID) => (
  fs: Iterable<Fiber.Fiber<any, any>>
) =>
  IT.reduce_(fs, T.unit as T.Async<void>, (io, f) =>
    T.asUnit(T.chain_(io, () => f.interruptAs(id)))
  )

/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export const interruptFork = <E, A>(fiber: Fiber.Fiber<E, A>) =>
  T.asUnit(T.forkDaemon(interrupt(fiber)))

/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by another
 * fiber, "inner interruption" can be caught and recovered.
 */
export const join = <E, A>(fiber: Fiber.Fiber<E, A>): T.AsyncE<E, A> =>
  T.tap_(T.chain_(fiber.wait, T.done), () => fiber.inheritRefs)

/**
 * Effectually maps over the value the fiber computes.
 */
export const mapM = <E2, A, B>(f: (a: A) => T.AsyncE<E2, B>) => <E>(
  fiber: Fiber.Fiber<E, A>
): Fiber.Syntetic<E | E2, B> => ({
  _tag: "SynteticFiber",
  wait: T.chain_(fiber.wait, Exit.foreach(f)),
  getRef: (ref) => fiber.getRef(ref),
  inheritRefs: fiber.inheritRefs,
  interruptAs: (id) => T.chain_(fiber.interruptAs(id), Exit.foreach(f)),
  poll: T.chain_(
    fiber.poll,
    O.fold(
      () => T.succeedNow(O.none),
      (a) => T.map_(Exit.foreach_(a, f), O.some)
    )
  )
})

/**
 * Maps over the value the fiber computes.
 */
export const map = <A, B>(f: (a: A) => B) => mapM((a: A) => T.succeedNow(f(a)))

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export const joinAll = <E, A>(as: Iterable<Fiber.Fiber<E, A>>) =>
  T.tap_(T.chain_(waitAll(as), T.done), () => T.foreach_(as, (f) => f.inheritRefs))

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const waitAll = <E, A>(as: Iterable<Fiber.Fiber<E, A>>) =>
  T.result(T.foreachPar_(as, (f) => T.chain_(f.wait, T.done)))

/**
 * Maps over the value the fiber computes.
 */
export const map_ = <E, A, B>(
  fiber: Fiber.Fiber<E, A>,
  f: (a: A) => B
): Fiber.Syntetic<E, B> => map(f)(fiber)

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber = <A, E2, A2>(f: (a: A) => Fiber.Fiber<E2, A2>) => <E>(
  fiber: Fiber.Fiber<E, A>
): T.Async<Fiber.Fiber<E | E2, A2>> =>
  T.map_(fiber.wait, (e) => {
    switch (e._tag) {
      case "Success": {
        return f(e.value)
      }
      case "Failure": {
        return Fiber.halt(e.cause)
      }
    }
  })

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export const mapFiber_ = <A, E, E2, A2>(
  fiber: Fiber.Fiber<E, A>,
  f: (a: A) => Fiber.Fiber<E2, A2>
): T.Async<Fiber.Fiber<E | E2, A2>> =>
  T.map_(fiber.wait, (e) => {
    switch (e._tag) {
      case "Success": {
        return f(e.value)
      }
      case "Failure": {
        return Fiber.halt(e.cause)
      }
    }
  })

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the
 * `that` one when `this` one fails. Interrupting the returned fiber
 * will interrupt both fibers, sequentially, from left to right.
 */
export const orElse = <E1, A1>(that: Fiber.Fiber<E1, A1>) => <E, A>(
  fiber: Fiber.Fiber<E, A>
): Fiber.Syntetic<E | E1, A | A1> => ({
  _tag: "SynteticFiber",
  wait: T.zipWith_(fiber.wait, that.wait, (a, b) => (a._tag === "Success" ? a : b)),
  getRef: (ref) =>
    T.zipWith_(fiber.getRef(ref), that.getRef(ref), (a, b) =>
      a === ref.initial ? b : a
    ),
  inheritRefs: T.chain_(fiber.inheritRefs, () => that.inheritRefs),
  interruptAs: (id) => T.chain_(fiber.interruptAs(id), () => that.interruptAs(id)),
  poll: T.zipWith_(fiber.poll, that.poll, (a, b) => {
    switch (a._tag) {
      case "Some": {
        return a.value._tag === "Success" ? a : b
      }
      case "None": {
        return O.none
      }
    }
  })
})

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the
 * `that` one when `this` one fails. Interrupting the returned fiber
 * will interrupt both fibers, sequentially, from left to right.
 */
export const orElseEither = <E1, A1>(that: Fiber.Fiber<E1, A1>) => <E, A>(
  fiber: Fiber.Fiber<E, A>
): Fiber.Syntetic<E1 | E, E.Either<A, A1>> =>
  orElse(map_(that, E.right))(map_(fiber, E.left))

/**
 * Maps the output of this fiber to the specified constant.
 */
export const as = <B>(b: B) => <E, A>(fiber: Fiber.Fiber<E, A>) => map_(fiber, () => b)

/**
 * Maps the output of this fiber to `void`.
 */
export const asUnit = <E, A>(fiber: Fiber.Fiber<E, A>): Fiber.Syntetic<E, void> =>
  map_(fiber, () => undefined)

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const zipWith_ = <E, A, E1, A1, B>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>,
  f: (a: A, b: A1) => B
): Fiber.Syntetic<E | E1, B> => ({
  _tag: "SynteticFiber",
  getRef: (ref) =>
    T.zipWith_(fiberA.getRef(ref), fiberB.getRef(ref), (a, b) => ref.join(a, b)),
  inheritRefs: T.chain_(fiberA.inheritRefs, () => fiberB.inheritRefs),
  interruptAs: (id) =>
    T.zipWith_(fiberA.interruptAs(id), fiberB.interruptAs(id), (ea, eb) =>
      Exit.zipWith_(ea, eb, f, Cause.Both)
    ),
  poll: T.zipWith_(fiberA.poll, fiberB.poll, (oa, ob) =>
    O.chain_(oa, (ea) => O.map_(ob, (eb) => Exit.zipWith_(ea, eb, f, Cause.Both)))
  ),
  wait: T.result(
    T.zipWithPar_(T.chain_(fiberA.wait, T.done), T.chain_(fiberB.wait, T.done), f)
  )
})

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const zip_ = <E, A, E1, A1>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>
): Fiber.Syntetic<E | E1, [A, A1]> => zipWith_(fiberA, fiberB, (a, b) => [a, b])

/**
 * Same as `zip` but discards the output of the left hand side.
 */
export const zipRight_ = <E, A, E1, A1>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>
): Fiber.Syntetic<E | E1, A1> => zipWith_(fiberA, fiberB, (_, b) => b)

/**
 * Same as `zip` but discards the output of the right hand side.
 */
export const zipLeft_ = <E, A, E1, A1>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>
): Fiber.Syntetic<E | E1, A> => zipWith_(fiberA, fiberB, (a, _) => a)

export {
  CommonFiber,
  Descriptor,
  Fiber,
  FiberID,
  InterruptStatus,
  None,
  Runtime,
  Syntetic,
  done,
  equalsFiberID,
  fail,
  fold,
  halt,
  interruptAs,
  interruptStatus,
  interruptible,
  newFiberId,
  uninterruptible
} from "./core"
