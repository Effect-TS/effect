import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as ExecStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as FiberSet from "effect/FiberSet"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
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
    start: Effect.fnUntraced(function*<I, O>(closeLatch: Deferred.Deferred<void, WorkerError>) {
      const disconnects = yield* Mailbox.make<number>()
      let currentPortId = 0

      const ports = new Map<number, readonly [MessagePort, Scope.CloseableScope]>()
      const send = (portId: number, message: O, transfer?: ReadonlyArray<unknown>) =>
        Effect.sync(() => {
          ;(ports.get(portId)?.[0] ?? self).postMessage([1, message], {
            transfer: transfer as any
          })
        })

      const run = Effect.fnUntraced(function*<A, E, R>(
        handler: (portId: number, message: I) => Effect.Effect<A, E, R> | void
      ) {
        const scope = yield* Effect.scope
        const runtime = (yield* Effect.interruptible(Effect.runtime<R | Scope.Scope>())).pipe(
          Runtime.updateContext(Context.omit(Scope.Scope))
        ) as Runtime.Runtime<R>
        const fiberSet = yield* FiberSet.make<any, WorkerError | E>()
        const runFork = Runtime.runFork(runtime)
        function onExit(exit: Exit.Exit<any, E>) {
          if (exit._tag === "Failure" && !Cause.isInterruptedOnly(exit.cause)) {
            Deferred.unsafeDone(closeLatch, Exit.die(Cause.squash(exit.cause)))
          }
        }

        function onMessage(portId: number) {
          return function(event: MessageEvent) {
            const message = event.data as Runner.BackingRunner.Message<I>
            if (message[0] === 0) {
              const result = handler(portId, message[1])
              if (Effect.isEffect(result)) {
                const fiber = runFork(result)
                fiber.addObserver(onExit)
                FiberSet.unsafeAdd(fiberSet, fiber)
              }
            } else {
              const port = ports.get(portId)
              if (!port) {
                return
              } else if (ports.size === 1) {
                // let the last port close with the outer scope
                return Deferred.unsafeDone(closeLatch, Exit.void)
              }
              ports.delete(portId)
              Effect.runFork(Scope.close(port[1], Exit.void))
            }
          }
        }
        function onMessageError(error: MessageEvent) {
          Deferred.unsafeDone(
            closeLatch,
            new WorkerError({ reason: "decode", cause: error.data })
          )
        }
        function onError(error: any) {
          Deferred.unsafeDone(
            closeLatch,
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
          fiber.addObserver(onExit)
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
      })

      return identity<Runner.BackingRunner<I, O>>({ run, send, disconnects })
    }) as any
  })

/** @internal */
export const layerMessagePort = (port: MessagePort | Window) => Layer.succeed(Runner.PlatformRunner, make(port))

/** @internal */
export const layer = Layer.sync(Runner.PlatformRunner, () => make(self))
