import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import { identity } from "../Function.ts"
import * as Match from "../Match.ts"
import * as Option from "../Option.ts"
import type {
  AcquireResult,
  CircuitBreakerError,
  CircuitBreakerStore,
  Policy,
  State,
  Transition
} from "../persistence/CircuitBreaker.ts"
import * as Redis from "../persistence/Redis.ts"
import { v4String } from "./uuid.ts"

type RecordInput = Parameters<CircuitBreakerStore["Service"]["record"]>[0]

/**
 * Creates the atomic Redis implementation of the circuit breaker store.
 */
export const makeRedisStore = (options: {
  readonly redis: Redis.Redis["Service"]
  readonly prefix: string
  readonly probeLeaseMillis: number
  readonly storeError: (message: string, cause: unknown) => CircuitBreakerError
}): CircuitBreakerStore["Service"] => {
  const acquire = options.redis.eval(acquireScript)
  const record = options.redis.eval(recordScript)
  const renewProbeLease = options.redis.eval(renewProbeLeaseScript)
  const state = options.redis.eval(stateScript)
  const lease = options.probeLeaseMillis
  const keyFor = (key: string) => `${options.prefix}{${key}}`
  const mapError = (operation: string) => (cause: Redis.RedisError) =>
    options.storeError(`Failed to execute ${operation} circuit breaker command`, cause)

  return identity<CircuitBreakerStore["Service"]>({
    acquire: ({ halfOpenPermits, key }) =>
      Effect.clockWith((clock) => {
        const now = clock.currentTimeMillisUnsafe()
        return acquire(keyFor(key), now, halfOpenPermits, v4String(), lease).pipe(
          Effect.map((reply) => decodeAcquire(key, now, reply)),
          Effect.mapError(mapError("acquire"))
        )
      }),
    // Renews three times per lease, so a probe survives two failed renewals.
    renewProbeLease: ({ key, permit }) =>
      Effect.clockWith((clock) =>
        renewProbeLease(keyFor(key), clock.currentTimeMillisUnsafe(), lease, permit.probeId ?? "")
      ).pipe(
        Effect.mapError(mapError("renewProbeLease")),
        Effect.delay(lease / 3),
        Effect.forever
      ),
    record: (input) =>
      Effect.clockWith((clock) => record(keyFor(input.key), clock.currentTimeMillisUnsafe(), lease, input)).pipe(
        Effect.map((reply) => decodeTransition(input.key, reply)),
        Effect.mapError(mapError("record"))
      ),
    state: (key) =>
      Effect.clockWith((clock) => state(keyFor(key), clock.currentTimeMillisUnsafe())).pipe(
        Effect.map(decodeState),
        Effect.mapError(mapError("state"))
      )
  })
}

type PolicyArgs = readonly [
  tag: Policy["_tag"],
  thresholdOrFailures: number,
  minimumCalls: number,
  windowMillis: number,
  buckets: number
]

const encodePolicy = Match.type<Policy>().pipe(
  Match.withReturnType<PolicyArgs>(),
  Match.tagsExhaustive({
    ConsecutiveFailures: ({ failures }) => ["ConsecutiveFailures", failures, 0, 0, 0],
    FailureRate: (
      { buckets, minimumCalls, threshold, window }
    ) => ["FailureRate", threshold, minimumCalls, Duration.toMillis(window), buckets]
  })
)

type AcquireReply =
  | readonly [tag: "Permitted", generation: number, trips: number, probeId: string, changed: 0 | 1]
  | readonly [tag: "Rejected", state: "Open", retryAt: string]
  | readonly [tag: "Rejected", state: "HalfOpen"]

type StateReply =
  | readonly [state: "Closed", generation: number]
  | readonly [state: "Open", generation: number, trips: number, retryAt: string]
  | readonly [state: "HalfOpen", generation: number, trips: number, inFlight: number, successes: number]

type TransitionReply =
  | readonly []
  | readonly [from: State["_tag"], to: State["_tag"], generation: number, at: string]

const decodeAcquire = (key: string, now: number, reply: AcquireReply): AcquireResult => {
  if (reply[0] === "Rejected") {
    return { _tag: "Rejected", state: reply[1], retryAt: reply[1] === "Open" ? Number(reply[2]) : undefined }
  }
  const [, generation, trips, probeId, changed] = reply
  return {
    _tag: "Permitted",
    permit: { generation, trips, probeId: probeId === "" ? undefined : probeId },
    transition: changed === 1 ? { key, from: "Open", to: "HalfOpen", generation, at: now } : undefined
  }
}

const decodeState = (reply: StateReply): State => {
  switch (reply[0]) {
    case "Closed":
      return { _tag: "Closed", generation: reply[1] }
    case "Open":
      return { _tag: "Open", generation: reply[1], trips: reply[2], retryAt: Number(reply[3]) }
    case "HalfOpen":
      return { _tag: "HalfOpen", generation: reply[1], trips: reply[2], inFlight: reply[3], successes: reply[4] }
  }
}

const decodeTransition = (key: string, reply: TransitionReply): Option.Option<Transition> => {
  if (reply.length === 0) return Option.none()
  const [from, to, generation, at] = reply
  return Option.some({ key, from, to, generation, at: Number(at) })
}

const keys = (key: string) => [key, `${key}:buckets`, `${key}:probes`]

const prelude = `
local key, buckets, probes = KEYS[1], KEYS[2], KEYS[3]
local now = tonumber(ARGV[1])
local stored = redis.call("HMGET", key, "state", "generation", "trips", "retryAt")
local state = stored[1] or "Closed"
local generation = tonumber(stored[2] or "0")
local trips = tonumber(stored[3] or "0")
local retryAt = tonumber(stored[4] or "0")
local grace = 86400000

local function expire(ttl)
  ttl = math.max(1, math.ceil(ttl))
  redis.call("PEXPIRE", key, ttl)
  redis.call("PEXPIRE", buckets, ttl)
  redis.call("PEXPIRE", probes, ttl)
end

local function transition(nextState, nextTrips, nextRetryAt)
  local previous = state
  state = nextState
  generation = generation + 1
  trips = nextTrips
  retryAt = nextRetryAt
  redis.call("HSET", key, "state", state, "generation", generation,
    "trips", trips, "retryAt", retryAt, "consecutive", 0, "probeSuccesses", 0)
  redis.call("DEL", buckets, probes)
  return { previous, state, generation, tostring(now) }
end
`

const acquireScript = Redis.script(
  (key: string, now: number, permits: number, probeId: string, lease: number) => [
    ...keys(key),
    now,
    permits,
    probeId,
    lease
  ],
  {
    numberOfKeys: 3,
    lua: prelude + `
local permits = tonumber(ARGV[2])
local probeId = ARGV[3]
local lease = tonumber(ARGV[4])
local changed = 0
if state == "Open" then
  if now < retryAt then return { "Rejected", "Open", tostring(retryAt) } end
  transition("HalfOpen", trips, 0)
  changed = 1
end
if state == "Closed" then return { "Permitted", generation, trips, "", changed } end
redis.call("ZREMRANGEBYSCORE", probes, "-inf", now)
expire(lease + grace)
if redis.call("ZCARD", probes) >= permits then return { "Rejected", "HalfOpen" } end
redis.call("ZADD", probes, now + lease, probeId)
return { "Permitted", generation, trips, probeId, changed }
`
  }
).withReturnType<AcquireReply>()

const renewProbeLeaseScript = Redis.script(
  (key: string, now: number, lease: number, probeId: string) => [...keys(key), now, lease, probeId],
  {
    numberOfKeys: 3,
    lua: prelude + `
local lease = tonumber(ARGV[2])
redis.call("ZADD", probes, "XX", now + lease, ARGV[3])
expire(math.max(lease, retryAt - now) + grace)
return 0
`
  }
).withReturnType<number>()

const recordScript = Redis.script(
  (key: string, now: number, lease: number, input: RecordInput) => [
    ...keys(key),
    now,
    lease,
    input.permit.generation,
    input.permit.trips,
    input.permit.probeId ?? "",
    input.outcome,
    input.halfOpenSuccesses,
    input.openForMillis,
    ...encodePolicy(input.policy)
  ],
  {
    numberOfKeys: 3,
    lua: prelude + `
local lease = tonumber(ARGV[2])
local permitGeneration = tonumber(ARGV[3])
local permitTrips = tonumber(ARGV[4])
local probeId = ARGV[5]
local outcome = ARGV[6]
local successes = tonumber(ARGV[7])
local openFor = tonumber(ARGV[8])
local policy = ARGV[9]
local threshold = tonumber(ARGV[10])
local minimumCalls = tonumber(ARGV[11])
local window = tonumber(ARGV[12])
local bucketCount = tonumber(ARGV[13])

-- Whether a closed circuit trips. Failure-rate buckets are hash fields "<epoch>:c" (calls)
-- and "<epoch>:f" (failures); fields outside the window are removed.
local function tripped()
  if policy == "ConsecutiveFailures" then
    if outcome ~= "failure" then
      redis.call("HSET", key, "consecutive", 0)
      return false
    end
    return redis.call("HINCRBY", key, "consecutive", 1) >= threshold
  end
  local epoch = math.floor(now / (window / bucketCount))
  redis.call("HINCRBY", buckets, epoch .. ":c", 1)
  if outcome == "failure" then redis.call("HINCRBY", buckets, epoch .. ":f", 1) end
  local calls, failures = 0, 0
  local fields = redis.call("HGETALL", buckets)
  for i = 1, #fields, 2 do
    local bucket, kind = string.match(fields[i], "^(.+):(%a)$")
    bucket = tonumber(bucket)
    if bucket <= epoch - bucketCount or bucket > epoch then
      redis.call("HDEL", buckets, fields[i])
    elseif kind == "c" then
      calls = calls + tonumber(fields[i + 1])
    else
      failures = failures + tonumber(fields[i + 1])
    end
  end
  return calls >= minimumCalls and failures / calls >= threshold
end

local result = {}
-- Stale permits and ignored outcomes only release their slot.
if probeId ~= "" then redis.call("ZREM", probes, probeId) end
if generation == permitGeneration and outcome ~= "ignored" then
  if state == "Closed" then
    redis.call("HSET", key, "state", state, "generation", generation, "trips", trips)
    if tripped() then result = transition("Open", permitTrips + 1, now + openFor) end
  elseif state == "HalfOpen" then
    if outcome == "failure" then
      result = transition("Open", permitTrips + 1, now + openFor)
    elseif redis.call("HINCRBY", key, "probeSuccesses", 1) >= successes then
      result = transition("Closed", 0, 0)
    end
  end
end
if state == "Open" then
  expire(retryAt - now + grace)
elseif state == "HalfOpen" then
  expire(lease + grace)
else
  -- Keep generations beyond the sampling window so stale permits cannot match an earlier generation.
  expire(grace)
end
return result
`
  }
).withReturnType<TransitionReply>()

const stateScript = Redis.script((key: string, now: number) => [...keys(key), now], {
  numberOfKeys: 3,
  lua: prelude + `
if state == "Open" then return { state, generation, trips, tostring(retryAt) } end
if state == "HalfOpen" then
  -- Count live leases without mutating the store during a state read.
  local inFlight = redis.call("ZCOUNT", probes, "(" .. tostring(now), "+inf")
  local successes = tonumber(redis.call("HGET", key, "probeSuccesses") or "0")
  return { state, generation, trips, inFlight, successes }
end
return { "Closed", generation }
`
}).withReturnType<StateReply>()
