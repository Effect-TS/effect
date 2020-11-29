/**
 * tracing: off
 */

// option
// cause
import * as Cause from "../Cause/core"
import { pretty } from "../Cause/pretty"
// exit
import { HasClock, LiveClock } from "../Clock"
import type { Exit } from "../Exit/exit"
import { interruptAllAs } from "../Fiber/api"
// fiber
import { _tracing, FiberContext } from "../Fiber/context"
import { interruptible } from "../Fiber/core"
import type { FiberID } from "../Fiber/id"
import { newFiberId } from "../Fiber/id"
import type { Callback } from "../Fiber/state"
import { Platform } from "../Fiber/tracing"
import { constVoid, identity } from "../Function"
import { none } from "../Option"
import { defaultRandom, HasRandom } from "../Random"
import * as Scope from "../Scope"
// supervisor
import * as Supervisor from "../Supervisor"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { accessM, chain_, effectTotal, succeed } from "./core"
import type { Effect, UIO } from "./effect"
import { _I } from "./effect"
import type { FailureReporter } from "./primitives"
import { provideSome_ } from "./provideSome"

// empty function
const empty = () => {
  //
}

export type DefaultEnv = HasClock & HasRandom

export function defaultEnv() {
  return {
    [HasClock.key]: new LiveClock(),
    [HasRandom.key]: defaultRandom
  }
}

export function defaultTeardown(
  status: number,
  id: FiberID,
  onExit: (status: number) => void
) {
  run(interruptAllAs(id)(_tracing.running), () => {
    setTimeout(() => {
      if (_tracing.running.size === 0) {
        onExit(status)
      } else {
        defaultTeardown(status, id, onExit)
      }
    }, 0)
  })
}

export const defaultHook = (
  cont: NodeJS.SignalsListener
): ((signal: NodeJS.Signals) => void) => (signal) => cont(signal)

/**
 * Effect Canceler
 */
export type AsyncCancel<E, A> = UIO<Exit<E, A>>

export const prettyReporter: FailureReporter = (e) => {
  console.error(pretty(e))
}

const defaultPlatform = new Platform(100, 100, true, true, true, true, 100, 100, 100)

export class CustomRuntime<R> {
  constructor(readonly env: R, readonly platform: Platform) {
    this.traceExecution = this.traceExecution.bind(this)
    this.traceExecutionLength = this.traceExecutionLength.bind(this)
    this.traceStack = this.traceStack.bind(this)
    this.traceStackLength = this.traceStackLength.bind(this)
    this.traceEffect = this.traceEffect.bind(this)
    this.initialTracingStatus = this.initialTracingStatus.bind(this)
    this.ancestorExecutionTraceLength = this.ancestorExecutionTraceLength.bind(this)
    this.ancestorStackTraceLength = this.ancestorStackTraceLength.bind(this)
    this.ancestryLength = this.ancestryLength.bind(this)
    this.fiberContext = this.fiberContext.bind(this)
    this.run = this.run.bind(this)
    this.runAsap = this.runAsap.bind(this)
    this.runCancel = this.runCancel.bind(this)
    this.runMain = this.runMain.bind(this)
    this.runPromise = this.runPromise.bind(this)
    this.runPromiseExit = this.runPromiseExit.bind(this)
  }

  fiberContext<E, A>(reporter: FailureReporter = constVoid) {
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
      10_000,
      reporter,
      this.platform,
      none
    )

    return context
  }

  /**
   * Runs effect until completion listening for system level termination signals that
   * triggers cancellation of the process, in case errors are found process will
   * exit with a status of 1 and cause will be pretty printed, if interruption
   * is found without errors the cause is pretty printed and process exits with
   * status 0. In the success scenario process exits with status 0 witout any log.
   *
   * Note: this should be used only in node.js as it depends on global process
   */
  runMain<E>(
    effect: Effect<DefaultEnv, E, void>,
    customHook: (cont: NodeJS.SignalsListener) => NodeJS.SignalsListener = defaultHook,
    customTeardown: typeof defaultTeardown = defaultTeardown
  ): void {
    const context = this.fiberContext<E, void>()

    const onExit = (s: number) => {
      process.exit(s)
    }

    context.evaluateLater(effect[_I])
    context.runAsync((exit) => {
      switch (exit._tag) {
        case "Failure": {
          if (Cause.died(exit.cause) || Cause.failed(exit.cause)) {
            console.error(pretty(exit.cause))
            customTeardown(1, context.id, onExit)
            break
          } else {
            console.log(pretty(exit.cause))
            customTeardown(0, context.id, onExit)
            break
          }
        }
        case "Success": {
          customTeardown(0, context.id, onExit)
          break
        }
      }
    })

    const interrupted = new AtomicBoolean(false)

    const handler: NodeJS.SignalsListener = (signal) => {
      customHook(() => {
        process.removeListener("SIGTERM", handler)
        process.removeListener("SIGINT", handler)

        if (interrupted.compareAndSet(false, true)) {
          this.run(context.interruptAs(context.id))
        }
      })(signal)
    }

    process.once("SIGTERM", handler)
    process.once("SIGINT", handler)
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  run<E, A>(_: Effect<DefaultEnv, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>()

    context.evaluateLater(_[_I])
    context.runAsync(cb || empty)
  }

  /**
   * Runs effect until completion, calling cb with the eventual exit state
   */
  runAsap<E, A>(_: Effect<DefaultEnv, E, A>, cb?: Callback<E, A>) {
    const context = this.fiberContext<E, A>()

    context.evaluateNow(_[_I])
    context.runAsync(cb || empty)
  }

  /**
   * Runs effect until completion returing a cancel effecr that when executed
   * triggers cancellation of the process
   */
  runCancel<E, A>(_: Effect<DefaultEnv, E, A>, cb?: Callback<E, A>): AsyncCancel<E, A> {
    const context = this.fiberContext<E, A>()

    context.evaluateLater(_[_I])
    context.runAsync(cb || empty)

    return context.interruptAs(context.id)
  }

  /**
   * Run effect as a Promise, throwing a the first error or exception
   */
  runPromise<E, A>(_: Effect<DefaultEnv, E, A>): Promise<A> {
    const context = this.fiberContext<E, A>()

    context.evaluateLater(_[_I])

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
  runPromiseExit<E, A>(_: Effect<DefaultEnv, E, A>): Promise<Exit<E, A>> {
    const context = this.fiberContext<E, A>()

    context.evaluateLater(_[_I])

    return new Promise((res) => {
      context.runAsync((exit) => {
        res(exit)
      })
    })
  }

  withEnvironment<R2>(f: (_: R) => R2) {
    return new CustomRuntime(f(this.env), this.platform)
  }

  traceExecution(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        b,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength
      )
    )
  }

  traceExecutionLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        n,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength
      )
    )
  }

  traceStack(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        b,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength
      )
    )
  }

  traceStackLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        n,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength
      )
    )
  }

  traceEffect(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        b,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength
      )
    )
  }

  initialTracingStatus(b: boolean) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        b,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength
      )
    )
  }

  ancestorExecutionTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        n,
        this.platform.ancestorStackTraceLength,
        this.platform.ancestryLength
      )
    )
  }

  ancestorStackTraceLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        n,
        this.platform.ancestryLength
      )
    )
  }

  ancestryLength(n: number) {
    return new CustomRuntime(
      this.env,
      new Platform(
        this.platform.executionTraceLength,
        this.platform.stackTraceLength,
        this.platform.traceExecution,
        this.platform.traceStack,
        this.platform.traceEffects,
        this.platform.initialTracingStatus,
        this.platform.ancestorExecutionTraceLength,
        this.platform.ancestorStackTraceLength,
        n
      )
    )
  }
}

/**
 * Construct custom runtime
 */
export function makeCustomRuntime() {
  return new CustomRuntime(defaultEnv(), defaultPlatform)
}

/**
 * Default runtime
 */
export const defaultRuntime = makeCustomRuntime()

/**
 * Exports of default runtime
 */
export const {
  fiberContext,
  run,
  runAsap,
  runCancel,
  runMain,
  runPromise,
  runPromiseExit
} = defaultRuntime

/**
 * Represent an environment providing function
 */
export interface Runtime<R0> {
  in: <R, E, A>(effect: Effect<R & R0, E, A>) => Effect<R, E, A>
  run: <E, A>(_: Effect<DefaultEnv & R0, E, A>, cb?: Callback<E, A> | undefined) => void
  runCancel: <E, A>(
    _: Effect<DefaultEnv & R0, E, A>,
    cb?: Callback<E, A> | undefined
  ) => UIO<Exit<E, A>>
  runPromise: <E, A>(_: Effect<DefaultEnv & R0, E, A>) => Promise<A>
  runPromiseExit: <E, A>(_: Effect<DefaultEnv & R0, E, A>) => Promise<Exit<E, A>>
}

/**
 * Use current environment to build a runtime that is capable of
 * providing its content to other effects.
 *
 * NOTE: in should be used in a region where current environment
 * is valid (i.e. keep attention to closed resources)
 */
export function runtime<R0>() {
  return accessM((r0: R0) =>
    effectTotal(
      (): Runtime<R0> => {
        return makeRuntime<R0>(r0)
      }
    )
  )
}

export function withRuntimeM<R0, R, E, A>(f: (r: Runtime<R0>) => Effect<R, E, A>) {
  return chain_(runtime<R0>(), f)
}

export function withRuntime<R0, A>(f: (r: Runtime<R0>) => A) {
  return chain_(runtime<R0>(), (r) => succeed(f(r)))
}

export function makeRuntime<R0>(r0: R0): Runtime<R0> {
  return {
    in: <R, E, A>(effect: Effect<R & R0, E, A>) =>
      provideSome_(effect, (r: R) => ({ ...r0, ...r })),
    run: (_, cb) =>
      run(
        provideSome_(_, (r) => ({ ...r0, ...r })),
        cb
      ),
    runCancel: (_, cb) =>
      runCancel(
        provideSome_(_, (r) => ({ ...r0, ...r })),
        cb
      ),
    runPromise: (_) => runPromise(provideSome_(_, (r) => ({ ...r0, ...r }))),
    runPromiseExit: (_) => runPromiseExit(provideSome_(_, (r) => ({ ...r0, ...r })))
  }
}
