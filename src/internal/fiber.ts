import type * as Cause from "../Cause.js"
import * as Clock from "../Clock.js"
import type * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Exit from "../Exit.js"
import type * as Fiber from "../Fiber.js"
import * as FiberId from "../FiberId.js"
import * as FiberStatus from "../FiberStatus.js"
import { dual, pipe } from "../Function.js"
import * as HashSet from "../HashSet.js"
import * as number from "../Number.js"
import * as Option from "../Option.js"
import * as order from "../Order.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import * as core from "./core.js"
import * as fiberScope from "./fiberScope.js"
import * as runtimeFlags from "./runtimeFlags.js"

/** @internal */
const FiberSymbolKey = "effect/Fiber"

/** @internal */
export const FiberTypeId: Fiber.FiberTypeId = Symbol.for(
  FiberSymbolKey
) as Fiber.FiberTypeId

/** @internal */
export const fiberVariance = {
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: never) => _
}

/** @internal */
const fiberProto = {
  [FiberTypeId]: fiberVariance,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
const RuntimeFiberSymbolKey = "effect/Fiber"

/** @internal */
export const RuntimeFiberTypeId: Fiber.RuntimeFiberTypeId = Symbol.for(
  RuntimeFiberSymbolKey
) as Fiber.RuntimeFiberTypeId

/** @internal */
export const Order: order.Order<Fiber.RuntimeFiber<unknown, unknown>> = pipe(
  order.tuple(number.Order, number.Order),
  order.mapInput((fiber: Fiber.RuntimeFiber<unknown, unknown>) =>
    [
      (fiber.id() as FiberId.Runtime).startTimeMillis,
      (fiber.id() as FiberId.Runtime).id
    ] as const
  )
)

/** @internal */
export const isFiber = (u: unknown): u is Fiber.Fiber<unknown, unknown> => hasProperty(u, FiberTypeId)

/** @internal */
export const isRuntimeFiber = <E, A>(self: Fiber.Fiber<E, A>): self is Fiber.RuntimeFiber<E, A> =>
  RuntimeFiberTypeId in self

/** @internal */
export const _await = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> => self.await

/** @internal */
export const children = <E, A>(
  self: Fiber.Fiber<E, A>
): Effect.Effect<never, never, Array<Fiber.RuntimeFiber<any, any>>> => self.children

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): Fiber.Fiber<E, A> => ({
  ...fiberProto,
  id: () => FiberId.none,
  await: core.succeed(exit),
  children: core.succeed([]),
  inheritAll: core.unit,
  poll: core.succeed(Option.some(exit)),
  interruptAsFork: () => core.unit
})

/** @internal */
export const dump = <E, A>(self: Fiber.RuntimeFiber<E, A>): Effect.Effect<never, never, Fiber.Fiber.Dump> =>
  core.map(self.status, (status) => ({ id: self.id(), status }))

/** @internal */
export const dumpAll = (
  fibers: Iterable<Fiber.RuntimeFiber<unknown, unknown>>
): Effect.Effect<never, never, Array<Fiber.Fiber.Dump>> => core.forEachSequential(fibers, dump)

/** @internal */
export const fail = <E>(error: E): Fiber.Fiber<E, never> => done(Exit.fail(error))

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Fiber.Fiber<E, never> => done(Exit.failCause(cause))

/** @internal */
export const fromEffect = <E, A>(effect: Effect.Effect<never, E, A>): Effect.Effect<never, never, Fiber.Fiber<E, A>> =>
  core.map(core.exit(effect), done)

/** @internal */
export const id = <E, A>(self: Fiber.Fiber<E, A>): FiberId.FiberId => self.id()

/** @internal */
export const inheritAll = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, void> => self.inheritAll

/** @internal */
export const interrupted = (fiberId: FiberId.FiberId): Fiber.Fiber<never, never> => done(Exit.interrupt(fiberId))

/** @internal */
export const interruptAll = (fibers: Iterable<Fiber.Fiber<any, any>>): Effect.Effect<never, never, void> =>
  core.flatMap(core.fiberId, (fiberId) => pipe(fibers, interruptAllAs(fiberId)))

/** @internal */
export const interruptAllAs = dual<
  (fiberId: FiberId.FiberId) => (fibers: Iterable<Fiber.Fiber<any, any>>) => Effect.Effect<never, never, void>,
  (fibers: Iterable<Fiber.Fiber<any, any>>, fiberId: FiberId.FiberId) => Effect.Effect<never, never, void>
>(2, (fibers, fiberId) =>
  pipe(
    core.forEachSequentialDiscard(fibers, interruptAsFork(fiberId)),
    core.zipRight(pipe(fibers, core.forEachSequentialDiscard(_await)))
  ))

/** @internal */
export const interruptAsFork = dual<
  (fiberId: FiberId.FiberId) => <E, A>(self: Fiber.Fiber<E, A>) => Effect.Effect<never, never, void>,
  <E, A>(self: Fiber.Fiber<E, A>, fiberId: FiberId.FiberId) => Effect.Effect<never, never, void>
>(2, (self, fiberId) => self.interruptAsFork(fiberId))

/** @internal */
export const join = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, E, A> =>
  core.zipLeft(core.flatten(self.await), self.inheritAll)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <E>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E, B>,
  <E, A, B>(self: Fiber.Fiber<E, A>, f: (a: A) => B) => Fiber.Fiber<E, B>
>(2, (self, f) => mapEffect(self, (a) => core.sync(() => f(a))))

/** @internal */
export const mapEffect = dual<
  <A, E2, A2>(f: (a: A) => Effect.Effect<never, E2, A2>) => <E>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, A2>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, f: (a: A) => Effect.Effect<never, E2, A2>) => Fiber.Fiber<E | E2, A2>
>(2, (self, f) => ({
  ...fiberProto,
  id: () => self.id(),
  await: core.flatMap(self.await, Exit.forEachEffect(f)),
  children: self.children,
  inheritAll: self.inheritAll,
  poll: core.flatMap(self.poll, (result) => {
    switch (result._tag) {
      case "None": {
        return core.succeed(Option.none())
      }
      case "Some": {
        return pipe(
          Exit.forEachEffect(result.value, f),
          core.map(Option.some)
        )
      }
    }
  }),
  interruptAsFork: (id) => self.interruptAsFork(id)
}))

/** @internal */
export const mapFiber = dual<
  <E, E2, A, B>(
    f: (a: A) => Fiber.Fiber<E2, B>
  ) => (self: Fiber.Fiber<E, A>) => Effect.Effect<never, never, Fiber.Fiber<E | E2, B>>,
  <E, A, E2, B>(
    self: Fiber.Fiber<E, A>,
    f: (a: A) => Fiber.Fiber<E2, B>
  ) => Effect.Effect<never, never, Fiber.Fiber<E | E2, B>>
>(2, <E, A, E2, B>(
  self: Fiber.Fiber<E, A>,
  f: (a: A) => Fiber.Fiber<E2, B>
) =>
  core.map(
    self.await,
    Exit.match({
      onFailure: (cause): Fiber.Fiber<E | E2, B> => failCause(cause),
      onSuccess: (a) => f(a)
    })
  ))

/** @internal */
export const match = dual<
  <E, A, Z>(
    options: {
      readonly onFiber: (fiber: Fiber.Fiber<E, A>) => Z
      readonly onRuntimeFiber: (fiber: Fiber.RuntimeFiber<E, A>) => Z
    }
  ) => (self: Fiber.Fiber<E, A>) => Z,
  <E, A, Z>(
    self: Fiber.Fiber<E, A>,
    options: {
      readonly onFiber: (fiber: Fiber.Fiber<E, A>) => Z
      readonly onRuntimeFiber: (fiber: Fiber.RuntimeFiber<E, A>) => Z
    }
  ) => Z
>(2, (self, { onFiber, onRuntimeFiber }) => {
  if (isRuntimeFiber(self)) {
    return onRuntimeFiber(self)
  }
  return onFiber(self)
})

/** @internal */
export const never: Fiber.Fiber<never, never> = {
  ...fiberProto,
  id: () => FiberId.none,
  await: core.never,
  children: core.succeed([]),
  inheritAll: core.never,
  poll: core.succeed(Option.none()),
  interruptAsFork: () => core.never
}

/** @internal */
export const orElse = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, A | A2>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, A | A2>
>(2, (self, that) => ({
  ...fiberProto,
  id: () => FiberId.getOrElse(self.id(), that.id()),
  await: core.zipWith(
    self.await,
    that.await,
    (exit1, exit2) => (Exit.isSuccess(exit1) ? exit1 : exit2)
  ),
  children: self.children,
  inheritAll: core.zipRight(that.inheritAll, self.inheritAll),
  poll: core.zipWith(
    self.poll,
    that.poll,
    (option1, option2) => {
      switch (option1._tag) {
        case "None": {
          return Option.none()
        }
        case "Some": {
          return Exit.isSuccess(option1.value) ? option1 : option2
        }
      }
    }
  ),
  interruptAsFork: (id) =>
    pipe(
      core.interruptAsFiber(self, id),
      core.zipRight(pipe(that, core.interruptAsFiber(id))),
      core.asUnit
    )
}))

/** @internal */
export const orElseEither = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, Either.Either<A, A2>>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, Either.Either<A, A2>>
>(2, (self, that) => orElse(map(self, Either.left), map(that, Either.right)))

/** @internal */
export const poll = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Option.Option<Exit.Exit<E, A>>> =>
  self.poll

// forked from https://github.com/sindresorhus/parse-ms/blob/4da2ffbdba02c6e288c08236695bdece0adca173/index.js
// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
/** @internal */
const parseMs = (milliseconds: number) => {
  const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil
  return {
    days: roundTowardsZero(milliseconds / 86400000),
    hours: roundTowardsZero(milliseconds / 3600000) % 24,
    minutes: roundTowardsZero(milliseconds / 60000) % 60,
    seconds: roundTowardsZero(milliseconds / 1000) % 60,
    milliseconds: roundTowardsZero(milliseconds) % 1000,
    microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
    nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
  }
}

/** @internal */
const renderStatus = (status: FiberStatus.FiberStatus): string => {
  if (FiberStatus.isDone(status)) {
    return "Done"
  }
  if (FiberStatus.isRunning(status)) {
    return "Running"
  }

  const isInterruptible = runtimeFlags.interruptible(status.runtimeFlags) ?
    "interruptible" :
    "uninterruptible"
  return `Suspended(${isInterruptible})`
}

/** @internal */
export const pretty = <E, A>(self: Fiber.RuntimeFiber<E, A>): Effect.Effect<never, never, string> =>
  core.flatMap(Clock.currentTimeMillis, (now) =>
    core.map(dump(self), (dump) => {
      const time = now - dump.id.startTimeMillis
      const { days, hours, milliseconds, minutes, seconds } = parseMs(time)
      const lifeMsg = (days === 0 ? "" : `${days}d`) +
        (days === 0 && hours === 0 ? "" : `${hours}h`) +
        (days === 0 && hours === 0 && minutes === 0 ? "" : `${minutes}m`) +
        (days === 0 && hours === 0 && minutes === 0 && seconds === 0 ? "" : `${seconds}s`) +
        `${milliseconds}ms`
      const waitMsg = FiberStatus.isSuspended(dump.status) ?
        (() => {
          const ids = FiberId.ids(dump.status.blockingOn)
          return HashSet.size(ids) > 0
            ? `waiting on ` + Array.from(ids).map((id) => `${id}`).join(", ")
            : ""
        })() :
        ""
      const statusMsg = renderStatus(dump.status)
      return `[Fiber](#${dump.id.id}) (${lifeMsg}) ${waitMsg}\n   Status: ${statusMsg}`
    }))

/** @internal */
export const unsafeRoots = (): Array<Fiber.RuntimeFiber<any, any>> => Array.from(fiberScope.globalScope.roots)

/** @internal */
export const roots: Effect.Effect<never, never, Array<Fiber.RuntimeFiber<any, any>>> = core.sync(unsafeRoots)

/** @internal */
export const status = <E, A>(self: Fiber.RuntimeFiber<E, A>): Effect.Effect<never, never, FiberStatus.FiberStatus> =>
  self.status

/** @internal */
export const succeed = <A>(value: A): Fiber.Fiber<never, A> => done(Exit.succeed(value))

/** @internal */
export const unit: Fiber.Fiber<never, void> = succeed(void 0)

/** @internal */
export const currentFiberURI = "effect/FiberCurrent"

/** @internal */
export const getCurrentFiber = (): Option.Option<Fiber.RuntimeFiber<any, any>> =>
  Option.fromNullable((globalThis as any)[currentFiberURI])
