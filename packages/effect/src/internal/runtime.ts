import { equals } from "effect/Equal"
import type * as ReadonlyArray from "../Array.js"
import type * as Cause from "../Cause.js"
import * as Context from "../Context.js"
import type * as Effect from "../Effect.js"
import * as Exit from "../Exit.js"
import * as Fiber from "../Fiber.js"
import * as FiberId from "../FiberId.js"
import type * as FiberRef from "../FiberRef.js"
import * as FiberRefs from "../FiberRefs.js"
import { dual, pipe } from "../Function.js"
import * as Inspectable from "../Inspectable.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as Predicate from "../Predicate.js"
import type * as Runtime from "../Runtime.js"
import type * as RuntimeFlags from "../RuntimeFlags.js"
import * as _scheduler from "../Scheduler.js"
import * as _scope from "../Scope.js"
import * as InternalCause from "./cause.js"
import * as core from "./core.js"
import * as executionStrategy from "./executionStrategy.js"
import * as FiberRuntime from "./fiberRuntime.js"
import * as fiberScope from "./fiberScope.js"
import * as OpCodes from "./opCodes/effect.js"
import * as runtimeFlags from "./runtimeFlags.js"
import * as _supervisor from "./supervisor.js"

/** @internal */
export const unsafeFork = <R>(runtime: Runtime.Runtime<R>) =>
<A, E>(
  self: Effect.Effect<A, E, R>,
  options?: Runtime.RunForkOptions
): Fiber.RuntimeFiber<A, E> => {
  const fiberId = FiberId.unsafeMake()
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

  const fiberRuntime: FiberRuntime.FiberRuntime<A, E> = new FiberRuntime.FiberRuntime<A, E>(
    fiberId,
    fiberRefs,
    runtime.runtimeFlags
  )

  let effect: Effect.Effect<A, E, R> = self

  if (options?.scope) {
    effect = core.flatMap(
      _scope.fork(options.scope, executionStrategy.sequential),
      (closeableScope) =>
        core.zipRight(
          core.scopeAddFinalizer(
            closeableScope,
            core.fiberIdWith((id) =>
              equals(id, fiberRuntime.id()) ? core.void : core.interruptAsFiber(fiberRuntime, id)
            )
          ),
          core.onExit(self, (exit) => _scope.close(closeableScope, exit))
        )
    )
  }

  const supervisor = fiberRuntime._supervisor

  // we can compare by reference here as _supervisor.none is wrapped with globalValue
  if (supervisor !== _supervisor.none) {
    supervisor.onStart(runtime.context, effect, Option.none(), fiberRuntime)

    fiberRuntime.addObserver((exit) => supervisor.onEnd(exit, fiberRuntime))
  }

  fiberScope.globalScope.add(runtime.runtimeFlags, fiberRuntime)

  // Only an explicit false will prevent immediate execution
  if (options?.immediate === false) {
    fiberRuntime.resume(effect)
  } else {
    fiberRuntime.start(effect)
  }

  return fiberRuntime
}

/** @internal */
export const unsafeRunCallback = <R>(runtime: Runtime.Runtime<R>) =>
<A, E>(
  effect: Effect.Effect<A, E, R>,
  options: Runtime.RunCallbackOptions<A, E> = {}
): (fiberId?: FiberId.FiberId, options?: Runtime.RunCallbackOptions<A, E> | undefined) => void => {
  const fiberRuntime = unsafeFork(runtime)(effect, options)

  if (options.onExit) {
    fiberRuntime.addObserver((exit) => {
      options.onExit!(exit)
    })
  }

  return (id, cancelOptions) =>
    unsafeRunCallback(runtime)(
      pipe(fiberRuntime, Fiber.interruptAs(id ?? FiberId.none)),
      {
        ...cancelOptions,
        onExit: cancelOptions?.onExit
          ? (exit) => cancelOptions.onExit!(Exit.flatten(exit))
          : undefined
      }
    )
}

/** @internal */
export const unsafeRunSync = <R>(runtime: Runtime.Runtime<R>) => <A, E>(effect: Effect.Effect<A, E, R>): A => {
  const result = unsafeRunSyncExit(runtime)(effect)
  if (result._tag === "Failure") {
    throw fiberFailure(result.effect_instruction_i0)
  } else {
    return result.effect_instruction_i0
  }
}

class AsyncFiberExceptionImpl<A, E = never> extends Error implements Runtime.AsyncFiberException<A, E> {
  readonly _tag = "AsyncFiberException"
  constructor(readonly fiber: Fiber.RuntimeFiber<A, E>) {
    super(
      `Fiber #${fiber.id().id} cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work`
    )
    this.name = this._tag
    this.stack = this.message
  }
}

const asyncFiberException = <A, E>(fiber: Fiber.RuntimeFiber<A, E>): Runtime.AsyncFiberException<A, E> => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  const error = new AsyncFiberExceptionImpl(fiber)
  Error.stackTraceLimit = limit
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

class FiberFailureImpl extends Error implements Runtime.FiberFailure {
  readonly [FiberFailureId]: Runtime.FiberFailureId
  readonly [FiberFailureCauseId]: Cause.Cause<unknown>
  constructor(cause: Cause.Cause<unknown>) {
    super()

    this[FiberFailureId] = FiberFailureId
    this[FiberFailureCauseId] = cause

    const prettyErrors = InternalCause.prettyErrors(cause)
    if (prettyErrors.length > 0) {
      const head = prettyErrors[0]
      this.name = head.message.split(":")[0]
      this.message = head.message.substring(this.name.length + 2)
      this.stack = InternalCause.pretty(cause)
    }

    this.name = `(FiberFailure) ${this.name}`
  }

  toJSON(): unknown {
    return {
      _id: "FiberFailure",
      cause: this[FiberFailureCauseId].toJSON()
    }
  }
  toString(): string {
    return "(FiberFailure) " + InternalCause.pretty(this[FiberFailureCauseId])
  }
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toString()
  }
}

/** @internal */
export const fiberFailure = <E>(cause: Cause.Cause<E>): Runtime.FiberFailure => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  const error = new FiberFailureImpl(cause)
  Error.stackTraceLimit = limit
  return error
}

/** @internal */
export const isFiberFailure = (u: unknown): u is Runtime.FiberFailure => Predicate.hasProperty(u, FiberFailureId)

const fastPath = <A, E, R>(effect: Effect.Effect<A, E, R>): Exit.Exit<A, E> | undefined => {
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
  <R>(runtime: Runtime.Runtime<R>) => <A, E>(effect: Effect.Effect<A, E, R>): Exit.Exit<A, E> => {
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
export const unsafeRunPromise = <R>(runtime: Runtime.Runtime<R>) =>
<A, E>(
  effect: Effect.Effect<A, E, R>,
  options?: {
    readonly signal?: AbortSignal | undefined
  } | undefined
): Promise<A> =>
  unsafeRunPromiseExit(runtime)(effect, options).then((result) => {
    switch (result._tag) {
      case OpCodes.OP_SUCCESS: {
        return result.effect_instruction_i0
      }
      case OpCodes.OP_FAILURE: {
        throw fiberFailure(result.effect_instruction_i0)
      }
    }
  })

/** @internal */
export const unsafeRunPromiseExit = <R>(runtime: Runtime.Runtime<R>) =>
<A, E>(
  effect: Effect.Effect<A, E, R>,
  options?: {
    readonly signal?: AbortSignal | undefined
  } | undefined
): Promise<Exit.Exit<A, E>> =>
  new Promise((resolve) => {
    const op = fastPath(effect)
    if (op) {
      resolve(op)
    }
    const fiber = unsafeFork(runtime)(effect)
    fiber.addObserver((exit) => {
      resolve(exit)
    })
    if (options?.signal !== undefined) {
      if (options.signal.aborted) {
        fiber.unsafeInterruptAsFork(fiber.id())
      } else {
        options.signal.addEventListener("abort", () => {
          fiber.unsafeInterruptAsFork(fiber.id())
        })
      }
    }
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
export const runtime = <R>(): Effect.Effect<Runtime.Runtime<R>, never, R> =>
  core.withFiberRuntime((state, status) =>
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
export const updateRuntimeFlags: {
  (
    f: (flags: RuntimeFlags.RuntimeFlags) => RuntimeFlags.RuntimeFlags
  ): <R>(self: Runtime.Runtime<R>) => Runtime.Runtime<R>
  <R>(self: Runtime.Runtime<R>, f: (flags: RuntimeFlags.RuntimeFlags) => RuntimeFlags.RuntimeFlags): Runtime.Runtime<R>
} = dual(
  2,
  <R>(self: Runtime.Runtime<R>, f: (flags: RuntimeFlags.RuntimeFlags) => RuntimeFlags.RuntimeFlags) =>
    make({
      context: self.context,
      runtimeFlags: f(self.runtimeFlags),
      fiberRefs: self.fiberRefs
    })
)

/** @internal */
export const disableRuntimeFlag: {
  (flag: RuntimeFlags.RuntimeFlag): <R>(self: Runtime.Runtime<R>) => Runtime.Runtime<R>
  <R>(self: Runtime.Runtime<R>, flag: RuntimeFlags.RuntimeFlag): Runtime.Runtime<R>
} = dual(
  2,
  <R>(self: Runtime.Runtime<R>, flag: RuntimeFlags.RuntimeFlag) => updateRuntimeFlags(self, runtimeFlags.disable(flag))
)

/** @internal */
export const enableRuntimeFlag: {
  (flag: RuntimeFlags.RuntimeFlag): <R>(self: Runtime.Runtime<R>) => Runtime.Runtime<R>
  <R>(self: Runtime.Runtime<R>, flag: RuntimeFlags.RuntimeFlag): Runtime.Runtime<R>
} = dual(
  2,
  <R>(self: Runtime.Runtime<R>, flag: RuntimeFlags.RuntimeFlag) => updateRuntimeFlags(self, runtimeFlags.enable(flag))
)

/** @internal */
export const updateContext: {
  <R, R2>(f: (context: Context.Context<R>) => Context.Context<R2>): (self: Runtime.Runtime<R>) => Runtime.Runtime<R2>
  <R, R2>(self: Runtime.Runtime<R>, f: (context: Context.Context<R>) => Context.Context<R2>): Runtime.Runtime<R2>
} = dual(
  2,
  <R, R2>(self: Runtime.Runtime<R>, f: (context: Context.Context<R>) => Context.Context<R2>) =>
    make({
      context: f(self.context),
      runtimeFlags: self.runtimeFlags,
      fiberRefs: self.fiberRefs
    })
)

/** @internal */
export const provideService: {
  <I, S>(tag: Context.Tag<I, S>, service: S): <R>(self: Runtime.Runtime<R>) => Runtime.Runtime<R | I>
  <R, I, S>(self: Runtime.Runtime<R>, tag: Context.Tag<I, S>, service: S): Runtime.Runtime<R | I>
} = dual(
  3,
  <R, I, S>(self: Runtime.Runtime<R>, tag: Context.Tag<I, S>, service: S) =>
    updateContext(self, Context.add(tag, service))
)

/** @internal */
export const updateFiberRefs: {
  (f: (fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs): <R>(self: Runtime.Runtime<R>) => Runtime.Runtime<R>
  <R>(self: Runtime.Runtime<R>, f: (fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs): Runtime.Runtime<R>
} = dual(
  2,
  <R>(self: Runtime.Runtime<R>, f: (fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs): Runtime.Runtime<R> =>
    make({
      context: self.context,
      runtimeFlags: self.runtimeFlags,
      fiberRefs: f(self.fiberRefs)
    })
)

/** @internal */
export const setFiberRef: {
  <A>(fiberRef: FiberRef.FiberRef<A>, value: A): <R>(self: Runtime.Runtime<R>) => Runtime.Runtime<R>
  <R, A>(self: Runtime.Runtime<R>, fiberRef: FiberRef.FiberRef<A>, value: A): Runtime.Runtime<R>
} = dual(
  3,
  <R, A>(self: Runtime.Runtime<R>, fiberRef: FiberRef.FiberRef<A>, value: A): Runtime.Runtime<R> =>
    updateFiberRefs(
      self,
      FiberRefs.updateAs({
        fiberId: FiberId.none,
        fiberRef,
        value
      })
    )
)

/** @internal */
export const deleteFiberRef: {
  <A>(fiberRef: FiberRef.FiberRef<A>): <R>(self: Runtime.Runtime<R>) => Runtime.Runtime<R>
  <R, A>(self: Runtime.Runtime<R>, fiberRef: FiberRef.FiberRef<A>): Runtime.Runtime<R>
} = dual(
  2,
  <R, A>(self: Runtime.Runtime<R>, fiberRef: FiberRef.FiberRef<A>): Runtime.Runtime<R> =>
    updateFiberRefs(self, FiberRefs.delete(fiberRef))
)

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
export const asyncEffect = <A, E, R, R3, E2, R2>(
  register: (
    callback: (_: Effect.Effect<A, E, R>) => void
  ) => Effect.Effect<Effect.Effect<void, never, R3> | void, E2, R2>
): Effect.Effect<A, E | E2, R | R2 | R3> =>
  core.suspend(() => {
    let cleanup: Effect.Effect<void, never, R3> | void = undefined
    return core.flatMap(
      core.deferredMake<A, E | E2>(),
      (deferred) =>
        core.flatMap(runtime<R | R2 | R3>(), (runtime) =>
          core.uninterruptibleMask((restore) =>
            core.zipRight(
              FiberRuntime.fork(restore(
                core.matchCauseEffect(
                  register((cb) => unsafeRunCallback(runtime)(core.intoDeferred(cb, deferred))),
                  {
                    onFailure: (cause) => core.deferredFailCause(deferred, cause),
                    onSuccess: (cleanup_) => {
                      cleanup = cleanup_
                      return core.void
                    }
                  }
                )
              )),
              restore(core.onInterrupt(core.deferredAwait(deferred), () => cleanup ?? core.void))
            )
          ))
    )
  })
