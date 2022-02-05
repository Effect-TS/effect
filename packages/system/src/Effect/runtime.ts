// ets_tracing: off

// option
// cause
import * as Cause from "../Cause/core.js"
import type { Renderer } from "../Cause/Pretty/index.js"
import { defaultRenderer, pretty } from "../Cause/Pretty/index.js"
// exit
import { HasClock, LiveClock } from "../Clock/index.js"
import { flatten as exitFlatten } from "../Exit/core.js"
import type { Exit } from "../Exit/exit.js"
// fiber
import { FiberContext } from "../Fiber/context.js"
import { interruptible } from "../Fiber/core.js"
import { newFiberId } from "../Fiber/id.js"
import { Platform } from "../Fiber/platform.js"
import type { Callback } from "../Fiber/state.js"
import { constVoid, identity } from "../Function/index.js"
import * as O from "../Option/index.js"
import { none } from "../Option/index.js"
import { defaultRandom, HasRandom } from "../Random/index.js"
import * as Scope from "../Scope/index.js"
// supervisor
import * as Supervisor from "../Supervisor/index.js"
import { isTracingEnabled } from "../Tracing/index.js"
import * as core from "./core.js"
import type { Effect, UIO } from "./effect.js"
import type { FailureReporter } from "./primitives.js"
import { instruction, IPlatform } from "./primitives.js"

// empty function
const empty = () => {
  //
}

export type DefaultEnv = HasClock & HasRandom

export const defaultEnv: DefaultEnv = {
  [HasClock.key]: new LiveClock(),
  [HasRandom.key]: defaultRandom
} as any

/**
 * Effect Canceler
 */
export type AsyncCancel<E, A> = UIO<Exit<E, A>>

export const prettyReporter: FailureReporter = (e) => {
  console.error(pretty(e, defaultRenderer))
}

export const defaultPlatform = new Platform({
  executionTraceLength: 25,
  stackTraceLength: 25,
  traceExecution: isTracingEnabled(),
  traceStack: isTracingEnabled(),
  traceEffects: isTracingEnabled(),
  initialTracingStatus: isTracingEnabled(),
  ancestorExecutionTraceLength: 25,
  ancestorStackTraceLength: 25,
  ancestryLength: 25,
  renderer: defaultRenderer,
  reportFailure: constVoid,
  maxOp: 2048,
  supervisor: Supervisor.trackMainFibers
})

export class CustomRuntime<R, X> {
  constructor(readonly env: R, readonly platform: Platform<X>) {
    this.traceExecution = this.traceExecution.bind(this)
    this.executionTraceLength = this.executionTraceLength.bind(this)
    this.traceStack = this.traceStack.bind(this)
    this.stackTraceLength = this.stackTraceLength.bind(this)
    this.traceEffect = this.traceEffect.bind(this)
    this.initialTracingStatus = this.initialTracingStatus.bind(this)
    this.ancestorExecutionTraceLength = this.ancestorExecutionTraceLength.bind(this)
    this.ancestorStackTraceLength = this.ancestorStackTraceLength.bind(this)
    this.ancestryLength = this.ancestryLength.bind(this)
    this.fiberContext = this.fiberContext.bind(this)
    this.run = this.run.bind(this)
    this.runCancel = this.runCancel.bind(this)
    this.runPromise = this.runPromise.bind(this)
    this.runPromiseExit = this.runPromiseExit.bind(this)
    this.traceRenderer = this.traceRenderer.bind(this)
    this.runFiber = this.runFiber.bind(this)
  }

  private fiberContext<E, A>(effect: Effect<R, E, A>) {
    const initialIS = interruptible
    const fiberId = newFiberId()
    const scope = Scope.unsafeMakeScope<Exit<E, A>>()
    const supervisor = Supervisor.none

    const context = new FiberContext<E, A>(
      fiberId,
      this.env,
      initialIS,
      new Map(),
      supervisor,
      scope,
      this.platform.value.maxOp,
      this.platform.value.reportFailure,
      this.platform,
      none,
      this.platform.value.initialTracingStatus
    )

    if (supervisor !== Supervisor.none) {
      supervisor.unsafeOnStart(this.env, effect, O.none, context)
      context.onDone((exit) => supervisor.unsafeOnEnd(exitFlatten(exit), context))
    }

    context.evaluateLater(instruction(effect))

    return context
  }

  supervised<Y>(supervisor: Supervisor.Supervisor<Y>): CustomRuntime<R, Y> {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, supervisor })
    )
  }

  runFiber<E, A>(self: Effect<R, E, A>): FiberContext<E, A> {
    const context = this.fiberContext<E, A>(self)

    return context
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  run<E, A>(self: Effect<R, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>(self)

    context.runAsync(cb || empty)
  }

  /**
   * Runs effect until completion returing a cancel effecr that when executed
   * triggers cancellation of the process
   */
  runCancel<E, A>(self: Effect<R, E, A>, cb?: Callback<E, A>): AsyncCancel<E, A> {
    const context = this.fiberContext<E, A>(self)

    context.runAsync(cb || empty)

    return context.interruptAs(context.id)
  }

  /**
   * Run effect as a Promise, throwing a the first error or exception
   */
  runPromise<E, A>(self: Effect<R, E, A>): Promise<A> {
    const context = this.fiberContext<E, A>(self)

    return new Promise((res, rej) => {
      context.runAsync((exit) => {
        switch (exit._tag) {
          case "Success": {
            res(exit.value)
            break
          }
          case "Failure": {
            rej(Cause.squash(identity)(exit.cause))
            break
          }
        }
      })
    })
  }

  /**
   * Run effect as a Promise of the Exit state
   * in case of error.
   */
  runPromiseExit<E, A>(self: Effect<R, E, A>): Promise<Exit<E, A>> {
    const context = this.fiberContext<E, A>(self)

    return new Promise((res) => {
      context.runAsync((exit) => {
        res(exit)
      })
    })
  }

  withEnvironment<R2>(f: (_: R) => R2) {
    return new CustomRuntime(f(this.env), this.platform)
  }

  traceRenderer(renderer: Renderer) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, renderer })
    )
  }

  traceExecution(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, traceExecution: b })
    )
  }

  executionTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, executionTraceLength: n })
    )
  }

  traceStack(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, traceStack: b })
    )
  }

  stackTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, stackTraceLength: n })
    )
  }

  traceEffect(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, traceEffects: b })
    )
  }

  initialTracingStatus(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, initialTracingStatus: b })
    )
  }

  ancestorExecutionTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, ancestorExecutionTraceLength: n })
    )
  }

  ancestorStackTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, ancestorStackTraceLength: n })
    )
  }

  ancestryLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, ancestryLength: n })
    )
  }

  reportFailure(reportFailure: (_: Cause.Cause<unknown>) => void) {
    return new CustomRuntime(
      this.env,
      new Platform({ ...this.platform.value, reportFailure })
    )
  }

  maxOp(maxOp: number) {
    return new CustomRuntime(this.env, new Platform({ ...this.platform.value, maxOp }))
  }
}

/**
 * Construct custom runtime
 */
export function makeCustomRuntime<R, X>(env: R, platform: Platform<X>) {
  return new CustomRuntime(env, platform)
}

/**
 * Default runtime
 */
export const defaultRuntime = makeCustomRuntime(defaultEnv, defaultPlatform)

/**
 * Exports of default runtime
 */
export const { run, runCancel, runFiber, runPromise, runPromiseExit } = defaultRuntime

/**
 * Use current environment to build a runtime that is capable of
 * providing its content to other effects.
 *
 * NOTE: in should be used in a region where current environment
 * is valid (i.e. keep attention to closed resources)
 */
export function runtime<R0>() {
  return core.accessM(
    (r0: R0) =>
      new IPlatform((platform) =>
        core.succeedWith((): CustomRuntime<R0, unknown> => {
          return makeCustomRuntime<R0, unknown>(r0, platform)
        })
      )
  )
}

export function withRuntimeM<R0, R, E, A>(
  f: (r: CustomRuntime<R0, unknown>) => Effect<R, E, A>
) {
  return core.chain_(runtime<R0>(), f)
}

export function withRuntime<R0, A>(f: (r: CustomRuntime<R0, unknown>) => A) {
  return core.chain_(runtime<R0>(), (r) => core.succeed(f(r)))
}
