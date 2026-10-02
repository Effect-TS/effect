/**
 * Node socket adapters for Effect sockets.
 *
 * This module opens `node:net` or `node:tls` connections, or wraps existing
 * Node `Duplex` streams, and presents them as `Socket.Socket` values, socket
 * channels, or layers. It also exposes the `NetSocket` service tag for the
 * underlying Node socket.
 *
 * @since 4.0.0
 */
import * as Arr from "effect/Array"
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Function from "effect/Function"
import { identity } from "effect/Function"
import * as Latch from "effect/Latch"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as Socket from "effect/socket/Socket"
import { Buffer } from "node:buffer"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as Tls from "node:tls"

const isDeno = "Deno" in globalThis

/**
 * Service tag for the underlying Node `net.Socket` associated with the current
 * socket connection.
 *
 * @category services
 * @since 4.0.0
 */
export class NetSocket extends Context.Service<NetSocket, Net.Socket>()(
  "@effect/platform-node/NodeSocket/NetSocket"
) {}

const readAvailable = (
  conn: Duplex
): Arr.NonEmptyReadonlyArray<Uint8Array | string> | null => {
  const first = conn.read() as Uint8Array | string | null
  if (first === null) return null
  const second = conn.read() as Uint8Array | string | null
  if (second === null) return [first]
  const out: [Uint8Array | string, ...Array<Uint8Array | string>] = [first, second]
  let chunk: Uint8Array | string | null
  while ((chunk = conn.read() as Uint8Array | string | null) !== null) {
    out.push(chunk)
  }
  return out
}

const toBuffers = (input: string | Uint8Array | ReadonlyArray<string | Uint8Array>): Array<Buffer> =>
  Arr.map(Arr.ensure(input), (value) => Buffer.from(value))

const closeSocket = (conn: Net.Socket, isOpen: boolean, destroyOnClose: boolean) => {
  if (conn.destroyed) return
  if (destroyOnClose || !isOpen || !("destroySoon" in conn)) {
    conn.destroy()
  } else {
    conn.destroySoon()
  }
}

/**
 * Opens a Node TCP connection as an Effect socket.
 *
 * **When to use**
 *
 * Use to create a `Socket.Socket` whose reader acquisition dials
 * `net.createConnection`.
 *
 * **Details**
 *
 * Supports `openTimeout` and closes or destroys the underlying socket when the
 * reader scope is finalized.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeNet = (
  options: Net.NetConnectOpts & {
    readonly destroyOnClose?: boolean | undefined
    readonly openTimeout?: Duration.Input | undefined
    readonly tlsUpgradeOptions?: Tls.ConnectionOptions | undefined
  }
): Effect.Effect<Socket.Socket> =>
  fromDuplex(
    Effect.contextWith((context: Context.Context<Scope.Scope>) => {
      let conn: Net.Socket | undefined
      let isOpen = false
      return Effect.flatMap(
        Scope.addFinalizer(
          Context.get(context, Scope.Scope),
          Effect.sync(() => {
            if (!conn) return
            closeSocket(conn, isOpen, options.destroyOnClose === true)
          })
        ),
        () =>
          Effect.callback<Net.Socket, Socket.SocketError, never>((resume) => {
            try {
              conn = Net.createConnection(options)
            } catch (cause) {
              resume(Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketOpenError({ kind: "Unknown", cause })
                })
              ))
              return
            }
            conn.once("connect", () => {
              isOpen = true
              resume(Effect.succeed(conn!))
            })
            conn.on("error", (cause: Error) => {
              resume(Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketOpenError({ kind: "Unknown", cause })
                })
              ))
            })
          })
      )
    }),
    options
  )

/**
 * Adapts a Node `Duplex` into a `Socket.Socket`.
 *
 * **Details**
 *
 * Reader acquisition opens the duplex and keeps it paused: each pull drains
 * Node's internal buffer with `stream.read()`. On Node 26+ that yields each
 * buffered chunk as a separate batch element with no copy. Earlier Node
 * concatenates the buffer into one chunk. `run` switches to native `data`
 * delivery and calls synchronous consumers directly. Returning an Effect
 * pauses delivery until it completes; interrupting the loop restores pulling.
 * Both modes apply native receive backpressure. Reentrant callback delivery
 * retains pending chunks in order until the current consumer can proceed.
 *
 * Writes use `write()` return-value backpressure, awaiting one `drain` when
 * the internal buffer is full. `writeAll` corks the stream around the batch.
 * Releasing the writer scope half-closes the stream (`end()`). Native TLS
 * upgrade defaults can be supplied through `tlsUpgradeOptions`; defined
 * portable upgrade settings override them.
 *
 * @category constructors
 * @since 4.0.0
 */
export const fromDuplex = <RO>(
  open: Effect.Effect<Duplex, Socket.SocketError, RO>,
  options?: {
    readonly openTimeout?: Duration.Input | undefined
    readonly tlsServer?: boolean | undefined
    readonly tlsUpgradeOptions?: Tls.ConnectionOptions | undefined
  }
): Effect.Effect<Socket.Socket, never, Exclude<RO, Scope.Scope>> =>
  Effect.withFiber<Socket.Socket, never, Exclude<RO, Scope.Scope>>((fiber) => {
    let currentSocket: Duplex | undefined
    const latch = Latch.makeUnsafe(false)
    const openServices = fiber.context as Context.Context<RO>
    const isServer = options?.tlsServer === true
    const secureEvent = isServer ? "secure" : "secureConnect"

    const reader: Socket.Socket["reader"] = Effect.gen(function*() {
      const scope = yield* Effect.scope
      let conn = yield* Scope.provide(open, scope).pipe(
        options?.openTimeout !== undefined ?
          Effect.timeoutOrElse({
            duration: options.openTimeout,
            orElse: () =>
              Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketOpenError({ kind: "Timeout", cause: new Error("Connection timed out") })
                })
              )
          }) :
          identity
      )

      type ReadResume = (
        effect: Effect.Effect<Arr.NonEmptyReadonlyArray<Uint8Array | string>, Socket.SocketError>
      ) => void

      let error: Socket.SocketError | undefined
      let waiter: ReadResume | undefined
      let consumer: {
        readonly onChunk: (chunk: Uint8Array | string) => void | Effect.Effect<void, Socket.SocketError>
        readonly resume: (effect: Effect.Effect<void, Socket.SocketError>) => void
        readonly runFork: (effect: Effect.Effect<void, Socket.SocketError>) => Fiber.Fiber<void, Socket.SocketError>
        task: Fiber.Fiber<void, Socket.SocketError> | undefined
        readonly taskReady: Latch.Latch
        settled: boolean
      } | undefined
      let draining = false
      let pending: Array<Uint8Array | string> | undefined
      let pausedForConsumer = false
      let consuming = false
      let upgradeAvailable = true

      function fail(err: Socket.SocketError) {
        if (error === undefined) error = err
        if (waiter !== undefined) {
          const resume = waiter
          waiter = undefined
          consuming = false
          resume(Effect.fail(error!))
        }
        if (consumer !== undefined) {
          pauseConsumer()
          consumer.settled = true
          consumer.task?.interruptUnsafe()
          consumer.resume(Effect.fail(error))
        }
      }
      function pauseConsumer() {
        if (pausedForConsumer) return
        pausedForConsumer = true
        conn.pause()
      }
      function continueConsumer() {
        if (consumer === undefined || consumer.task !== undefined || consumer.settled || draining) return
        if (pending !== undefined && pending.length > 0) onData(pending.shift()!)
        if (consumer !== undefined && consumer.task === undefined && !consumer.settled && pausedForConsumer) {
          pausedForConsumer = false
          conn.resume()
        }
      }
      function onData(chunk: Uint8Array | string) {
        if (consumer === undefined || consumer.task !== undefined || consumer.settled || draining) {
          ;(pending ??= []).push(chunk)
          pauseConsumer()
          return
        }
        draining = true
        try {
          let nextChunk: Uint8Array | string | undefined = chunk
          while (nextChunk !== undefined) {
            const current = consumer
            if (current === undefined || current.task !== undefined || current.settled) {
              ;(pending ??= []).unshift(nextChunk)
              break
            }
            const next = current.onChunk(nextChunk)
            if (next !== undefined) {
              pauseConsumer()
              current.taskReady.closeUnsafe()
              const task = current.runFork(next)
              current.task = task
              current.taskReady.openUnsafe()
              task.addObserver((exit) => {
                if (consumer !== current || current.settled) return
                if (Exit.isFailure(exit)) {
                  current.settled = true
                  current.resume(exit)
                  return
                }
                current.task = undefined
                continueConsumer()
              })
            }
            if (consumer === undefined || consumer.task !== undefined || consumer.settled) break
            nextChunk = pending?.shift()
          }
        } catch (cause) {
          fail(new Socket.SocketError({ reason: new Socket.SocketReadError({ cause }) }))
        } finally {
          draining = false
        }
        continueConsumer()
      }
      function onReadable() {
        if (waiter === undefined) return
        const chunk = readAvailable(conn)
        if (chunk === null) return
        const resume = waiter
        waiter = undefined
        consuming = false
        resume(Effect.succeed(chunk))
      }
      function onEnd() {
        fail(new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1000 }) }))
      }
      function onError(cause: Error) {
        fail(
          new Socket.SocketError({
            reason: new Socket.SocketReadError({ cause })
          })
        )
      }
      function onClose(hadError: boolean) {
        fail(
          new Socket.SocketError({
            reason: new Socket.SocketCloseError({ code: hadError ? 1006 : 1000 })
          })
        )
      }

      function attachReadListeners(conn: Duplex) {
        conn.on("readable", onReadable)
        conn.on("end", onEnd)
        conn.on("error", onError)
        conn.on("close", onClose)
      }

      function detachReadListeners(conn: Duplex) {
        conn.off("readable", onReadable)
        conn.off("end", onEnd)
        conn.off("error", onError)
        conn.off("close", onClose)
      }

      // Deno's node:net compatibility layer stops emitting `readable` after
      // an explicit pause. The stream is already non-flowing without one.
      if (!isDeno) conn.pause()
      attachReadListeners(conn)
      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          // resume a pull blocked in another fiber before detaching
          fail(
            new Socket.SocketError({
              reason: new Socket.SocketCloseError({ code: 1006 })
            })
          )
          detachReadListeners(conn)
          latch.closeUnsafe()
          currentSocket = undefined
          upgradeAvailable = false
        })
      )

      currentSocket = conn
      latch.openUnsafe()

      const activeError = () =>
        new Socket.SocketError({
          reason: new Socket.SocketReadError({ cause: new Error("socket reader already has an active consumer") })
        })
      const pull = Effect.suspend(() => {
        if (consuming) return Effect.fail(activeError())
        if (pending !== undefined && pending.length > 0) {
          const chunks = pending as Arr.NonEmptyArray<Uint8Array | string>
          pending = undefined
          return Effect.succeed(chunks)
        }
        const chunk = readAvailable(conn)
        if (chunk !== null) return Effect.succeed(chunk)
        if (error !== undefined) return Effect.fail(error)
        return Effect.callback<Arr.NonEmptyReadonlyArray<Uint8Array | string>, Socket.SocketError>((resume) => {
          consuming = true
          waiter = resume
          // Wake Deno's paused compatibility reader only when pulling. Resuming
          // while restoring the readable listener can suppress a later run.
          if (isDeno) conn.resume()
          return Effect.sync(() => {
            if (waiter === resume) {
              waiter = undefined
              consuming = false
            }
          })
        })
      })

      const run: Socket.Reader["run"] = (onChunk) =>
        Effect.withFiber((runFiber) => {
          let current: typeof consumer
          return Effect.callback<void, Socket.SocketError>((resume) => {
            if (consuming) return resume(Effect.fail(activeError()))
            if (error !== undefined) return resume(Effect.fail(error))
            consuming = true
            current = {
              onChunk,
              resume,
              runFork: Effect.runForkWith(runFiber.context),
              task: undefined as Fiber.Fiber<void, Socket.SocketError> | undefined,
              taskReady: Latch.makeUnsafe(true),
              settled: false
            }
            consumer = current
            pauseConsumer()
            conn.off("readable", onReadable)
            conn.on("data", onData)
            continueConsumer()
          }).pipe(Effect.ensuring(Effect.suspend(() => {
            if (current === undefined) return Effect.void
            conn.pause()
            conn.off("data", onData)
            if (currentSocket === conn && error === undefined) {
              conn.on("readable", onReadable)
            }
            if (consumer === current) consumer = undefined
            current.settled = true
            pausedForConsumer = false
            const owned = current
            return owned.taskReady.whenOpen(Effect.suspend(() =>
              owned.task === undefined ? Effect.void : Fiber.interrupt(owned.task).pipe(Effect.asVoid)
            )).pipe(Effect.ensuring(Effect.sync(() => {
              consuming = false
            })))
          })))
        })

      const upgrade: Socket.Reader["upgrade"] = (upgradeOptions = {}) =>
        Effect.suspend(() => {
          if (consuming) {
            return Effect.fail(
              new Socket.SocketError({
                reason: new Socket.SocketUpgradeError({ cause: new Error("socket reader has an active consumer") })
              })
            )
          }
          if (!upgradeAvailable) {
            return Effect.fail(
              new Socket.SocketError({
                reason: new Socket.SocketUpgradeError({
                  cause: new Error("socket is already upgraded or closed")
                })
              })
            )
          }
          consuming = true
          return Effect.callback<void, Socket.SocketError>((resume) => {
            const raw = conn
            detachReadListeners(raw)

            let tls: Tls.TLSSocket
            try {
              const portableTlsOptions = Object.fromEntries(
                Object.entries({
                  key: upgradeOptions.key === undefined
                    ? undefined
                    : Arr.map(Arr.ensure(upgradeOptions.key), (value) => Buffer.from(Redacted.value(value))),
                  cert: upgradeOptions.cert === undefined ? undefined : toBuffers(upgradeOptions.cert),
                  ca: upgradeOptions.ca === undefined ? undefined : toBuffers(upgradeOptions.ca),
                  passphrase: upgradeOptions.passphrase === undefined
                    ? undefined
                    : Redacted.value(upgradeOptions.passphrase),
                  ALPNProtocols: upgradeOptions.alpnProtocols === undefined
                    ? undefined
                    : [...upgradeOptions.alpnProtocols],
                  requestCert: upgradeOptions.requestCert,
                  rejectUnauthorized: upgradeOptions.rejectUnauthorized,
                  servername: upgradeOptions.servername
                }).filter(([, value]) => value !== undefined)
              ) as Tls.ConnectionOptions
              const effectiveOptions: Tls.ConnectionOptions = { ...options?.tlsUpgradeOptions, ...portableTlsOptions }
              const overridesContext = upgradeOptions.key !== undefined || upgradeOptions.cert !== undefined ||
                upgradeOptions.ca !== undefined || upgradeOptions.passphrase !== undefined
              const suppliedContext = !overridesContext && effectiveOptions.secureContext !== undefined
              const hasKey = effectiveOptions.key !== undefined
              const hasCert = effectiveOptions.cert !== undefined
              if (!suppliedContext && ((isServer && (!hasKey || !hasCert)) || hasKey !== hasCert)) {
                throw new Error(
                  isServer
                    ? "server TLS upgrade requires both key and cert"
                    : "TLS upgrade credentials must include both key and cert"
                )
              }
              const secureContext = suppliedContext
                ? effectiveOptions.secureContext
                : Tls.createSecureContext(effectiveOptions)
              const tlsOptions = { ...effectiveOptions, secureContext }
              tls = isServer
                ? new Tls.TLSSocket(raw as Net.Socket, { ...tlsOptions, isServer: true })
                : Tls.connect({ ...tlsOptions, socket: raw as Net.Socket })
            } catch (cause) {
              attachReadListeners(raw)
              resume(Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketUpgradeError({ cause })
                })
              ))
              return
            }

            conn = tls
            currentSocket = tls
            if (!isDeno) tls.pause()

            function cleanup() {
              tls.off(secureEvent, succeed)
              tls.off("error", failUpgrade)
              tls.off("close", onUpgradeClose)
            }
            function succeed() {
              cleanup()
              upgradeAvailable = false
              attachReadListeners(tls)
              resume(Effect.void)
            }
            function failUpgrade(cause: unknown) {
              cleanup()
              const upgradeError = new Socket.SocketError({
                reason: new Socket.SocketUpgradeError({ cause })
              })
              fail(upgradeError)
              resume(Effect.fail(upgradeError))
            }
            function onUpgradeClose() {
              failUpgrade(new Error("socket closed during TLS upgrade"))
            }

            tls.once(secureEvent, succeed)
            tls.once("error", failUpgrade)
            tls.once("close", onUpgradeClose)

            return Effect.sync(() => {
              cleanup()
              fail(
                new Socket.SocketError({
                  reason: new Socket.SocketCloseError({ code: 1006 })
                })
              )
              tls.destroy()
            })
          }).pipe(Effect.ensuring(Effect.sync(() => {
            consuming = false
          })))
        })

      return { pull, run, upgrade }
    }).pipe(
      Effect.updateContext((input: Context.Context<Scope.Scope>) => Context.merge(openServices, input))
    ) as Socket.Socket["reader"]

    const awaitDrain = (conn: Duplex) =>
      Effect.callback<void, Socket.SocketError>((resume) => {
        function cleanup() {
          conn.off("drain", onDrain)
          conn.off("error", onError)
          conn.off("close", onClose)
        }
        function onDrain() {
          cleanup()
          resume(Effect.void)
        }
        function onError(cause: Error) {
          cleanup()
          resume(Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause })
            })
          ))
        }
        function onClose() {
          cleanup()
          resume(Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause: new Error("socket closed") })
            })
          ))
        }
        conn.on("drain", onDrain)
        conn.on("error", onError)
        conn.on("close", onClose)
        return Effect.sync(cleanup)
      })

    const write = (
      chunk: Uint8Array | string | Socket.CloseEvent
    ): Effect.Effect<void, Socket.SocketError> =>
      Effect.suspend(() => {
        const conn = currentSocket
        if (conn === undefined) return latch.whenOpen(write(chunk))
        if (conn.destroyed || conn.writableEnded) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause: new Error("socket is closed") })
            })
          )
        }
        if (Socket.isCloseEvent(chunk)) {
          conn.destroy(chunk.code > 1000 ? new Error(`closed with code ${chunk.code}`) : undefined)
          return Effect.void
        }
        try {
          return conn.write(chunk) ? Effect.void : awaitDrain(conn)
        } catch (cause) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause })
            })
          )
        }
      })

    const writeAll = (
      chunks: Arr.NonEmptyReadonlyArray<Uint8Array | string>
    ): Effect.Effect<void, Socket.SocketError> =>
      Effect.suspend(() => {
        const conn = currentSocket
        if (conn === undefined) return latch.whenOpen(writeAll(chunks))
        if (conn.destroyed || conn.writableEnded) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause: new Error("socket is closed") })
            })
          )
        }
        let needsDrain = false
        try {
          if (chunks.length === 1) {
            needsDrain = !conn.write(chunks[0])
          } else {
            conn.cork()
            try {
              for (let i = 0; i < chunks.length; i++) {
                needsDrain = !conn.write(chunks[i]) || needsDrain
              }
            } finally {
              conn.uncork()
            }
          }
        } catch (cause) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause })
            })
          )
        }
        return needsDrain ? awaitDrain(conn) : Effect.void
      })

    const writer: Socket.Socket["writer"] = Effect.acquireRelease(
      Effect.succeed({ write, writeAll }),
      () =>
        Effect.sync(() => {
          if (!currentSocket || currentSocket.writableEnded) return
          currentSocket.end()
        })
    )

    return Effect.succeed(Socket.make({ reader, writer }))
  })

/**
 * Creates a `Channel` over a TCP socket, reading arrays of `Uint8Array`
 * chunks and writing arrays of bytes, strings, or socket close events.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeNetChannel = <IE = never>(
  options: Net.NetConnectOpts
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  Socket.SocketError | IE,
  void,
  Arr.NonEmptyReadonlyArray<Uint8Array | string | Socket.CloseEvent>,
  IE
> =>
  Channel.unwrap(
    Effect.map(makeNet(options), Socket.toChannelWith<IE>())
  )

/**
 * Provides a `Socket.Socket` by opening a TCP connection with the supplied
 * Node `net` connection options.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerNet: (options: Net.NetConnectOpts) => Layer.Layer<
  Socket.Socket,
  Socket.SocketError
> = Function.flow(makeNet, Layer.effect(Socket.Socket))

/**
 * Opens a Node TLS connection as an Effect socket.
 *
 * **When to use**
 *
 * Use to create a `Socket.Socket` whose reader acquisition dials
 * `tls.connect` and completes once the TLS handshake has finished.
 *
 * **Details**
 *
 * Accepts the same options as `tls.connect`, so trust anchors (`ca`), client
 * certificates (`cert` / `key`), ALPN protocols, and `servername` are set
 * there. A failed handshake, including an untrusted or expired peer
 * certificate, fails with a `SocketOpenError`. Supports `openTimeout` and
 * destroys the underlying socket when the reader scope is finalized.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeTls = (
  options: Tls.ConnectionOptions & {
    readonly noDelay?: boolean | undefined
    readonly destroyOnClose?: boolean | undefined
    readonly openTimeout?: Duration.Input | undefined
  }
): Effect.Effect<Socket.Socket> =>
  fromDuplex(
    Effect.contextWith((context: Context.Context<Scope.Scope>) => {
      let conn: Tls.TLSSocket | undefined
      let isOpen = false
      return Effect.flatMap(
        Scope.addFinalizer(
          Context.get(context, Scope.Scope),
          Effect.sync(() => {
            if (!conn) return
            closeSocket(conn, isOpen, options.destroyOnClose === true)
          })
        ),
        () =>
          Effect.callback<Tls.TLSSocket, Socket.SocketError, never>((resume) => {
            try {
              conn = Tls.connect(options)
              if (options.noDelay !== undefined) conn.setNoDelay(options.noDelay)
            } catch (cause) {
              resume(Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketOpenError({ kind: "Unknown", cause })
                })
              ))
              return
            }
            conn.once("secureConnect", () => {
              isOpen = true
              resume(Effect.succeed(conn!))
            })
            conn.on("error", (cause: Error) => {
              resume(Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketOpenError({ kind: "Unknown", cause })
                })
              ))
            })
          })
      )
    }),
    options
  )

/**
 * Creates a `Channel` over a TLS socket, reading arrays of `Uint8Array`
 * chunks and writing arrays of bytes, strings, or socket close events.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeTlsChannel = <IE = never>(
  options: Tls.ConnectionOptions
): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  Socket.SocketError | IE,
  void,
  Arr.NonEmptyReadonlyArray<Uint8Array | string | Socket.CloseEvent>,
  IE
> =>
  Channel.unwrap(
    Effect.map(makeTls(options), Socket.toChannelWith<IE>())
  )

/**
 * Provides a `Socket.Socket` by opening a TLS connection with the supplied
 * Node `tls` connection options.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerTls: (options: Tls.ConnectionOptions) => Layer.Layer<
  Socket.Socket,
  Socket.SocketError
> = Function.flow(makeTls, Layer.effect(Socket.Socket))
