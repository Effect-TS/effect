/** @internal */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import type * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as ClusterMetrics from "effect/unstable/cluster/ClusterMetrics"
import { CurrentAddress, CurrentRunnerAddress, Request } from "effect/unstable/cluster/Entity"
import type * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import type * as Envelope from "effect/unstable/cluster/Envelope"
import * as Reply from "effect/unstable/cluster/Reply"
import * as RunnerAddress from "effect/unstable/cluster/RunnerAddress"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcSchema from "effect/unstable/rpc/RpcSchema"
import { EntityKeepAliveHandler } from "./entityKeepAlive.ts"
import type { EntityRegistration } from "./entityRegistry.ts"
import { CurrentEntityName } from "./entityReply.ts"

interface CachedHandlers {
  readonly handlers: Record<string, (request: any) => any>
  readonly context: Context.Context<never>
  readonly scope: Scope.Closeable
}

/** @internal */
export const makeEntityRuntime = Effect.fnUntraced(function*(
  registration: EntityRegistration,
  address: EntityAddress.EntityAddress,
  nextId: () => string,
  entityName = `${String(address.entityType).length}:${address.entityType}${address.entityId}`,
  keepAlive?: (enabled: boolean) => Effect.Effect<void>
) {
  let cached: CachedHandlers | undefined
  const metricContext = Context.merge(
    registration.context,
    Metric.CurrentMetricAttributes.context({ type: registration.entity.type })
  )

  const invalidate = Effect.fnUntraced(function*() {
    if (cached === undefined) return
    const scope = cached.scope
    cached = undefined
    yield* Scope.close(scope, Exit.void).pipe(
      Effect.ensuring(Effect.sync(() => {
        ClusterMetrics.entities.modifyUnsafe(BigInt(-1), metricContext)
      }))
    )
  })

  const getHandlers = Effect.fnUntraced(function*() {
    if (cached !== undefined) return cached
    const scope = yield* Scope.make()
    let context = registration.context.pipe(
      Context.add(CurrentAddress, address),
      Context.add(CurrentRunnerAddress, RunnerAddress.make(`${address.entityType}/${address.entityId}`, 0)),
      Context.add(CurrentEntityName, entityName),
      Context.add(Scope.Scope, scope)
    )
    if (keepAlive !== undefined) {
      context = Context.add(context, EntityKeepAliveHandler, keepAlive)
    }
    const handlers = yield* Effect.provideContext(registration.build, context)
    ClusterMetrics.entities.modifyUnsafe(BigInt(1), metricContext)
    return cached = { handlers, context, scope }
  })

  const runWithDefectRetry = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
    const policy = registration.options?.defectRetryPolicy
    if (policy === undefined) return Effect.exit(effect)
    const retryable = Effect.flatMap(Effect.exit(effect), (exit) =>
      Exit.isFailure(exit) && Cause.hasDies(exit.cause)
        ? Effect.fail(exit.cause)
        : Effect.succeed(exit))
    return Effect.retryOrElse(
      retryable,
      policy as Schedule.Schedule<unknown, Cause.Cause<E>>,
      (cause) => Effect.succeed(Exit.failCause(cause))
    )
  }

  const rebuildAfterDefect = invalidate().pipe(
    Effect.andThen(Effect.catchCause(getHandlers(), () => Effect.void))
  )

  const run = Effect.fnUntraced(function*(
    envelope: Envelope.Request.Any,
    lastSentChunk: Option.Option<Reply.Chunk<any>>,
    discard: boolean,
    respond: (reply: Reply.Reply<any>) => Effect.Effect<void>
  ) {
    const entry = yield* getHandlers()
    const rpc = registration.entity.protocol.requests.get(envelope.tag) as Rpc.AnyWithProps | undefined
    const handler = entry.handlers[envelope.tag]
    if (rpc === undefined || handler === undefined) {
      const exit = Exit.die(`Unknown entity RPC tag: ${envelope.tag}`)
      if (!discard) {
        yield* respond(
          new Reply.WithExit({
            requestId: envelope.requestId,
            id: nextId() as any,
            exit
          })
        )
      }
      return
    }

    const streamSchema = RpcSchema.isStreamSchema(rpc.successSchema) ? rpc.successSchema : undefined
    let currentLastSentChunk = lastSentChunk
    let sequence = Option.match(lastSentChunk, {
      onNone: () => 0,
      onSome: (chunk) => chunk.sequence + 1
    })

    const execute = Effect.suspend(() => {
      const request = new Request({ ...envelope, lastSentChunk: currentLastSentChunk })
      const result = handler(request)
      const unwrapped = Rpc.isWrapper(result as object) ? result.value : result
      if (streamSchema === undefined) return unwrapped as Effect.Effect<any, any>
      return Stream.runForEachArray(unwrapped as Stream.Stream<any, any>, (values) => {
        if (discard) return Effect.void
        const reply = new Reply.Chunk({
          requestId: envelope.requestId,
          id: nextId() as any,
          sequence: sequence++,
          values: values as any
        })
        return Effect.tap(respond(reply), () =>
          Effect.sync(() => {
            currentLastSentChunk = Option.some(reply)
          }))
      })
    }).pipe(
      Effect.withSpan("CloudflareCluster.handler", {
        attributes: {
          entityType: registration.entity.type,
          entityId: String(address.entityId),
          rpc: envelope.tag
        }
      }, { captureStackTrace: false })
    )
    const exit = yield* Effect.provideContext(runWithDefectRetry(execute), entry.context)
    if (!discard) {
      yield* respond(
        new Reply.WithExit({
          requestId: envelope.requestId,
          id: nextId() as any,
          exit: streamSchema !== undefined && Exit.isSuccess(exit) ? Exit.void : exit as any
        })
      )
    }
    if (Exit.isFailure(exit) && Cause.hasDies(exit.cause)) {
      yield* rebuildAfterDefect
    }
  })

  return { run, invalidate } as const
})
