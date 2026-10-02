/**
 * Scoped TCP, TLS and Unix socket connections using Node networking APIs.
 *
 * @since 4.0.0
 */
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Socket from "effect/socket/Socket"
import * as SocketConnector from "effect/socket/SocketConnector"
import { Buffer } from "node:buffer"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import type * as Tls from "node:tls"
import * as NodeSocketTcp from "./NodeSocketTcp.ts"

/**
 * Node-specific defaults and custom stream creation for socket connections.
 *
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly connectTimeout?: Duration.Input | undefined
  readonly stream?: ((endpoint: SocketConnector.Endpoint) => Duplex) | undefined
  readonly tls?: Tls.ConnectionOptions | undefined
}

const buffers = (input: string | Uint8Array | ReadonlyArray<string | Uint8Array>) =>
  (Array.isArray(input) ? input : [input as string | Uint8Array]).map((value) => Buffer.from(value))

const tlsOptions = (options: Socket.TlsUpgradeOptions): Tls.ConnectionOptions =>
  Object.fromEntries(
    Object.entries({
      key: options.key === undefined
        ? undefined
        : Array.isArray(options.key)
        ? options.key.map((value) => Buffer.from(Redacted.value(value)))
        : Buffer.from(Redacted.value(options.key as Redacted.Redacted<string | Uint8Array>)),
      cert: options.cert === undefined ? undefined : buffers(options.cert),
      ca: options.ca === undefined ? undefined : buffers(options.ca),
      passphrase: options.passphrase === undefined ? undefined : Redacted.value(options.passphrase),
      ALPNProtocols: options.alpnProtocols === undefined ? undefined : [...options.alpnProtocols],
      requestCert: options.requestCert,
      rejectUnauthorized: options.rejectUnauthorized,
      servername: options.servername
    }).filter(([, value]) => value !== undefined)
  ) as Tls.ConnectionOptions

const hasNaN = (input: unknown): boolean =>
  typeof input === "number"
    ? Number.isNaN(input)
    : typeof input === "object" && input !== null && !Duration.isDuration(input) && Object.values(input).some(hasNaN)

/**
 * Creates a connector for independent scoped Node socket sessions.
 *
 * **Details**
 *
 * Custom streams must already be connected. Their lifecycle belongs to the
 * returned connection, including destruction when its scope closes.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: Options = {}): SocketConnector.SocketConnector["Service"] => ({
  connect: Effect.fnUntraced(function*(endpoint: SocketConnector.Endpoint) {
    const openTimeout = endpoint.connectTimeout ?? options.connectTimeout ?? "10 seconds"
    const parsed = Duration.fromInput(openTimeout)
    if (Option.isNone(parsed) || Duration.toMillis(parsed.value) < 0 || hasNaN(openTimeout)) {
      return yield* Effect.fail(
        new Socket.SocketError({
          reason: new Socket.SocketOpenError({ kind: "Timeout", cause: new Error("Invalid socket connection timeout") })
        })
      )
    }
    const socket = options.stream !== undefined
      ? yield* NodeSocketTcp.fromDuplex(
        Effect.acquireRelease(
          Effect.try({
            try: () => options.stream!(endpoint),
            catch: (cause) => new Socket.SocketError({ reason: new Socket.SocketOpenError({ kind: "Unknown", cause }) })
          }),
          (stream) => Effect.sync(() => stream.destroy())
        ),
        { openTimeout }
      )
      : endpoint.tls
      ? yield* NodeSocketTcp.makeTls({
        noDelay: true,
        destroyOnClose: true,
        ...options.tls,
        ...(typeof endpoint.tls === "object" ? tlsOptions(endpoint.tls) : {}),
        ...(endpoint.path === undefined ? { host: endpoint.host, port: endpoint.port } : { path: endpoint.path }),
        servername: (typeof endpoint.tls === "object" ? endpoint.tls.servername : undefined) ??
          options.tls?.servername ??
          (endpoint.path === undefined && Net.isIP(endpoint.host) === 0 ? endpoint.host : undefined),
        openTimeout
      })
      : yield* NodeSocketTcp.makeNet({
        ...(endpoint.path === undefined ? { host: endpoint.host, port: endpoint.port } : { path: endpoint.path }),
        noDelay: true,
        destroyOnClose: true,
        openTimeout
      })
    const connection = yield* SocketConnector.fromSocket(socket)
    return {
      ...connection,
      upgrade: (upgradeOptions?: Socket.TlsUpgradeOptions) =>
        connection.upgrade({
          ...upgradeOptions,
          servername: upgradeOptions?.servername ??
            (endpoint.path === undefined && Net.isIP(endpoint.host) === 0 ? endpoint.host : undefined)
        })
    }
  })
})

/**
 * Provides a Node socket connector with custom defaults or stream creation.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerWith = (options: Options): Layer.Layer<SocketConnector.SocketConnector> =>
  Layer.succeed(SocketConnector.SocketConnector)(make(options))

/**
 * Provides a Node socket connector with default TCP and TLS settings.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<SocketConnector.SocketConnector> = layerWith({})
