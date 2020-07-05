import * as http from "http"

import { match } from "path-to-regexp"

import * as A from "../../Array"
import { constVoid, pipe } from "../../Function"
import * as NA from "../../NonEmptyArray"
import * as C from "../Cause"
import * as T from "../Effect"
import { DefaultEnv } from "../Effect/runtime"
import * as E from "../Exit"
import { FiberContext } from "../Fiber/context"
import { newFiberId } from "../Fiber/id"
import { interruptible } from "../Fiber/interruptStatus"
import * as L from "../Layer"
import * as M from "../Managed"
import { _I } from "../Managed/deps"
import * as Q from "../Queue"
import { unsafeMakeScope } from "../Scope"
import { none } from "../Supervisor"
import { AtomicReference } from "../Support/AtomicReference"

export class ProcessRequest {
  readonly _tag = "ProcessRequest"

  constructor(readonly req: http.IncomingMessage, readonly res: http.ServerResponse) {}
}

export class Executor {
  readonly running = new Set<FiberContext<never, void>>()

  constructor(readonly env: DefaultEnv) {
    this.fiberContext = this.fiberContext.bind(this)
    this.runAsync = this.runAsync.bind(this)
  }

  fiberContext() {
    const initialIS = interruptible
    const fiberId = newFiberId()
    const scope = unsafeMakeScope<E.Exit<never, void>>()
    const supervisor = none

    const context = new FiberContext<never, void>(
      fiberId,
      this.env,
      initialIS,
      new Map(),
      supervisor,
      scope
    )

    return context
  }

  runAsync(effect: T.Effect<unknown, DefaultEnv, never, void>) {
    const context = this.fiberContext()

    this.running.add(context)

    context.evaluateLater(effect[_I])

    context.onDone(() => {
      this.running.delete(context)
    })

    return context
  }
}

export const makeExecutor = () => T.access((_: DefaultEnv) => new Executor(_))
export const makeCommandQueue = () => Q.makeUnbounded<ProcessRequest>()

export type Handler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: FinalHandler
) => T.Effect<unknown, DefaultEnv, never, void>

export type HandlerR<R> = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: FinalHandler
) => T.Effect<unknown, DefaultEnv & R, never, void>

export type FinalHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => T.Effect<unknown, DefaultEnv, never, void>

export class Server {
  readonly server = http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      this.executor.runAsync(this.requests.offer(new ProcessRequest(req, res)))
    }
  )

  readonly defaultHandler: FinalHandler = (_, res) =>
    T.effectTotal(() => {
      if (!res.writableEnded) {
        res.statusCode = 404
        res.end()
      }
    })

  handlers = new Array<Handler>()

  addHandler(h: Handler) {
    this.handlers.push(h)
  }

  removeHandler(h: Handler) {
    this.handlers = this.handlers.filter((h1) => h1 !== h)
  }

  finalHandler(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    rest: readonly Handler[] = this.handlers
  ): T.Effect<unknown, DefaultEnv, never, void> {
    if (A.isNonEmpty(rest)) {
      return NA.head(rest)(req, res, (reqR, resN) =>
        this.finalHandler(reqR, resN, NA.tail(rest))
      )
    } else {
      return this.defaultHandler(req, res)
    }
  }

  readonly processFiber = new AtomicReference<FiberContext<never, void> | null>(null)

  constructor(
    readonly requests: Q.Queue<ProcessRequest>,
    readonly executor: Executor
  ) {}

  open(port: number, host: string) {
    return pipe(
      T.effectAsync<unknown, never, void>((cb) => {
        const onErr = (e: any) => {
          cb(T.die(e))
        }
        this.server.listen(port, host, () => {
          this.server.removeListener("error", onErr)
          cb(T.unit)
        })
        this.server.once("error", onErr)
      }),
      T.chain(() =>
        T.effectTotal(() => {
          pipe(
            this.process(),
            (x) => this.executor.runAsync(x),
            (x) => this.processFiber.set(x)
          )
        })
      )
    )
  }

  release() {
    return pipe(
      T.checkDescriptor((d) =>
        T.foreachPar_(this.executor.running, (f) => f.interruptAs(d.id))
      ),
      T.chain((es) =>
        pipe(
          T.effectAsync<unknown, never, void>((cb) => {
            this.server.close((e) => {
              if (e) {
                cb(T.die(e))
              } else {
                cb(T.unit)
              }
            })
          }),
          T.result,
          T.map((e) => [es, e] as const)
        )
      ),
      T.chain(([exits, e]) =>
        pipe(
          exits.filter((e) => !(e._tag === "Failure" && C.interruptedOnly(e.cause))),
          (e) => E.collectAllPar(...e),
          (o) => {
            if (o._tag === "None") {
              return T.done(e)
            }
            return T.orDieKeep(T.done(E.zipWith_(o.value, e, constVoid, C.Then)))
          }
        )
      )
    )
  }

  process(): T.Effect<unknown, unknown, never, void> {
    return pipe(
      this.requests.take,
      T.chain((request) =>
        T.effectTotal(() => {
          pipe(this.finalHandler(request.req, request.res), this.executor.runAsync)
        })
      ),
      T.forever
    )
  }
}

export class ServerConfig {
  constructor(readonly port: number, readonly host: string) {}
}

export function serverLayer<S, C>(
  has: T.Has<Server, S>,
  hasConfig: T.Has<ServerConfig, C>
): L.AsyncR<T.Has<ServerConfig, C> & DefaultEnv, T.Has<Server, S>> {
  return L.service(has)
    .prepare(
      pipe(
        T.sequenceT(makeCommandQueue(), makeExecutor()),
        T.map(([q, e]) => new Server(q, e))
      )
    )
    .open((s) => T.accessServiceM(hasConfig)((sc) => s.open(sc.port, sc.host)))
    .release((s) => s.release())
}

export function route<K>(has: T.Has<Server, K>) {
  return <R>(pattern: string, f: (_: unknown) => HandlerR<R>) => {
    const matcher = match(pattern)

    const acquire = T.accessServiceM(has)((server) =>
      T.access((r: R & DefaultEnv) => {
        const handler: Handler = (req, res, next) => {
          if (req.url) {
            const matchResult = matcher(req.url)

            if (matchResult === false) {
              return next(req, res)
            } else {
              return T.provideAll_(f(matchResult.params)(req, res, next), r)
            }
          } else {
            return next(req, res)
          }
        }

        server.addHandler(handler)

        return {
          handler
        }
      })
    )

    return pipe(
      M.makeExit_(acquire, ({ handler }) =>
        T.accessServiceM(has)((s) =>
          T.effectTotal(() => {
            s.removeHandler(handler)
          })
        )
      ),
      M.map(() => ({})),
      L.fromManagedEnv
    )
  }
}

export const HasServerConfig = T.has<ServerConfig>()()
export const HasServer = T.has<Server>()()

const serverConfig = L.service(HasServerConfig).pure(new ServerConfig(8080, "0.0.0.0"))

const appLayer = pipe(
  L.all(
    route(HasServer)("/home", () => (_, res) =>
      T.accessServiceM(HasServerConfig)((c) =>
        T.effectTotal(() => {
          res.write(`good: ${c.host}:${c.port}`)
          res.end()
        })
      )
    )
  ),
  L.using(serverLayer(HasServer, HasServerConfig)),
  L.using(serverConfig)
)

const cancel = pipe(T.never, T.provideSomeLayer(appLayer), T.runMain)

process.on("SIGINT", () => {
  cancel()
})
