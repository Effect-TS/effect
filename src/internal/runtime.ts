import type * as Cause from "../Cause.js"
import * as Context from "../Context.js"
import type * as Effect from "../Effect.js"
import * as Exit from "../Exit.js"
import * as Fiber from "../Fiber.js"
import * as FiberId from "../FiberId.js"
import type * as FiberRef from "../FiberRef.js"
import * as FiberRefs from "../FiberRefs.js"
import { pipe } from "../Function.js"
import { format, NodeInspectSymbol } from "../Inspectable.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as Predicate from "../Predicate.js"
import type * as ReadonlyArray from "../ReadonlyArray.js"
import type * as Runtime from "../Runtime.js"
import type * as RuntimeFlags from "../RuntimeFlags.js"
import * as _scheduler from "../Scheduler.js"
import * as InternalCause from "./cause.js"
import * as core from "./core.js"
import * as FiberRuntime from "./fiberRuntime.js"
import * as fiberScope from "./fiberScope.js"
import * as OpCodes from "./opCodes/effect.js"
import * as runtimeFlags from "./runtimeFlags.js"
import * as _supervisor from "./supervisor.js"

/** @internal */
export const unsafeFork = <R>(runtime: Runtime.Runtime<R>) =>
<E, A>(
  self: Effect.Effect<R, E, A>,
  options?: Runtime.RunForkOptions
): Fiber.RuntimeFiber<E, A> => {
  const fiberId = FiberId.unsafeMake()
  const effect = self

  const fiberRefUpdates: ReadonlyArray.NonEmptyArray<
    readonly [FiberRef.FiberRef<any>, ReadonlyArray.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>]
  > = [[core.currentContext, [[fiberId, runtime.context]]]]

  if (options?.scheduler) {
    fiberRefUpdates.push([_scheduler.currentScheduler, [[fiberId, options.scheduler]]])
  }

  let fiberRefs = FiberRefs.updateManyAs(runtime.fiberRefs, {
    entries: fiberRefUpdates,
    forkAs: fiberId
  })

  if (options?.updateRefs) {
    fiberRefs = options.updateRefs(fiberRefs, fiberId)
  }

  const fiberRuntime: FiberRuntime.FiberRuntime<E, A> = new FiberRuntime.FiberRuntime<E, A>(
    fiberId,
    fiberRefs,
    runtime.runtimeFlags
  )

  const supervisor = fiberRuntime._supervisor

  // we can compare by reference here as _supervisor.none is wrapped with globalValue
  if (supervisor !== _supervisor.none) {
    supervisor.onStart(runtime.context, effect, Option.none(), fiberRuntime)

    fiberRuntime.addObserver((exit) => supervisor.onEnd(exit, fiberRuntime))
  }

  fiberScope.globalScope.add(runtime.runtimeFlags, fiberRuntime)

  fiberRuntime.start(effect)

  return fiberRuntime
}

/** @internal */
export const unsafeRunCallback = <R>(runtime: Runtime.Runtime<R>) =>
<E, A>(
  effect: Effect.Effect<R, E, A>,
  onExit?: (exit: Exit.Exit<E, A>) => void
): (fiberId?: FiberId.FiberId, onExit?: (exit: Exit.Exit<E, A>) => void) => void => {
  const fiberRuntime = unsafeFork(runtime)(effect)

  if (onExit) {
    fiberRuntime.addObserver((exit) => {
      onExit(exit)
    })
  }

  return (id, onExitInterrupt) =>
    unsafeRunCallback(runtime)(
      pipe(fiberRuntime, Fiber.interruptAs(id ?? FiberId.none)),
      onExitInterrupt ?
        (exit) => onExitInterrupt(Exit.flatten(exit)) :
        void 0
    )
}

/** @internal */
export const unsafeRunSync = <R>(runtime: Runtime.Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>): A => {
  const result = unsafeRunSyncExit(runtime)(effect)
  if (result._tag === "Failure") {
    throw fiberFailure(result.i0)
  } else {
    return result.i0
  }
}

/** @internal */
const asyncFiberException = <E, A>(fiber: Fiber.RuntimeFiber<E, A>): Runtime.AsyncFiberException<E, A> => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  const error = (new Error()) as any
  Error.stackTraceLimit = limit
  const message =
    `Fiber #${fiber.id().id} cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
  const _tag = "AsyncFiberException"
  Object.defineProperties(error, {
    _tag: {
      value: _tag
    },
    fiber: {
      value: fiber
    },
    message: {
      value: message
    },
    name: {
      value: _tag
    },
    toString: {
      get() {
        return () => message
      }
    },
    [NodeInspectSymbol]: {
      get() {
        return () => message
      }
    }
  })
  return error
}

/** @internal */
export const isAsyncFiberException = (u: unknown): u is Runtime.AsyncFiberException<unknown, unknown> =>
  Predicate.isTagged(u, "AsyncFiberException") && "fiber" in u

/** @internal */
export const FiberFailureId: Runtime.FiberFailureId = Symbol.for("effect/Runtime/FiberFailure") as any
/** @internal */
export const FiberFailureCauseId: Runtime.FiberFailureCauseId = Symbol.for(
  "effect/Runtime/FiberFailure/Cause"
) as any

type Mutable<A> = {
  -readonly [k in keyof A]: A[k]
}

/** @internal */
export const fiberFailure = <E>(cause: Cause.Cause<E>): Runtime.FiberFailure => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  const error = (new Error()) as Mutable<Runtime.FiberFailure>
  Error.stackTraceLimit = limit
  const prettyErrors = InternalCause.prettyErrors(cause)
  if (prettyErrors.length > 0) {
    const head = prettyErrors[0]
    error.name = head.message.split(":")[0]
    error.message = head.message.substring(error.name.length + 2)
    error.stack = InternalCause.pretty(cause)
  }
  error[FiberFailureId] = FiberFailureId
  error[FiberFailureCauseId] = cause
  error.toJSON = () => {
    return {
      _id: "FiberFailure",
      cause: cause.toJSON()
    }
  }
  error.toString = () => {
    return format(error.toJSON())
  }
  error[NodeInspectSymbol] = () => {
    return error.toJSON()
  }
  return error
}

/** @internal */
export const isFiberFailure = (u: unknown): u is Runtime.FiberFailure => Predicate.hasProperty(u, FiberFailureId)

const fastPath = <R, E, A>(effect: Effect.Effect<R, E, A>): Exit.Exit<E, A> | undefined => {
  const op = effect as core.Primitive
  switch (op._op) {
    case "Failure":
    case "Success": {
      // @ts-expect-error
      return op
    }
    case "Left": {
      return core.exitFail(op.left)
    }
    case "Right": {
      return core.exitSucceed(op.right)
    }
    case "Some": {
      return core.exitSucceed(op.value)
    }
    case "None": {
      // @ts-expect-error
      return core.exitFail(core.NoSuchElementException())
    }
  }
}

/** @internal */
export const unsafeRunSyncExit =
  <R>(runtime: Runtime.Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>): Exit.Exit<E, A> => {
    const op = fastPath(effect)
    if (op) {
      return op
    }
    const scheduler = new _scheduler.SyncScheduler()
    const fiberRuntime = unsafeFork(runtime)(effect, { scheduler })
    scheduler.flush()
    const result = fiberRuntime.unsafePoll()
    if (result) {
      return result
    }
    throw asyncFiberException(fiberRuntime)
  }

/** @internal */
export const unsafeRunPromise =
  <R>(runtime: Runtime.Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>): Promise<A> =>
    unsafeRunPromiseExit(runtime)(effect).then((result) => {
      switch (result._tag) {
        case OpCodes.OP_SUCCESS: {
          return result.i0
        }
        case OpCodes.OP_FAILURE: {
          throw fiberFailure(result.i0)
        }
      }
    })

/** @internal */
export const unsafeRunPromiseExit =
  <R>(runtime: Runtime.Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>): Promise<Exit.Exit<E, A>> =>
    new Promise((resolve) => {
      const op = fastPath(effect)
      if (op) {
        resolve(op)
      }
      unsafeFork(runtime)(effect).addObserver((exit) => {
        resolve(exit)
      })
    })

/** @internal */
export class RuntimeImpl<in R> implements Runtime.Runtime<R> {
  constructor(
    readonly context: Context.Context<R>,
    readonly runtimeFlags: RuntimeFlags.RuntimeFlags,
    readonly fiberRefs: FiberRefs.FiberRefs
  ) {}

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const make = <R>(
  options: {
    readonly context: Context.Context<R>
    readonly runtimeFlags: RuntimeFlags.RuntimeFlags
    readonly fiberRefs: FiberRefs.FiberRefs
  }
): Runtime.Runtime<R> => new RuntimeImpl(options.context, options.runtimeFlags, options.fiberRefs)

/** @internal */
export const runtime = <R>(): Effect.Effect<R, never, Runtime.Runtime<R>> =>
  core.withFiberRuntime<R, never, RuntimeImpl<R>>((state, status) =>
    core.succeed(
      new RuntimeImpl<R>(
        state.getFiberRef(core.currentContext as unknown as FiberRef.FiberRef<Context.Context<R>>),
        status.runtimeFlags,
        state.getFiberRefs()
      )
    )
  )

/** @internal */
export const defaultRuntimeFlags: RuntimeFlags.RuntimeFlags = runtimeFlags.make(
  runtimeFlags.Interruption,
  runtimeFlags.CooperativeYielding,
  runtimeFlags.RuntimeMetrics
)

/** @internal */
export const defaultRuntime = make({
  context: Context.empty(),
  runtimeFlags: defaultRuntimeFlags,
  fiberRefs: FiberRefs.empty()
})

/** @internal */
export const unsafeRunEffect = unsafeRunCallback(defaultRuntime)

/** @internal */
export const unsafeForkEffect = unsafeFork(defaultRuntime)

/** @internal */
export const unsafeRunPromiseEffect = unsafeRunPromise(defaultRuntime)

/** @internal */
export const unsafeRunPromiseExitEffect = unsafeRunPromiseExit(defaultRuntime)

/** @internal */
export const unsafeRunSyncEffect = unsafeRunSync(defaultRuntime)

/** @internal */
export const unsafeRunSyncExitEffect = unsafeRunSyncExit(defaultRuntime)

// circular with Effect

/** @internal */
export const asyncEffect = <R, E, A, R2, E2, X>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Effect.Effect<R2, E2, X>
): Effect.Effect<R | R2, E | E2, A> =>
  core.flatMap(
    core.deferredMake<E | E2, A>(),
    (deferred) =>
      core.flatMap(runtime<R | R2>(), (runtime) =>
        core.uninterruptibleMask((restore) =>
          core.zipRight(
            FiberRuntime.fork(restore(
              core.catchAllCause(
                register((cb) => unsafeRunCallback(runtime)(core.intoDeferred(cb, deferred))),
                (cause) => core.deferredFailCause(deferred, cause)
              )
            )),
            restore(core.deferredAwait(deferred))
          )
        ))
  )
