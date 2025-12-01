/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Config from "effect/Config"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as MutableRef from "effect/MutableRef"
import * as Option from "effect/Option"
import * as RcMap from "effect/RcMap"
import * as Schedule from "effect/Schedule"
import type { RedisOptions } from "ioredis"
import { Redis } from "ioredis"
import * as PersistedQueue from "../PersistedQueue.js"

interface RedisWithQueue extends Redis {
  offer(
    keyQueue: string,
    keyIds: string,
    id: string,
    payload: string
  ): Promise<void>
  resetQueue(
    keyQueue: string,
    keyPending: string,
    prefix: string
  ): Promise<void>
  requeue(
    keyQueue: string,
    keyPending: string,
    keyLock: string,
    id: string,
    payload: string
  ): Promise<void>
  take(
    keyQueue: string,
    keyPending: string,
    prefix: string,
    workerId: string,
    batchSize: number,
    pttl: number
  ): Promise<Array<string> | null>
  complete(
    keyPending: string,
    keyLock: string,
    id: string
  ): Promise<void>
  failed(
    keyPending: string,
    keyLock: string,
    keyFailed: string,
    id: string,
    payload: string
  ): Promise<void>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(
  options: RedisOptions & {
    readonly prefix?: string | undefined
    readonly pollInterval?: Duration.DurationInput | undefined
    readonly lockRefreshInterval?: Duration.DurationInput | undefined
    readonly lockExpiration?: Duration.DurationInput | undefined
  }
) {
  const pollInterval = options.pollInterval ? Duration.decode(options.pollInterval) : Duration.seconds(1)

  const redis = yield* Effect.acquireRelease(
    Effect.sync(() => new Redis(options) as RedisWithQueue),
    (redis) => Effect.promise(() => redis.quit())
  )

  redis.defineCommand("offer", {
    lua: `
local key_queue = KEYS[1]
local key_ids = KEYS[2]
local id = ARGV[1]
local payload = ARGV[2]

local result = redis.call("SADD", key_ids, id)
if result == 1 then
  redis.call("RPUSH", key_queue, payload)
end
`,
    numberOfKeys: 2,
    readOnly: false
  })

  redis.defineCommand("resetQueue", {
    lua: `
local key_queue = KEYS[1]
local key_pending = KEYS[2]
local prefix = ARGV[1]

local entries = redis.call("HGETALL", key_pending)
for id, payload in pairs(entries) do
  local lock_key = prefix .. id .. ":lock"
  local exists = redis.call("EXISTS", lock_key)
  if exists == 0 then
    redis.call("RPUSH", key_queue, payload)
    redis.call("HDEL", key_pending, id)
  end
end
`,
    numberOfKeys: 2,
    readOnly: false
  })

  redis.defineCommand("requeue", {
    lua: `
local key_queue = KEYS[1]
local key_pending = KEYS[2]
local key_lock = KEYS[3]
local id = ARGV[1]
local payload = ARGV[2]

redis.call("DEL", key_lock)
redis.call("HDEL", key_pending, id)
redis.call("RPUSH", key_queue, payload)
`,
    numberOfKeys: 3,
    readOnly: false
  })

  redis.defineCommand("complete", {
    lua: `
local key_pending = KEYS[1]
local key_lock = KEYS[2]
local id = ARGV[1]

redis.call("DEL", key_lock)
redis.call("HDEL", key_pending, id)
`,
    numberOfKeys: 2,
    readOnly: false
  })

  redis.defineCommand("failed", {
    lua: `
local key_pending = KEYS[1]
local key_lock = KEYS[2]
local key_failed = KEYS[3]
local id = ARGV[1]
local payload = ARGV[2]

redis.call("DEL", key_lock)
redis.call("HDEL", key_pending, id)
redis.call("RPUSH", key_failed, payload)
`,
    numberOfKeys: 2,
    readOnly: false
  })

  redis.defineCommand("take", {
    lua: `
local key_queue = KEYS[1]
local key_pending = KEYS[2]
local prefix = ARGV[1]
local worker_id = ARGV[2]
local batch_size = tonumber(ARGV[3])
local pttl = ARGV[4]

local payloads = redis.call("LPOP", key_queue, batch_size)
if not payloads then
  return nil
end

for i, payload in ipairs(payloads) do
  local id = cjson.decode(payload).id
  local key_lock = prefix .. id .. ":lock"
  redis.call("SET", key_lock, worker_id, "PX", pttl)
  redis.call("HSET", key_pending, id, payload)
end

return payloads
`,
    numberOfKeys: 2,
    readOnly: false
  })

  const lockRefreshMillis = options.lockRefreshInterval ? Duration.toMillis(options.lockRefreshInterval) : 30_000
  const lockExpirationMillis = options.lockExpiration ? Duration.toMillis(options.lockExpiration) : 90_000
  const prefix = options.prefix ?? "effectq:"
  const keyQueue = (name: string) => `${prefix}${name}`
  const keyLock = (id: string) => `${prefix}${id}:lock`
  const keyPending = (name: string) => `${prefix}${name}:pending`
  const keyFailed = (name: string) => `${prefix}${name}:failed`
  const workerId = crypto.randomUUID()

  type Element = {
    readonly id: string
    readonly element: unknown
    attempts: number
    lastFailure?: string
  }

  const mailboxes = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(name: string) {
      const queueKey = keyQueue(name)
      const pendingKey = keyPending(name)
      const mailbox = yield* Mailbox.make<Element>()
      const takers = MutableRef.make(0)
      const pollLatch = Effect.unsafeMakeLatch()
      const takenLatch = Effect.unsafeMakeLatch()

      yield* Effect.addFinalizer(() =>
        Effect.flatMap(
          mailbox.clear,
          (elements) =>
            elements.length === 0
              ? Effect.void
              : Effect.promise(() =>
                Promise.all(Array.from(elements, (element) =>
                  redis.requeue(
                    queueKey,
                    pendingKey,
                    keyLock(element.id),
                    element.id,
                    JSON.stringify(element)
                  )))
              )
        )
      )

      yield* Effect.sync(() => {
        redis.resetQueue(queueKey, pendingKey, prefix)
      }).pipe(
        Effect.andThen(Effect.sleep(lockRefreshMillis)),
        Effect.forever,
        Effect.forkScoped,
        Effect.interruptible
      )

      const poll = (size: number) =>
        Effect.promise(() =>
          redis.take(
            queueKey,
            pendingKey,
            prefix,
            workerId,
            size,
            lockExpirationMillis
          )
        )

      yield* Effect.gen(function*() {
        while (true) {
          yield* pollLatch.await
          yield* Effect.yieldNow()
          const results = takers.current === 0 ? null : yield* poll(takers.current)
          if (results === null) {
            yield* Effect.sleep(pollInterval)
            continue
          }
          takenLatch.unsafeClose()
          yield* mailbox.offerAll(results.map((json) => JSON.parse(json)))
          yield* takenLatch.await
          yield* Effect.yieldNow()
        }
      }).pipe(
        Effect.sandbox,
        Effect.retry(Schedule.spaced(500)),
        Effect.forkScoped,
        Effect.interruptible
      )

      return { mailbox, takers, pollLatch, takenLatch } as const
    }),
    idleTimeToLive: Duration.seconds(30)
  })

  const activeLockKeys = new Set<string>()

  yield* Effect.gen(function*() {
    while (true) {
      yield* Effect.sleep(lockRefreshMillis)
      activeLockKeys.forEach((key) => {
        redis.pexpire(key, lockExpirationMillis)
      })
    }
  }).pipe(
    Effect.forkScoped,
    Effect.interruptible,
    Effect.annotateLogs({
      package: "@effect/experimental",
      module: "PersistedQueue/Redis",
      fiber: "refreshLocks"
    })
  )

  return PersistedQueue.PersistedQueueStore.of({
    offer: ({ element, id, isCustomId, name }) =>
      Effect.tryPromise({
        try: (): Promise<any> =>
          isCustomId
            ? redis.offer(
              `${prefix}${name}`,
              `${prefix}${name}:ids`,
              id,
              JSON.stringify({ id, element, attempts: 0 })
            )
            : redis.lpush(`${prefix}${name}`, JSON.stringify({ id, element, attempts: 0 })),
        catch: (cause) =>
          new PersistedQueue.PersistedQueueError({
            message: "Failed to offer element to persisted queue",
            cause
          })
      }),
    take: (options) =>
      Effect.uninterruptibleMask((restore) =>
        RcMap.get(mailboxes, options.name).pipe(
          Effect.flatMap(({ mailbox, pollLatch, takenLatch, takers }) => {
            takers.current++
            if (takers.current === 1) {
              pollLatch.unsafeOpen()
            }
            return Effect.tap(restore(mailbox.take as Effect.Effect<Element>), () => {
              takers.current--
              if (takers.current === 0) {
                pollLatch.unsafeClose()
                takenLatch.unsafeOpen()
              } else if (Option.getOrUndefined(mailbox.unsafeSize()) === 0) {
                takenLatch.unsafeOpen()
              }
            })
          }),
          Effect.scoped,
          Effect.tap((element) => {
            const lock = keyLock(element.id)
            activeLockKeys.add(lock)
            return Effect.addFinalizer(Exit.match({
              onFailure: (cause) => {
                activeLockKeys.delete(lock)
                const nextAttempts = element.attempts + 1
                if (nextAttempts >= options.maxAttempts) {
                  return Effect.promise(() =>
                    redis.failed(
                      keyPending(options.name),
                      lock,
                      keyFailed(options.name),
                      element.id,
                      JSON.stringify({
                        ...element,
                        lastFailure: Cause.pretty(cause, { renderErrorCause: true }),
                        attempts: nextAttempts
                      })
                    )
                  )
                }
                return Effect.promise(() =>
                  redis.requeue(
                    keyQueue(options.name),
                    keyPending(options.name),
                    lock,
                    element.id,
                    JSON.stringify(
                      Cause.isInterruptedOnly(cause)
                        ? element
                        : {
                          ...element,
                          lastFailure: Cause.pretty(cause, { renderErrorCause: true }),
                          attempts: nextAttempts
                        }
                    )
                  )
                )
              },
              onSuccess: () => {
                activeLockKeys.delete(lock)
                return Effect.promise(() =>
                  redis.complete(
                    keyPending(options.name),
                    lock,
                    element.id
                  )
                )
              }
            }))
          })
        )
      )
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerStore = (
  options: RedisOptions & {
    readonly prefix?: string | undefined
    readonly pollInterval?: Duration.DurationInput | undefined
    readonly lockRefreshInterval?: Duration.DurationInput | undefined
    readonly lockExpiration?: Duration.DurationInput | undefined
  }
) => Layer.scoped(PersistedQueue.PersistedQueueStore, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerStoreConfig = (
  options: Config.Config.Wrap<RedisOptions & { readonly prefix?: string | undefined }>
) => Layer.scoped(PersistedQueue.PersistedQueueStore, Effect.flatMap(Config.unwrap(options), make))
