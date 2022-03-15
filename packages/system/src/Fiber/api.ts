// ets_tracing: off

import * as Cause from "../Cause/core.js"
import { reduceRight as chunkReduceRight } from "../Collections/Immutable/Chunk/api/reduceRight.js"
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import * as E from "../Either/index.js"
import * as Exit from "../Exit/api.js"
import { constant, pipe } from "../Function/index.js"
import * as IT from "../Iterable/index.js"
import { make } from "../Managed/core.js"
import type { Managed } from "../Managed/managed.js"
import * as O from "../Option/index.js"
import * as T from "./_internal/effect-api.js"
import * as Fiber from "./core.js"
import { interrupt } from "./interrupt.js"

/**
 * Lifts an IO into a `Fiber`.
 */
export function fromEffect<E, A>(effect: T.IO<E, A>): T.UIO<Fiber.Fiber<E, A>> {
  return T.map_(T.result(effect), done)
}

/**
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export function interruptAllAs(id: Fiber.FiberID) {
  return (fs: Iterable<Fiber.Fiber<any, any>>) =>
    IT.reduce_(fs, T.unit as T.UIO<void>, (io, f) =>
      T.asUnit(T.chain_(io, () => f.interruptAs(id)))
    )
}

/**
 * Interrupts all fibers, awaiting their interruption.
 */
export function interruptAll(fs: Iterable<Fiber.Fiber<any, any>>) {
  return pipe(
    T.fiberId,
    T.chain((id) => interruptAllAs(id)(fs))
  )
}

/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export function interruptFork<E, A>(fiber: Fiber.Fiber<E, A>) {
  return T.asUnit(T.forkDaemon(interrupt(fiber)))
}

/**
 * Effectually maps over the value the fiber computes.
 */
export function mapM<E2, A, B>(f: (a: A) => T.IO<E2, B>) {
  return <E>(fiber: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, B> =>
    makeSynthetic({
      await: T.chain_(fiber.await, Exit.forEach(f)),
      getRef: (ref) => fiber.getRef(ref),
      inheritRefs: fiber.inheritRefs,
      interruptAs: (id) => T.chain_(fiber.interruptAs(id), Exit.forEach(f)),
      poll: T.chain_(
        fiber.poll,
        O.fold(
          () => T.succeed(O.none),
          (a) => T.map_(Exit.forEach_(a, f), O.some)
        )
      )
    })
}

/**
 * Maps over the value the fiber computes.
 */
export function map<A, B>(f: (a: A) => B) {
  return mapM((a: A) => T.succeed(f(a)))
}

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export function joinAll<E, A>(as: Iterable<Fiber.Fiber<E, A>>) {
  return T.tap_(T.chain_(waitAll(as), T.done), () =>
    T.forEach_(as, (f) => f.inheritRefs)
  )
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function waitAll<E, A>(as: Iterable<Fiber.Fiber<E, A>>) {
  return T.result(T.forEachPar_(as, (f) => T.chain_(f.await, T.done)))
}

/**
 * Maps over the value the fiber computes.
 */
export function map_<E, A, B>(
  fiber: Fiber.Fiber<E, A>,
  f: (a: A) => B
): Fiber.Fiber<E, B> {
  return map(f)(fiber)
}

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export function mapFiber<A, E2, A2>(f: (a: A) => Fiber.Fiber<E2, A2>) {
  return <E>(fiber: Fiber.Fiber<E, A>): T.UIO<Fiber.Fiber<E | E2, A2>> =>
    T.map_(fiber.await, (e) => {
      switch (e._tag) {
        case "Success": {
          return f(e.value)
        }
        case "Failure": {
          return halt(e.cause)
        }
      }
    })
}

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 */
export function mapFiber_<A, E, E2, A2>(
  fiber: Fiber.Fiber<E, A>,
  f: (a: A) => Fiber.Fiber<E2, A2>
): T.UIO<Fiber.Fiber<E | E2, A2>> {
  return T.map_(fiber.await, (e) => {
    switch (e._tag) {
      case "Success": {
        return f(e.value)
      }
      case "Failure": {
        return halt(e.cause)
      }
    }
  })
}

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the
 * `that` one when `this` one fails. Interrupting the returned fiber
 * will interrupt both fibers, sequentially, from left to right.
 */
export function orElse<E1, A1>(that: Fiber.Fiber<E1, A1>) {
  return <E, A>(fiber: Fiber.Fiber<E, A>): Fiber.Fiber<E | E1, A | A1> =>
    makeSynthetic<E | E1, A | A1>({
      await: T.zipWith_(fiber.await, that.await, (a, b) =>
        a._tag === "Success" ? a : b
      ),
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
}

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the
 * `that` one when `this` one fails. Interrupting the returned fiber
 * will interrupt both fibers, sequentially, from left to right.
 */
export function orElseEither<E1, A1>(that: Fiber.Fiber<E1, A1>) {
  return <E, A>(fiber: Fiber.Fiber<E, A>): Fiber.Fiber<E1 | E, E.Either<A, A1>> =>
    orElse(map_(that, E.right))(map_(fiber, E.left))
}

/**
 * Maps the output of this fiber to the specified constant.
 */
export function as<B>(b: B) {
  return <E, A>(fiber: Fiber.Fiber<E, A>) => map_(fiber, () => b)
}

/**
 * Maps the output of this fiber to `void`.
 */
export function asUnit<E, A>(fiber: Fiber.Fiber<E, A>): Fiber.Fiber<E, void> {
  return map_(fiber, () => undefined)
}

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export function zipWith_<E, A, E1, A1, B>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>,
  f: (a: A, b: A1) => B
): Fiber.Fiber<E | E1, B> {
  return makeSynthetic<E | E1, B>({
    getRef: (ref) =>
      T.zipWith_(fiberA.getRef(ref), fiberB.getRef(ref), (a, b) => ref.join(a, b)),
    inheritRefs: T.chain_(fiberA.inheritRefs, () => fiberB.inheritRefs),
    interruptAs: (id) =>
      T.zipWith_(fiberA.interruptAs(id), fiberB.interruptAs(id), (ea, eb) =>
        Exit.zipWith_(ea, eb, f, Cause.combinePar)
      ),
    poll: T.zipWith_(fiberA.poll, fiberB.poll, (oa, ob) =>
      O.chain_(oa, (ea) =>
        O.map_(ob, (eb) => Exit.zipWith_(ea, eb, f, Cause.combinePar))
      )
    ),
    await: T.result(
      T.zipWithPar_(T.chain_(fiberA.await, T.done), T.chain_(fiberB.await, T.done), f)
    )
  })
}

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export function zip_<E, A, E1, A1>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>
): Fiber.Fiber<E | E1, [A, A1]> {
  return zipWith_(fiberA, fiberB, (a, b) => [a, b])
}

/**
 * Same as `zip` but discards the output of the left hand side.
 */
export function zipRight_<E, A, E1, A1>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>
): Fiber.Fiber<E | E1, A1> {
  return zipWith_(fiberA, fiberB, (_, b) => b)
}

/**
 * Same as `zip` but discards the output of the right hand side.
 */
export function zipLeft_<E, A, E1, A1>(
  fiberA: Fiber.Fiber<E, A>,
  fiberB: Fiber.Fiber<E1, A1>
): Fiber.Fiber<E | E1, A> {
  return zipWith_(fiberA, fiberB, (a, _) => a)
}

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 */
export function collectAll<E, A>(fibers: Iterable<Fiber.Fiber<E, A>>) {
  return makeSynthetic({
    getRef: (ref) =>
      T.reduce_(fibers, ref.initial, (a, fiber) =>
        pipe(
          fiber.getRef(ref),
          T.map((a2) => ref.join(a, a2))
        )
      ),
    inheritRefs: T.forEachUnit_(fibers, (f) => f.inheritRefs),
    interruptAs: (fiberId) =>
      pipe(
        T.forEach_(fibers, (f) => f.interruptAs(fiberId)),
        T.map(
          chunkReduceRight(
            Exit.succeed(Chunk.empty()) as Exit.Exit<E, Chunk.Chunk<A>>,
            (a, b) =>
              Exit.zipWith_(a, b, (_a, _b) => Chunk.prepend_(_b, _a), Cause.combinePar)
          )
        )
      ),
    poll: pipe(
      T.forEach_(fibers, (f) => f.poll),
      T.map(
        chunkReduceRight(
          O.some(Exit.succeed(Chunk.empty()) as Exit.Exit<E, Chunk.Chunk<A>>),
          (a, b) =>
            O.fold_(
              a,
              () => O.none,
              (ra) =>
                O.fold_(
                  b,
                  () => O.none,
                  (rb) =>
                    O.some(
                      Exit.zipWith_(
                        ra,
                        rb,
                        (_a, _b) => Chunk.prepend_(_b, _a),
                        Cause.combinePar
                      )
                    )
                )
            )
        )
      )
    ),
    await: waitAll(fibers)
  })
}

/**
 * @ets_optimize identity
 */
export function makeSynthetic<E, A>(
  _: Omit<Fiber.Synthetic<E, A>, "_tag" | symbol>
): Fiber.Fiber<E, A> {
  return new Fiber.Synthetic(_.await, _.getRef, _.inheritRefs, _.interruptAs, _.poll)
}

/**
 * Folds over the runtime or synthetic fiber.
 */
export function fold<E, A, Z>(
  runtime: (_: Fiber.Runtime<E, A>) => Z,
  syntetic: (_: Fiber.Synthetic<E, A>) => Z
) {
  return (fiber: Fiber.Fiber<E, A>) => {
    switch (fiber._tag) {
      case "RuntimeFiber": {
        return runtime(fiber)
      }
      case "SyntheticFiber": {
        return syntetic(fiber)
      }
    }
  }
}

/**
 * A fiber that is done with the specified `Exit` value.
 */
export function done<E, A>(exit: Exit.Exit<E, A>): Fiber.Fiber<E, A> {
  return makeSynthetic({
    await: T.succeed(exit),
    getRef: (ref) => T.succeed(ref.initial),
    inheritRefs: T.unit,
    interruptAs: () => T.succeed(exit),
    poll: T.succeed(O.some(exit))
  })
}

/**
 * Returns a fiber that has already succeeded with the specified value.
 */
export function succeed<A>(a: A) {
  return done(Exit.succeed(a))
}

/**
 * A fiber that has already failed with the specified value.
 */
export function fail<E>(e: E) {
  return done(Exit.fail(e))
}

/**
 * Creates a `Fiber` that is halted with the specified cause.
 */
export function halt<E>(cause: Cause.Cause<E>) {
  return done(Exit.halt(cause))
}

/**
 * A fiber that is already interrupted.
 */
export function interruptAs(id: Fiber.FiberID) {
  return done(Exit.interrupt(id))
}

export function toManaged<E, A>(
  fiber: Fiber.Fiber<E, A>
): Managed<unknown, never, Fiber.Fiber<E, A>> {
  return pipe(fiber, T.succeed, make(interrupt))
}

/**
 * A fiber that never fails or succeeds.
 */
export const never = makeSynthetic<never, never>({
  await: T.never,
  getRef: (fiberRef) => T.succeed(fiberRef.initial),
  interruptAs: constant(T.never),
  inheritRefs: T.unit,
  poll: T.succeed(O.none)
})

/**
 * A fiber that has already succeeded with unit.
 */
export const unit = succeed<void>(undefined)

/**
 * Awaits the fiber, which suspends the awaiting fiber until the result of the fiber has been determined.
 */
function wait<E, A>(fiber: Fiber.Fiber<E, A>) {
  return fiber.await
}

export { wait as await }
