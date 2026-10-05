import type { NonEmptyArray } from "../Array.ts"
import * as Context from "../Context.ts"
import type { Effect } from "../Effect.ts"
import type { Exit } from "../Exit.ts"
import type { Fiber } from "../Fiber.ts"
import { dual } from "../Function.ts"
import type * as Request from "../Request.ts"
import { makeEntry } from "../Request.ts"
import type { RequestResolver } from "../RequestResolver.ts"
import { Scheduler } from "../Scheduler.ts"
import { exitDie, isEffect } from "./core.ts"
import * as effect from "./effect.ts"

/** @internal */
export const request: {
  <A extends Request.Any, EX = never, RX = never>(
    resolver: RequestResolver<A> | Effect<RequestResolver<A>, EX, RX>
  ): (self: A) => Effect<
    Request.Success<A>,
    Request.Error<A> | EX,
    Request.Services<A> | RX
  >
  <A extends Request.Any, EX = never, RX = never>(
    self: A,
    resolver: RequestResolver<A> | Effect<RequestResolver<A>, EX, RX>
  ): Effect<
    Request.Success<A>,
    Request.Error<A> | EX,
    Request.Services<A> | RX
  >
} = dual(
  2,
  <A extends Request.Any, EX = never, RX = never>(
    self: A,
    resolver: RequestResolver<A> | Effect<RequestResolver<A>, EX, RX>
  ): Effect<
    Request.Success<A>,
    Request.Error<A> | EX,
    Request.Services<A> | RX
  > => {
    const withResolver = (resolver: RequestResolver<A>) =>
      effect.callback<
        Request.Success<A>,
        Request.Error<A>,
        Request.Services<A>
      >((resume) => {
        const entry = addEntry(resolver, self, resume, effect.getCurrentFiber()!)
        return maybeRemoveEntry(resolver, entry)
      })
    return isEffect(resolver) ? effect.flatMap(resolver, withResolver) : withResolver(resolver)
  }
)

/** @internal */
export const requestUnsafe = <A extends Request.Any>(
  self: A,
  options: {
    readonly resolver: RequestResolver<A>
    readonly onExit: (exit: Exit<Request.Success<A>, Request.Error<A>>) => void
    readonly context: Context.Context<never>
  }
): () => void => {
  const entry = addEntry(options.resolver, self, options.onExit, {
    context: options.context,
    cache: { scheduler: Context.get(options.context, Scheduler) }
  })
  return () => removeEntryUnsafe(options.resolver, entry)
}

interface Batch {
  key: unknown
  resolver: RequestResolver<any>
  map: Map<unknown, Batch>
  readonly entrySet: Set<Request.Entry<any>>
  readonly entries: Set<Request.Entry<any>>
  readonly delayEffect: Effect<void>
  readonly run: Effect<void, unknown>
  fiber?: Fiber<void, unknown> | undefined
}

const batchPool: Array<Batch> = []
const pendingBatches = new WeakMap<RequestResolver<any>, Map<unknown, Batch>>()

const addEntry = <A extends Request.Any>(
  resolver: RequestResolver<A>,
  request: A,
  resume: (exit: Exit<any, any>) => void,
  fiber: {
    readonly context: Context.Context<never>
    readonly cache: { readonly scheduler: Scheduler }
    readonly id?: number
  }
) => {
  let batchMap = pendingBatches.get(resolver)
  if (!batchMap) {
    batchMap = new Map<object, Batch>()
    pendingBatches.set(resolver, batchMap)
  }
  let batch: Batch | undefined
  let completed = false
  const entry = makeEntry({
    request,
    context: fiber.context as any,
    uninterruptible: false,
    completeUnsafe(effect) {
      if (completed) return
      completed = true
      // Removed entries still notify resolver hooks, but not their cancelled callers.
      if (batch && !batch.entrySet.delete(entry)) return
      resume(effect)
    }
  })
  if (resolver.preCheck !== undefined && !resolver.preCheck(entry)) {
    return entry
  }
  const key = resolver.batchKey(entry)
  batch = batchMap.get(key)
  const isNewBatch = batch === undefined
  if (!batch) {
    if (batchPool.length > 0) {
      batch = batchPool.pop()!
      batch.key = key
      batch.resolver = resolver
      batch.map = batchMap
    } else {
      const newBatch: Batch = {
        key,
        resolver,
        map: batchMap,
        entrySet: new Set(),
        entries: new Set(),
        delayEffect: effect.flatMap(
          effect.onExit(
            effect.suspend(() => {
              // Claim fiber ownership before evaluating even a synchronous delay.
              newBatch.fiber = effect.getCurrentFiber()!
              return newBatch.resolver.delay
            }),
            (exit) => {
              // An interrupted delay may finish after its batch has been reused.
              if (
                exit._tag === "Failure" &&
                newBatch.fiber === effect.getCurrentFiber() &&
                newBatch.map.get(newBatch.key) === newBatch
              ) {
                // Release the key before notifying callers, which may enqueue a retry.
                newBatch.map.delete(newBatch.key)
                completeBatch(newBatch, exit)
              }
              return effect.void
            }
          ),
          (_) => runBatch(newBatch)
        ) as Effect<void>,
        run: effect.onExit(
          effect.suspend(() =>
            newBatch.resolver.runAll(Array.from(newBatch.entries) as NonEmptyArray<Request.Entry<any>>, newBatch.key)
          ),
          (exit) => {
            completeBatch(newBatch, exit)
            return effect.void
          }
        )
      }
      batch = newBatch
    }
    batchMap.set(key, batch)
  }

  batch.entrySet.add(entry)
  batch.entries.add(entry)
  if (isNewBatch) {
    // Register the first entry before the delay can complete the batch.
    effect.runForkWith(fiber.context)(batch.delayEffect, { scheduler: fiber.cache.scheduler })
    // Synchronous completion may recycle the batch; a successful delay may already start resolution.
    if (completed || batchMap.get(key) !== batch) return entry
  }
  if (batch.resolver.collectWhile(batch.entries)) return entry

  // Claim the batch before interrupting its delay, so delay cleanup cannot fail it.
  const run = runBatch(batch)
  batch.fiber!.interruptUnsafe(fiber.id)
  batch.fiber = effect.runForkWith(fiber.context)(run, { scheduler: fiber.cache.scheduler })
  return entry
}

const removeEntryUnsafe = <A extends Request.Any>(
  resolver: RequestResolver<A>,
  entry: Request.Entry<A>
) => {
  if (entry.uninterruptible) return
  const batchMap = pendingBatches.get(resolver)
  if (!batchMap) return
  const key = resolver.batchKey(entry)
  const batch = batchMap.get(key)
  if (!batch) return

  if (!batch.entries.delete(entry)) return
  batch.entrySet.delete(entry)

  let fiber: Fiber<void, unknown> | undefined
  if (batch.entries.size === 0) {
    batchMap.delete(key)
    fiber = batch.fiber
  }
  // Delay finalizers may enqueue new requests, so complete the removed entry first.
  entry.completeUnsafe(effect.exitInterrupt())
  fiber?.interruptUnsafe()
}

const maybeRemoveEntry = <A extends Request.Any>(
  resolver: RequestResolver<A>,
  entry: Request.Entry<A>
) => effect.sync(() => removeEntryUnsafe(resolver, entry))

function runBatch(batch: Batch) {
  if (batch.map.get(batch.key) !== batch) return effect.void
  batch.map.delete(batch.key)
  return batch.run
}

function completeBatch(batch: Batch, exit: Exit<void, unknown>) {
  for (const entry of batch.entrySet) {
    entry.completeUnsafe(
      exit._tag === "Success"
        ? exitDie(
          new Error("Effect.request: RequestResolver did not complete request", { cause: entry.request })
        )
        : exit
    )
  }
  batch.entries.clear()
  batch.entrySet.clear()
  if (batchPool.length < 128) {
    batch.key = undefined
    batch.fiber = undefined
    batch.resolver = undefined as any
    batch.map = undefined as any
    batchPool.push(batch)
  }
}
