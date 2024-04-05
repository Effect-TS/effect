import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FiberSet from "effect/FiberSet"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"

const cachedPorts = globalValue("@effect/platform-browser/Worker/cachedPorts", () => new Set<MessagePort>())
function globalHandleConnect(event: MessageEvent) {
  cachedPorts.add((event as MessageEvent).ports[0])
}
if ("onconnect" in self) {
  self.onconnect = globalHandleConnect
}

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>(shutdown: Effect.Effect<void>) {
    return Effect.gen(function*(_) {
      let currentPortId = 0

      const queue = yield* _(Queue.unbounded<readonly [portId: number, message: I]>())
      const runFork = yield* _(FiberSet.makeRuntime<never>())
      const ports = new Map<number, MessagePort>()
      const send = (portId: number, message: O, transfer?: ReadonlyArray<unknown>) =>
        Effect.sync(() => {
          ports.get(portId)?.postMessage([1, message], {
            transfer: transfer as any
          })
        })

      function handlePort(port: MessagePort, sharedWorker: boolean) {
        const portId = currentPortId++
        ports.set(portId, port)

        Effect.async<never, WorkerError, never>((resume) => {
          function onMessage(event: MessageEvent) {
            const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
            if (message[0] === 0) {
              queue.unsafeOffer([portId, message[1]])
            } else if (sharedWorker) {
              resume(Effect.interrupt)
            } else {
              Effect.runFork(shutdown)
            }
          }
          function onMessageError(error: ErrorEvent) {
            resume(new WorkerError({ reason: "decode", error: error.error ?? error.message }))
          }
          function onError(error: ErrorEvent) {
            resume(new WorkerError({ reason: "unknown", error: error.error ?? error.message }))
          }
          port.addEventListener("message", onMessage as any)
          port.addEventListener("messageerror", onMessageError as any)
          port.addEventListener("error", onError as any)

          // ready
          if ("start" in port) {
            port.start()
          }
          port.postMessage([0])

          return Effect.sync(() => {
            port.removeEventListener("message", onMessage as any)
            port.removeEventListener("messageerror", onMessageError as any)
            port.removeEventListener("error", onError as any)
          })
        }).pipe(
          Effect.tapErrorCause((cause) => Cause.isInterruptedOnly(cause) ? Effect.void : Effect.logDebug(cause)),
          Effect.retry(Schedule.forever),
          Effect.annotateLogs({
            package: "@effect/platform-browser",
            module: "WorkerRunner"
          }),
          Effect.ensuring(Effect.sync(() => {
            ports.delete(portId)
          })),
          Effect.interruptible,
          runFork
        )
      }

      if ("onconnect" in self) {
        self.onconnect = function(event: MessageEvent) {
          const port = (event as MessageEvent).ports[0]
          handlePort(port, true)
        }
        yield* _(Effect.addFinalizer(() =>
          Effect.sync(() => {
            ;(self as any).onconnect = globalHandleConnect
          })
        ))
        for (const port of cachedPorts) {
          handlePort(port, true)
        }
        cachedPorts.clear()
      } else {
        handlePort(self as any, false)
      }

      return { queue, send }
    })
  }
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)
