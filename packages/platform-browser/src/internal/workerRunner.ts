import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as ExecStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as FiberSet from "effect/FiberSet"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

const cachedPorts = globalValue("@effect/platform-browser/Worker/cachedPorts", () => new Set<MessagePort>())
function globalHandleConnect(event: MessageEvent) {
  cachedPorts.add((event as MessageEvent).ports[0])
}
if (typeof self !== "undefined" && "onconnect" in self) {
  self.onconnect = globalHandleConnect
}

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>() {
    return Effect.sync(() => {
      let currentPortId = 0

      const ports = new Map<number, readonly [MessagePort, Scope.CloseableScope]>()
      const send = (portId: number, message: O, transfer?: ReadonlyArray<unknown>) =>
        Effect.sync(() => {
          ;(ports.get(portId)?.[0] ?? self).postMessage([1, message], {
            transfer: transfer as any
          })
        })

      const run = <A, E, R>(handler: (portId: number, message: I) => Effect.Effect<A, E, R>) =>
        Effect.uninterruptibleMask((restore) =>
          Scope.make().pipe(
            Effect.bindTo("scope"),
            Effect.bind("fiberSet", ({ scope }) => FiberSet.make<any, WorkerError | E>().pipe(Scope.extend(scope))),
            Effect.bind("runFork", ({ fiberSet }) => FiberSet.runtime(fiberSet)<R>()),
            Effect.tap(({ fiberSet, runFork, scope }) => {
              function onMessage(portId: number) {
                return function(event: MessageEvent) {
                  const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
                  if (message[0] === 0) {
                    runFork(restore(handler(portId, message[1])))
                  } else {
                    const port = ports.get(portId)
                    if (port) {
                      Effect.runFork(Scope.close(port[1], Exit.void))
                    }
                    ports.delete(portId)
                    if (ports.size === 0) {
                      Deferred.unsafeDone(fiberSet.deferred, Exit.interrupt(FiberId.none))
                    }
                  }
                }
              }
              function onMessageError(error: MessageEvent) {
                Deferred.unsafeDone(
                  fiberSet.deferred,
                  new WorkerError({ reason: "decode", cause: error.data })
                )
              }
              function onError(error: any) {
                Deferred.unsafeDone(
                  fiberSet.deferred,
                  new WorkerError({ reason: "unknown", cause: error.data })
                )
              }
              function handlePort(port: MessagePort) {
                return Scope.fork(scope, ExecStrategy.sequential).pipe(
                  Effect.flatMap((scope) => {
                    const portId = currentPortId++
                    ports.set(portId, [port, scope])
                    const onMsg = onMessage(portId)
                    port.addEventListener("message", onMsg)
                    port.addEventListener("messageerror", onMessageError)
                    if ("start" in port) {
                      port.start()
                    }
                    port.postMessage([0])
                    return Scope.addFinalizer(
                      scope,
                      Effect.sync(() => {
                        port.removeEventListener("message", onMsg)
                        port.removeEventListener("messageerror", onError)
                      })
                    )
                  }),
                  runFork
                )
              }
              self.addEventListener("error", onError)
              if ("onconnect" in self) {
                self.onconnect = function(event: MessageEvent) {
                  const port = (event as MessageEvent).ports[0]
                  handlePort(port)
                }
                for (const port of cachedPorts) {
                  handlePort(port)
                }
                cachedPorts.clear()
              } else {
                handlePort(self as any)
              }
              return Scope.addFinalizer(
                scope,
                Effect.sync(() => {
                  self.removeEventListener("error", onError)
                  if ("onconnect" in self) {
                    self.onconnect = globalHandleConnect
                  }
                  self.close()
                })
              )
            }),
            Effect.flatMap(({ fiberSet, scope }) =>
              restore(FiberSet.join(fiberSet) as Effect.Effect<never, E | WorkerError>).pipe(
                Effect.ensuring(Scope.close(scope, Exit.void))
              )
            )
          )
        )

      return { run, send }
    })
  }
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)
