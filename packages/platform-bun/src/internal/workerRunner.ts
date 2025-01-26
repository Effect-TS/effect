import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"

declare const self: MessagePort

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start: Effect.fnUntraced(function*(closeLatch: Deferred.Deferred<void, WorkerError>) {
    if (!("postMessage" in self)) {
      return yield* new WorkerError({ reason: "spawn", cause: new Error("not in a Worker context") })
    }
    const port = self
    const run = Effect.fnUntraced(function*<A, E, R>(
      handler: (portId: number, message: any) => Effect.Effect<A, E, R> | void
    ) {
      const scope = yield* Effect.scope
      const runtime = (yield* Effect.runtime<R | Scope.Scope>().pipe(
        Effect.interruptible
      )).pipe(
        Runtime.updateContext(Context.omit(Scope.Scope))
      ) as Runtime.Runtime<R>
      const fiberSet = yield* FiberSet.make<any, WorkerError | E>()
      const runFork = Runtime.runFork(runtime)
      const onExit = (exit: Exit.Exit<any, E>) => {
        if (exit._tag === "Failure" && !Cause.isInterruptedOnly(exit.cause)) {
          Deferred.unsafeDone(closeLatch, Exit.die(Cause.squash(exit.cause)))
        }
      }

      function onMessage(event: MessageEvent) {
        const message = (event as MessageEvent).data as Runner.BackingRunner.Message<any>
        if (message[0] === 0) {
          const result = handler(0, message[1])
          if (Effect.isEffect(result)) {
            const fiber = runFork(result)
            fiber.addObserver(onExit)
            FiberSet.unsafeAdd(fiberSet, fiber)
          }
        } else {
          port.close()
          Deferred.unsafeDone(closeLatch, Exit.void)
        }
      }
      function onMessageError(error: MessageEvent) {
        Deferred.unsafeDone(
          closeLatch,
          new WorkerError({ reason: "decode", cause: error.data })
        )
      }
      function onError(error: MessageEvent) {
        Deferred.unsafeDone(
          closeLatch,
          new WorkerError({ reason: "unknown", cause: error.data })
        )
      }
      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          port.removeEventListener("message", onMessage)
          port.removeEventListener("messageerror", onError)
        })
      )
      port.addEventListener("message", onMessage)
      port.addEventListener("messageerror", onMessageError)
      port.postMessage([0])
    })
    const send = (_portId: number, message: any, transfer?: ReadonlyArray<unknown>) =>
      Effect.sync(() =>
        port.postMessage([1, message], {
          transfer: transfer as any
        })
      )
    return { run, send }
  })
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)
