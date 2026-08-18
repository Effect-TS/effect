/** @internal */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import type * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { CurrentAddress, CurrentRunnerAddress, Request } from "effect/unstable/cluster/Entity"
import type * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import type * as Envelope from "effect/unstable/cluster/Envelope"
import * as Reply from "effect/unstable/cluster/Reply"
import * as RunnerAddress from "effect/unstable/cluster/RunnerAddress"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcSchema from "effect/unstable/rpc/RpcSchema"
import type { EntityRegistration } from "./entityRegistry.ts"

interface CachedHandlers {
  readonly handlers: Record<string, (request: any) => any>
  readonly context: Context.Context<never>
  readonly scope: Scope.Closeable
}

/** @internal */
export const makeEntityRuntime = Effect.fnUntraced(function*(
  registration: EntityRegistration,
  address: EntityAddress.EntityAddress,
  nextId: () => string
) {
  let cached: CachedHandlers | undefined

  const invalidate = Effect.fnUntraced(function*() {
    if (cached === undefined) return
    const scope = cached.scope
    cached = undefined
    yield* Scope.close(scope, Exit.void)
  })

  const getHandlers = Effect.fnUntraced(function*() {
    if (cached !== undefined) return cached
    const scope = yield* Scope.make()
    const context = registration.context.pipe(
      Context.add(CurrentAddress, address),
      Context.add(CurrentRunnerAddress, RunnerAddress.make(`${address.entityType}/${address.entityId}`, 0)),
      Context.add(Scope.Scope, scope)
    )
    const handlers = yield* Effect.provideContext(registration.build, context)
    return cached = { handlers, context, scope }
  })

  const runWithDefectRetry = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.flatMap(Effect.exit(effect), (first) => {
      if (
        Exit.isSuccess(first) || !Cause.hasDies(first.cause) || registration.options?.defectRetryPolicy === undefined
      ) {
        return Effect.succeed(first)
      }
      return Effect.exit(
        Effect.retry(effect, registration.options.defectRetryPolicy as Schedule.Schedule<unknown, E>)
      )
    })

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

    const request = new Request({ ...envelope, lastSentChunk })
    const result = handler(request)
    const unwrapped = Rpc.isWrapper(result as object) ? result.value : result
    const streamSchemas = RpcSchema.getStreamSchemas(rpc.successSchema)
    let sequence = Option.match(lastSentChunk, {
      onNone: () => 0,
      onSome: (chunk) => chunk.sequence + 1
    })

    const execute = Option.isSome(streamSchemas)
      ? Stream.runForEachArray(unwrapped as Stream.Stream<any, any>, (values) => {
        if (discard) return Effect.void
        const reply = new Reply.Chunk({
          requestId: envelope.requestId,
          id: nextId() as any,
          sequence: sequence++,
          values: values as any
        })
        return respond(reply)
      })
      : unwrapped as Effect.Effect<any, any>

    const exit = yield* Effect.provideContext(runWithDefectRetry(execute), entry.context)
    if (!discard) {
      yield* respond(
        new Reply.WithExit({
          requestId: envelope.requestId,
          id: nextId() as any,
          exit: Option.isSome(streamSchemas) && Exit.isSuccess(exit) ? Exit.void : exit as any
        })
      )
    }
    if (Exit.isFailure(exit) && Cause.hasDies(exit.cause)) {
      yield* rebuildAfterDefect
    }
  })

  return { run, invalidate } as const
})
