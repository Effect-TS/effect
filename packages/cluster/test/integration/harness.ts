import {
  ClusterWorkflowEngine,
  type Entity,
  EntityId,
  type MessageStorage,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  ShardId,
  Sharding,
  ShardingConfig,
  SocketRunner,
  SqlMessageStorage,
  SqlRunnerStorage
} from "@effect/cluster"
import { NodeClusterSocket, NodeSocket, NodeSocketServer } from "@effect/platform-node"
import * as Socket from "@effect/platform/Socket"
import { SocketServer } from "@effect/platform/SocketServer"
import { type Rpc, RpcClient, RpcSerialization } from "@effect/rpc"
import { SqlClient, type SqlConnection, SqlError } from "@effect/sql"
import { MysqlClient } from "@effect/sql-mysql2"
import { PgClient } from "@effect/sql-pg"
import { WorkflowEngine } from "@effect/workflow"
import { Context, type Duration, Effect, ExecutionStrategy, Exit, Layer, Option, Redacted, Scope } from "effect"
import * as Net from "node:net"
import { inject } from "vitest"
import { waitUntil as waitUntilWithDiagnostics } from "./waitUntil.js"

export type Backend = "mysql" | "pg"
type LockFaultMode = "blackhole" | "stuck" | "fail" | "hangRelease" | "clear"
export type RunnerEntities = Layer.Layer<
  never,
  never,
  Sharding.Sharding | MessageStorage.MessageStorage | SqlClient.SqlClient
>
export interface ClusterRunner {
  readonly address: RunnerAddress.RunnerAddress
  readonly index: number
  readonly sharding: Sharding.Sharding["Type"]
  readonly scope: Scope.CloseableScope
  readonly state: () => "killed" | "running" | "stopped" | "frozen"
  readonly setState: (state: "killed" | "running" | "stopped" | "frozen") => void
  readonly faultLock: (mode: LockFaultMode) => Effect.Effect<void>
  readonly freeze: Effect.Effect<void>
}

const addressKey = (address: RunnerAddress.RunnerAddress) => `${address.host}:${address.port}`
const makeSocketController = () => {
  const connections = new Map<string, Set<Net.Socket>>()
  const protocol = (source: string) =>
    Layer.effect(Runners.RpcClientProtocol)(Effect.gen(function*() {
      const serialization = yield* RpcSerialization.RpcSerialization
      return Effect.fnUntraced(function*(address) {
        const key = `${source}->${addressKey(address)}`
        const socket = yield* NodeSocket.fromDuplex(
          Effect.acquireRelease(
            Effect.async<Net.Socket, Socket.SocketError>((resume) => {
              const connection = Net.createConnection({ host: address.host, port: address.port })
              connection.once("connect", () => {
                const active = connections.get(key) ?? new Set<Net.Socket>()
                active.add(connection)
                connections.set(key, active)
                resume(Effect.succeed(connection))
              })
              connection.on(
                "error",
                (cause) => resume(Effect.fail(new Socket.SocketGenericError({ reason: "Open", cause })))
              )
              return Effect.sync(() => {
                connection.destroy()
              })
            }),
            (connection) =>
              Effect.sync(() => {
                const active = connections.get(key)
                active?.delete(connection)
                if (active?.size === 0) connections.delete(key)
                if (!connection.closed) connection.destroySoon()
              })
          ),
          { openTimeout: 1_000 }
        )
        return yield* RpcClient.makeProtocolSocket().pipe(
          Effect.provideService(Socket.Socket, socket),
          Effect.provideService(RpcSerialization.RpcSerialization, serialization)
        )
      }, Effect.orDie)
    })).pipe(Layer.provide(RpcSerialization.layerNdjson))
  const cut = (source: string, target: string) =>
    Effect.sync(() => {
      const socket = connections.get(`${source}->${target}`)?.values().next().value
      if (socket === undefined) throw new Error(`No active socket from ${source} to ${target}`)
      socket.destroy(new Error(`Socket cut from ${source} to ${target}`))
    })
  return { protocol, cut }
}

const makeLockFaultController = (sql: SqlClient.SqlClient) => {
  const releaseGate = Effect.unsafeMakeLatch(true)
  const queryGate = Effect.unsafeMakeLatch()
  let persistentFault: "stuck" | "hangRelease" | undefined
  let currentSession: { fault: "blackhole" | "fail" | undefined } | undefined
  const wrap = (
    connection: SqlConnection.Connection,
    session: { fault: "blackhole" | "fail" | undefined }
  ): SqlConnection.Connection => {
    const execute = <A, E extends SqlError.SqlError, R>(query: string, effect: Effect.Effect<A, E, R>) =>
      Effect.suspend((): Effect.Effect<A, E | SqlError.SqlError, R> => {
        if (query.includes("pg_advisory_unlock_all") || query.includes("RELEASE_ALL_LOCKS")) return effect
        const mode = session.fault ?? persistentFault
        if (mode === "fail") return Effect.fail(new SqlError.SqlError({ cause: new Error("lock connection lost") }))
        if (mode === "blackhole" || mode === "stuck" || mode === "hangRelease") {
          return queryGate.await.pipe(Effect.andThen(effect))
        }
        return effect
      })
    return {
      ...connection,
      execute: (...args) => execute(args[0], connection.execute(...args)),
      executeRaw: (...args) => execute(args[0], connection.executeRaw(...args)),
      executeValues: (...args) => execute(args[0], connection.executeValues(...args)),
      executeUnprepared: (...args) => execute(args[0], connection.executeUnprepared(...args))
    }
  }
  const client: SqlClient.SqlClient = new Proxy(sql.withoutTransforms(), {
    get(target, property, receiver) {
      if (property === "reserve") {
        return Effect.gen(function*() {
          const session = { fault: undefined as "blackhole" | "fail" | undefined }
          currentSession = session
          yield* Effect.addFinalizer(() =>
            Effect.uninterruptible(
              Effect.suspend(() => persistentFault === "hangRelease" ? releaseGate.await : Effect.void)
            )
          )
          return wrap(yield* target.reserve, session)
        })
      }
      if (property === "withoutTransforms") return () => client
      return Reflect.get(target, property, receiver)
    }
  })
  const set = (mode: LockFaultMode) =>
    Effect.sync(() => {
      if (mode === "clear") {
        persistentFault = undefined
        if (currentSession !== undefined) currentSession.fault = undefined
        queryGate.unsafeOpen()
        releaseGate.unsafeOpen()
      } else if (mode === "blackhole" || mode === "fail") {
        queryGate.unsafeClose()
        if (currentSession === undefined) throw new Error("Runner has no reserved lock connection")
        persistentFault = undefined
        releaseGate.unsafeOpen()
        currentSession.fault = mode
      } else {
        queryGate.unsafeClose()
        persistentFault = mode
        if (currentSession !== undefined) currentSession.fault = undefined
        if (mode === "hangRelease") releaseGate.unsafeClose()
        else releaseGate.unsafeOpen()
      }
    })
  return { client, set }
}

let nextCluster = 0
const clusterConfig = {
  entityMaxIdleTime: 3_000,
  entityMessagePollInterval: 500,
  refreshAssignmentsInterval: 150,
  shardLockExpiration: 1_750,
  shardLockRefreshInterval: 500
} as const

export const make = Effect.fnUntraced(function*(options: {
  readonly backend: Backend
  readonly entities: RunnerEntities | ((options: { readonly prefix: string }) => RunnerEntities)
  readonly config?: Partial<ShardingConfig.ShardingConfig["Type"]>
  readonly trackSockets?: boolean
}) {
  const parentScope = yield* Effect.scope
  const prefix = `cluster_${process.pid}_${nextCluster++}`
  const config = { ...clusterConfig, ...options.config }
  const databases = inject("clusterDatabases")
  const database = yield* Layer.buildWithScope(
    options.backend === "pg"
      ? PgClient.layer({ url: Redacted.make(databases.pg), maxConnections: 32 })
      : MysqlClient.layer({ url: Redacted.make(databases.mysql), maxConnections: 32 }),
    parentScope
  )
  const sql = Context.get(database, SqlClient.SqlClient).withoutTransforms()
  const messageStorage = yield* SqlMessageStorage.layerWith({ prefix }).pipe(
    Layer.provide(ShardingConfig.layer(config)),
    Layer.buildWithScope(parentScope),
    Effect.provide(database)
  )
  const shared = Context.merge(database, messageStorage)
  const entities = typeof options.entities === "function" ? options.entities({ prefix }) : options.entities
  const runners: Array<ClusterRunner> = []
  const protocol = NodeClusterSocket.layerClientProtocol.pipe(Layer.provide(RpcSerialization.layerNdjson))
  const socketController = makeSocketController()
  const makeStorage = (scope: Scope.CloseableScope, storageDatabase: Context.Context<SqlClient.SqlClient> = database) =>
    SqlRunnerStorage.layerWith({ prefix }).pipe(
      Layer.provide(ShardingConfig.layer(config)),
      Layer.orDie,
      Layer.buildWithScope(scope),
      Effect.provide(storageDatabase)
    )
  const clientScope = yield* Scope.fork(parentScope, ExecutionStrategy.sequential)
  const clientStorage = yield* makeStorage(clientScope)
  const clientBase = yield* SocketRunner.layerClientOnly.pipe(
    Layer.provide(options.trackSockets ? socketController.protocol("client") : protocol),
    Layer.provide(RpcSerialization.layerNdjson),
    Layer.provide(ShardingConfig.layer(config)),
    Layer.buildWithScope(clientScope),
    Effect.provide(Context.merge(shared, clientStorage))
  )
  const workflowEngine = yield* ClusterWorkflowEngine.make.pipe(Effect.provide(Context.merge(shared, clientBase)))
  const client = Context.add(clientBase, WorkflowEngine.WorkflowEngine, workflowEngine)
  const clientSharding = Context.get(client, Sharding.Sharding)

  const start = Effect.fnUntraced(function*(count: number, startOptions?: {
    readonly assignedShardGroups?: ReadonlyArray<string>
    readonly entities?: RunnerEntities
  }) {
    return yield* Effect.forEach(Array.from({ length: count }), () =>
      Effect.gen(function*() {
        const scope = yield* Scope.fork(parentScope, ExecutionStrategy.sequential)
        const server = yield* NodeSocketServer.make({ host: "127.0.0.1", port: 0 }).pipe(Scope.extend(scope))
        if (server.address._tag !== "TcpAddress") return yield* Effect.die("Expected TCP server")
        const address = RunnerAddress.make("127.0.0.1", server.address.port)
        const lockFault = makeLockFaultController(sql)
        const raw = Context.get(
          yield* makeStorage(scope, Context.add(database, SqlClient.SqlClient, lockFault.client)),
          RunnerStorage.RunnerStorage
        )
        yield* Scope.addFinalizer(scope, lockFault.set("clear"))
        let state: ReturnType<ClusterRunner["state"]> = "running"
        const gate = Effect.unsafeMakeLatch(true)
        const refreshPaused = Effect.unsafeMakeLatch()
        const syncPaused = Effect.unsafeMakeLatch()
        const waitWhileFrozen = <A, E>(
          paused: Effect.Latch,
          effect: Effect.Effect<A, E>,
          onKilled: () => A
        ): Effect.Effect<A, E> =>
          Effect.suspend(() => {
            if (state === "killed") return Effect.succeed(onKilled())
            if (state !== "frozen") return effect
            paused.unsafeOpen()
            return gate.await.pipe(
              Effect.uninterruptible,
              Effect.andThen(Effect.suspend(() => state === "killed" ? Effect.succeed(onKilled()) : effect))
            )
          })
        let lastRunners: Effect.Effect.Success<typeof raw.getRunners> = []
        const storage = RunnerStorage.RunnerStorage.of({
          ...raw,
          getRunners: waitWhileFrozen(
            syncPaused,
            raw.getRunners.pipe(Effect.tap((runners) =>
              Effect.sync(() => {
                lastRunners = runners
              })
            )),
            () => lastRunners
          ),
          refresh: (address, shards) => {
            const shardIds = Array.from(shards)
            return waitWhileFrozen(refreshPaused, raw.refresh(address, shardIds), () => shardIds)
          },
          release: (address, shard) => state === "killed" ? Effect.void : raw.release(address, shard),
          releaseAll: (address) => state === "killed" ? Effect.void : raw.releaseAll(address),
          unregister: (address) => state === "killed" ? Effect.void : raw.unregister(address)
        })
        const runnerProtocol = options.trackSockets ? socketController.protocol(addressKey(address)) : protocol
        const context = yield* (startOptions?.entities ?? entities).pipe(
          Layer.provideMerge(SocketRunner.layer),
          Layer.provide(RunnerHealth.layerPing.pipe(Layer.provide(Runners.layerRpc), Layer.provide(runnerProtocol))),
          Layer.provide(Layer.succeed(SocketServer, server)),
          Layer.provide(runnerProtocol),
          Layer.provide(RpcSerialization.layerNdjson),
          Layer.provide(ShardingConfig.layer({ ...config, ...startOptions, runnerAddress: Option.some(address) })),
          Layer.buildWithScope(scope),
          Effect.provide(Context.add(shared, RunnerStorage.RunnerStorage, storage))
        )
        const runner: ClusterRunner = {
          address,
          index: runners.length,
          scope,
          faultLock: lockFault.set,
          sharding: Context.get(context, Sharding.Sharding),
          state: () => state,
          setState: (next) => {
            state = next
            if (next !== "frozen") gate.unsafeOpen()
          },
          freeze: Scope.addFinalizer(
            parentScope,
            Effect.sync(() => {
              if (state === "frozen") {
                state = "running"
                gate.unsafeOpen()
              }
            })
          ).pipe(
            Effect.andThen(Effect.sync(() => {
              state = "frozen"
              gate.unsafeClose()
            })),
            Effect.andThen(Effect.all([refreshPaused.await, syncPaused.await], { discard: true }))
          )
        }
        runners.push(runner)
        yield* Scope.addFinalizer(
          parentScope,
          Effect.forEach(runners, (runner) => runner.faultLock("clear"), { discard: true })
        )
        return runner
      }))
  })
  const stop = (runner: ClusterRunner) =>
    Effect.suspend(() => {
      if (runner.state() !== "running" && runner.state() !== "frozen") return Effect.void
      runner.setState("stopped")
      return Scope.close(runner.scope, Exit.void)
    })
  const kill = (runner: ClusterRunner) =>
    Effect.suspend(() => {
      if (runner.state() !== "running" && runner.state() !== "frozen") return Effect.void
      runner.setState("killed")
      return Scope.close(runner.scope, Exit.void)
    })
  const assignmentMap = () => {
    const assignments: Record<string, ReadonlyArray<string>> = {}
    for (const group of config.availableShardGroups ?? ShardingConfig.defaults.availableShardGroups) {
      for (let id = 1; id <= (config.shardsPerGroup ?? ShardingConfig.defaults.shardsPerGroup); id++) {
        const shard = ShardId.make(group, id)
        assignments[shard.toString()] = runners.filter((r) => r.state() === "running" && r.sharding.hasShardId(shard))
          .map((r) => `${r.address.host}:${r.address.port}`)
      }
    }
    return assignments
  }
  const ownersOfShard = (shard: ShardId.ShardId, includeInactive = false) =>
    runners.filter((r) => (includeInactive || r.state() === "running") && r.sharding.hasShardId(shard))
  const messageCounts = Effect.fnUntraced(function*() {
    const rows = yield* sql<{ processed: boolean | number; reply_payload: string | Record<string, unknown> | null }>`
      SELECT m.processed, r.payload AS reply_payload FROM ${sql(`${prefix}_messages`)} m
      LEFT JOIN ${sql(`${prefix}_replies`)} r ON r.id = m.last_reply_id WHERE m.kind = 0
    `
    let failed = 0, replied = 0, unprocessed = 0
    for (const row of rows) {
      if (!row.processed) {
        unprocessed++
        continue
      }
      const reply = typeof row.reply_payload === "string" ? JSON.parse(row.reply_payload) : row.reply_payload
      if (reply?._tag === "Success") replied++
      if (reply?._tag === "Failure") failed++
    }
    return { failed, replied, unprocessed }
  })
  const diagnostics = Effect.gen(function*() {
    return {
      assignments: assignmentMap(),
      messageCounts: yield* messageCounts(),
      registrations: yield* sql`SELECT address, runner, healthy, last_heartbeat FROM ${
        sql(`${prefix}_runners`)
      } ORDER BY address`
    }
  })
  const waitUntil = Effect.fnUntraced(
    function*<E, R>(
      description: string,
      condition: Effect.Effect<boolean, E, R>,
      timeout: Duration.DurationInput = "15 seconds"
    ) {
      yield* waitUntilWithDiagnostics(description, Effect.provide(condition, client), diagnostics, timeout)
    },
    Effect.onError(() => Effect.forEach(runners, (runner) => runner.faultLock("clear"), { discard: true }))
  )
  const waitForStableAssignments = Effect.fnUntraced(function*() {
    let previous = "", stablePolls = 0
    yield* waitUntil(
      "Shard assignments did not stabilize before the deadline",
      Effect.sync(() => {
        const current = assignmentMap()
        const owners = new Set(Object.values(current).flat())
        const complete = Object.values(current).every((owners) => owners.length === 1) &&
          runners.every((r) => r.state() !== "running" || owners.has(`${r.address.host}:${r.address.port}`))
        const encoded = complete ? JSON.stringify(current) : ""
        stablePolls = encoded !== "" && encoded === previous ? stablePolls + 1 : 0
        previous = encoded
        return stablePolls >= 3
      })
    )
    return assignmentMap()
  })
  const shardOfEntity = <Type extends string, Rpcs extends Rpc.Any>(entity: Entity.Entity<Type, Rpcs>, id: string) =>
    entity.getShardId(EntityId.make(id)).pipe(Effect.provide(client))
  const ownerOfEntity = <Type extends string, Rpcs extends Rpc.Any>(entity: Entity.Entity<Type, Rpcs>, id: string) =>
    Effect.map(shardOfEntity(entity, id), (shard) => ownersOfShard(shard)[0])
  const getClient = <Type extends string, Rpcs extends Rpc.Any>(entity: Entity.Entity<Type, Rpcs>) =>
    entity.client.pipe(Effect.provide(client))
  return {
    prefix,
    clientSharding,
    workflowEngine,
    start,
    stop,
    kill,
    freeze: (runner: ClusterRunner) => runner.freeze,
    cutSocket: (
      runner: ClusterRunner,
      options: { readonly peer: ClusterRunner | "client"; readonly direction: "inbound" | "outbound" }
    ) => {
      const peer = options.peer === "client" ? "client" : addressKey(options.peer.address)
      return options.direction === "inbound"
        ? socketController.cut(peer, addressKey(runner.address))
        : socketController.cut(addressKey(runner.address), peer)
    },
    insertMessage: (row: Readonly<Record<string, string | number | bigint | boolean | null>>) =>
      sql`INSERT INTO ${sql(`${prefix}_messages`)} ${sql.insert({ ...row })}`.unprepared.pipe(Effect.asVoid),
    runners,
    assignmentMap,
    ownersOfShard,
    faultLock: (runner: ClusterRunner, mode: LockFaultMode) => runner.faultLock(mode),
    messageCounts,
    diagnostics,
    waitUntil,
    waitForStableAssignments,
    shardOfEntity,
    ownerOfEntity,
    getClient,
    repliedMessageCount: Effect.map(messageCounts(), (counts) => counts.replied),
    unprocessedMessageCount: Effect.map(messageCounts(), (counts) => counts.unprocessed),
    failedMessageCount: Effect.map(messageCounts(), (counts) => counts.failed)
  }
})
