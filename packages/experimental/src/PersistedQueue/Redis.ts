/**
 * @since 1.0.0
 */
import * as Cache from "effect/Cache"
import * as Cause from "effect/Cause"
import * as Config from "effect/Config"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as RcMap from "effect/RcMap"
import type { RedisOptions } from "ioredis"
import { Redis } from "ioredis"
import * as PersistedQueue from "../PersistedQueue.js"

interface RedisWithQueue extends Redis {
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
    pttl: number
  ): Promise<string>
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
    readonly lockRefreshInterval?: Duration.DurationInput | undefined
    readonly lockExpiration?: Duration.DurationInput | undefined
  }
) {
  const acquireClient = Effect.gen(function*() {
    const redis = yield* Effect.acquireRelease(
      Effect.sync(() => new Redis(options) as RedisWithQueue),
      (redis) => Effect.promise(() => redis.quit())
    )

    redis.defineCommand("requeue", {
      lua: `
local key_queue = KEYS[1]
local key_pending = KEYS[2]
local key_lock = KEYS[3]
local id = ARGV[1]
local payload = ARGV[2]

redis.call("DEL", key_lock)
redis.call("HDEL", key_pending, id)
redis.call("LPUSH", key_queue, payload)
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
local pttl = ARGV[3]

local item = redis.call("BLPOP", key_queue, 0)
if not item then
  return nil
end

local payload = item[2]
local id = cjson.decode(payload).id
local key_lock = prefix .. id .. ":lock"
redis.call("SET", key_lock, worker_id, "PX", pttl)
redis.call("HSET", key_pending, id, payload)

return payload
`,
      numberOfKeys: 2,
      readOnly: false
    })

    return redis
  })

  const offerClient = yield* acquireClient

  const lockRefreshMillis = options.lockRefreshInterval ? Duration.toMillis(options.lockRefreshInterval) : 30_000
  const lockExpirationMillis = options.lockExpiration ? Duration.toMillis(options.lockExpiration) : 90_000
  const prefix = options.prefix ?? "effectq:"
  const keyQueue = (name: string) => `${prefix}${name}`
  const keyLock = (id: string) => `${prefix}${id}:lock`
  const keyPending = (name: string) => `${prefix}${name}:pending`
  const keyFailed = (name: string) => `${prefix}${name}:failed`
  const workerId = crypto.randomUUID()

  type RedisElement = {
    readonly id: string
    readonly element: unknown
    attempts: number
    lastFailure?: string
  }

  const resetPending = yield* Cache.make({
    lookup: Effect.fnUntraced(function*(name: string) {
      const key = keyPending(name)
      const elements = Object.entries(yield* Effect.promise(() => offerClient.hgetall(key)))
      if (elements.length === 0) return
      const locks = yield* Effect.promise(() => offerClient.mget(...elements.map(([id]) => keyLock(id))))
      const toReset: Array<string> = []
      for (let i = 0; i < elements.length; i++) {
        if (locks[i] !== null) continue
        toReset.push(elements[i][1])
      }
      yield* Effect.promise(() => offerClient.lpush(keyQueue(name), ...toReset))
    }),
    capacity: Number.MAX_SAFE_INTEGER,
    timeToLive: Duration.minutes(15)
  })

  const clients = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(name: string) {
      yield* resetPending.get(name)
      const redis = yield* acquireClient
      const clientId = yield* Effect.promise(() => redis.client("ID"))

      return { clientId, redis } as const
    }),
    idleTimeToLive: Duration.minutes(1)
  })

  const mailboxes = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(name: string) {
      const { clientId, redis } = yield* RcMap.get(clients, name)
      const mailbox = yield* Mailbox.make<RedisElement>({ capacity: 0 })

      yield* Effect.promise(() =>
        redis.take(
          keyQueue(name),
          keyPending(name),
          prefix,
          workerId,
          lockExpirationMillis
        )
      ).pipe(
        Effect.onInterrupt(() => Effect.promise(() => offerClient.client("UNBLOCK", clientId))),
        Effect.flatMap((payload) => payload ? mailbox.offer(JSON.parse(payload)) : Effect.void),
        Effect.forever,
        Effect.forkScoped,
        Effect.interruptible
      )

      return mailbox
    })
  })

  const activeLockKeys = new Set<string>()

  yield* Effect.gen(function*() {
    while (true) {
      yield* Effect.sleep(lockRefreshMillis)
      yield* Effect.promise(() =>
        Promise.all(Array.from(activeLockKeys, (key) => offerClient.pexpire(key, lockExpirationMillis)))
      )
    }
  }).pipe(
    Effect.catchAllCause(Effect.logWarning),
    Effect.forever,
    Effect.forkScoped,
    Effect.interruptible,
    Effect.annotateLogs({
      package: "@effect/experimental",
      module: "PersistedQueue/Redis",
      fiber: "refreshLocks"
    })
  )

  return PersistedQueue.PersistedQueueStore.of({
    offer: (name, id, element) =>
      Effect.tryPromise({
        try: () => offerClient.lpush(`${prefix}${name}`, JSON.stringify({ id, element, attempts: 0 })),
        catch: (cause) =>
          new PersistedQueue.PersistedQueueError({
            message: "Failed to offer element to persisted queue",
            cause
          })
      }),
    take: (options) =>
      Effect.uninterruptibleMask((restore) =>
        RcMap.get(mailboxes, options.name).pipe(
          Effect.flatMap((m) => Effect.orDie(restore(m.take))),
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
                    offerClient.failed(
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
                  offerClient.requeue(
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
                  offerClient.complete(
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
export const layerStore = (options: RedisOptions & { readonly prefix?: string | undefined }) =>
  Layer.scoped(PersistedQueue.PersistedQueueStore, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerStoreConfig = (
  options: Config.Config.Wrap<RedisOptions & { readonly prefix?: string | undefined }>
) => Layer.scoped(PersistedQueue.PersistedQueueStore, Effect.flatMap(Config.unwrap(options), make))
