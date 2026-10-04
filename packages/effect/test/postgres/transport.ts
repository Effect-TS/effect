import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as NodeSocketConnector from "@effect/platform-node/NodeSocketConnector"
import { Effect, Layer } from "effect"
import { PgClient, PgConnection, PgPool } from "effect/postgres"
import type { Duplex } from "node:stream"

type TestConfig<A> = A & { readonly stream?: (() => Duplex) | undefined }

const config = <A extends PgConnection.Config>(options: TestConfig<A>): A => ({
  ...options,
  connector: options.stream === undefined
    ? options.connector
    : NodeSocketConnector.make({ stream: options.stream }).connect
})

export const platform = Layer.merge(NodeSocketConnector.layer, NodeCrypto.layer)

export const makeConnection = (options: TestConfig<PgConnection.Config>) =>
  PgConnection.make(config(options)).pipe(Effect.provide(platform))

export const makePool = (options: TestConfig<PgPool.Config>) =>
  PgPool.make(config(options)).pipe(Effect.provide(platform))

export const makeClient = (options: TestConfig<PgClient.PgPoolConfig>) =>
  PgClient.make(config(options)).pipe(Effect.provide(platform))

export const makeSingleClient = (
  options: TestConfig<PgClient.PgClientConfig & { readonly acquireForStream?: boolean }>
) => PgClient.makeClient(config(options)).pipe(Effect.provide(platform))

export const layerClient = (options: TestConfig<PgClient.PgPoolConfig>) =>
  PgClient.layer(config(options)).pipe(Layer.provide(platform))

export const layerClientFrom: typeof PgClient.layerFrom = PgClient.layerFrom
