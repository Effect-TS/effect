import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as ExecStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as FiberSet from "effect/FiberSet"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"

const cachedPorts = globalValue("@effect/platform-browser/Worker/cachedPorts", () => new Set<MessagePort>())
function globalHandleConnect(event: MessageEvent) {
  cachedPorts.add((event as MessageEvent).ports[0])
}
if (typeof self !== "undefined" && "onconnect" in self) {
  self.onconnect = globalHandleConnect
}

/** @internal */
export const make = (self: MessagePort | Window) =>
  Runner.PlatformRunner.of({
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
            Effect.gen(function*() {
              const scope = yield* Effect.scope
              const runtime = (yield* Effect.runtime<R | Scope.Scope>()).pipe(
                Runtime.updateContext(Context.omit(Scope.Scope))
              ) as Runtime.Runtime<R>
              const fiberSet = yield* FiberSet.make<any, WorkerError | E>()
              const runFork = Runtime.runFork(runtime)

              function onMessage(portId: number) {
                return function(event: MessageEvent) {
                  const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
                  if (message[0] === 0) {
                    FiberSet.unsafeAdd(fiberSet, runFork(restore(handler(portId, message[1]))))
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
                const fiber = Scope.fork(scope, ExecStrategy.sequential).pipe(
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
                        port.close()
                      })
                    )
                  }),
                  runFork
                )
                FiberSet.unsafeAdd(fiberSet, fiber)
              }
              self.addEventListener("error", onError)
              let prevOnConnect: unknown | undefined
              if ("onconnect" in self) {
                prevOnConnect = self.onconnect
                self.onconnect = function(event: MessageEvent) {
                  const port = (event as MessageEvent).ports[0]
                  handlePort(port)
                }
                for (const port of cachedPorts) {
                  handlePort(port)
                }
                cachedPorts.clear()
                yield* Scope.addFinalizer(
                  scope,
                  Effect.sync(() => self.close())
                )
              } else {
                handlePort(self as any)
              }
              yield* Scope.addFinalizer(
                scope,
                Effect.sync(() => {
                  self.removeEventListener("error", onError)
                  if ("onconnect" in self) {
                    self.onconnect = prevOnConnect
                  }
                })
              )

              return (yield* restore(FiberSet.join(fiberSet))) as never
            }).pipe(Effect.scoped)
          )

        return { run, send }
      })
    }
  })

/** @internal */
export const layerMessagePort = (port: MessagePort | Window) => Layer.succeed(Runner.PlatformRunner, make(port))

/** @internal */
export const layer = Layer.sync(Runner.PlatformRunner, () => make(self))
