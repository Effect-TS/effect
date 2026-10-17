import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import { identity } from "../Function.ts"
import * as Match from "../Match.ts"
import * as Option from "../Option.ts"
import type {
  CircuitBreakerStore,
  FailureRate,
  Outcome,
  Policy,
  State,
  Transition
} from "../persistence/CircuitBreaker.ts"

interface Bucket {
  readonly epoch: number
  calls: number
  failures: number
}

interface Closed {
  readonly _tag: "Closed"
  failures: number
  buckets: Array<Bucket>
}

type Phase =
  | Closed
  | { readonly _tag: "Open"; readonly retryAt: number }
  | { readonly _tag: "HalfOpen"; readonly probes: Set<string>; successes: number }

interface Entry {
  readonly key: string
  phase: Phase
  generation: number
  trips: number
  outstanding: number
}

const closed = (): Closed => ({ _tag: "Closed", failures: 0, buckets: [] })

const bucketEpoch = (policy: FailureRate, now: number): number =>
  Math.floor(now / (Duration.toMillis(policy.window) / policy.buckets))

// The buckets of the sliding window that ends with the bucket containing `now`.
const windowBuckets = (buckets: ReadonlyArray<Bucket>, policy: FailureRate, now: number): Array<Bucket> => {
  const epoch = bucketEpoch(policy, now)
  return buckets.filter((bucket) => bucket.epoch > epoch - policy.buckets && bucket.epoch <= epoch)
}

const tripped = (phase: Closed, policy: Policy, outcome: Outcome, now: number): boolean => {
  switch (policy._tag) {
    case "ConsecutiveFailures": {
      phase.failures = outcome === "failure" ? phase.failures + 1 : 0
      return phase.failures >= policy.failures
    }
    case "FailureRate": {
      const epoch = bucketEpoch(policy, now)
      phase.buckets = windowBuckets(phase.buckets, policy, now)
      let current = phase.buckets.at(-1)
      if (current?.epoch !== epoch) phase.buckets.push(current = { epoch, calls: 0, failures: 0 })
      current.calls++
      if (outcome === "failure") current.failures++
      let calls = 0
      let failures = 0
      for (const bucket of phase.buckets) {
        calls += bucket.calls
        failures += bucket.failures
      }
      return calls >= policy.minimumCalls && failures / calls >= policy.threshold
    }
  }
}

const isIdle = ({ outstanding, phase }: Entry, policy: Policy, now: number): boolean =>
  phase._tag === "Closed" && outstanding === 0 && phase.failures === 0 &&
  (policy._tag !== "FailureRate" || windowBuckets(phase.buckets, policy, now).length === 0)

const toState = ({ generation, phase, trips }: Entry): State =>
  Match.value(phase).pipe(
    Match.withReturnType<State>(),
    Match.tagsExhaustive({
      Closed: () => ({ _tag: "Closed", generation }),
      Open: ({ retryAt }) => ({ _tag: "Open", generation, trips, retryAt }),
      HalfOpen: ({ probes, successes }) => ({ _tag: "HalfOpen", generation, trips, inFlight: probes.size, successes })
    })
  )

export const makeMemoryStore = (): CircuitBreakerStore["Service"] => {
  const entries = new Map<string, Entry>()
  // Generations are global, so a key recreated after eviction never reuses the generation of a stale permit.
  let generations = 0
  let probeIds = 0

  const transition = (entry: Entry, phase: Phase, now: number): Transition => {
    const from = entry.phase._tag
    entry.phase = phase
    entry.generation = ++generations
    if (phase._tag === "Open") entry.trips++
    if (phase._tag === "Closed") entry.trips = 0
    return { key: entry.key, from, to: phase._tag, generation: entry.generation, at: now }
  }

  return identity<CircuitBreakerStore["Service"]>({
    acquire: ({ halfOpenPermits, key }) =>
      Effect.clockWith((clock) =>
        Effect.sync(() => {
          const now = clock.currentTimeMillisUnsafe()
          let entry = entries.get(key)
          if (entry === undefined) {
            entry = { key, phase: closed(), generation: ++generations, trips: 0, outstanding: 0 }
            entries.set(key, entry)
          }
          let observed: Transition | undefined
          if (entry.phase._tag === "Open") {
            if (now < entry.phase.retryAt) return { _tag: "Rejected", state: "Open", retryAt: entry.phase.retryAt }
            observed = transition(entry, { _tag: "HalfOpen", probes: new Set(), successes: 0 }, now)
          }
          let probeId: string | undefined
          if (entry.phase._tag === "HalfOpen") {
            if (entry.phase.probes.size >= halfOpenPermits) {
              return { _tag: "Rejected", state: "HalfOpen", retryAt: undefined }
            }
            probeId = String(++probeIds)
            entry.phase.probes.add(probeId)
          }
          entry.outstanding++
          return {
            _tag: "Permitted",
            permit: { generation: entry.generation, probeId, trips: entry.trips },
            transition: observed
          }
        })
      ),
    renewProbeLease: () => Effect.never,
    record: ({ halfOpenSuccesses, key, openForMillis, outcome, permit, policy }) =>
      Effect.clockWith((clock) =>
        Effect.sync(() => {
          const entry = entries.get(key)
          if (entry === undefined) return Option.none()
          const now = clock.currentTimeMillisUnsafe()
          const { phase } = entry
          entry.outstanding--
          if (phase._tag === "HalfOpen" && permit.probeId !== undefined) phase.probes.delete(permit.probeId)
          let observed: Transition | undefined
          // Stale permits and ignored outcomes only release their slot.
          if (permit.generation === entry.generation && outcome !== "ignored") {
            const open = () => transition(entry, { _tag: "Open", retryAt: now + openForMillis }, now)
            switch (phase._tag) {
              case "Closed": {
                if (tripped(phase, policy, outcome, now)) observed = open()
                break
              }
              case "HalfOpen": {
                if (outcome === "failure") {
                  observed = open()
                } else if (++phase.successes >= halfOpenSuccesses) {
                  observed = transition(entry, closed(), now)
                }
                break
              }
            }
          }
          if (isIdle(entry, policy, now)) entries.delete(key)
          return Option.fromUndefinedOr(observed)
        })
      ),
    state: (key) =>
      Effect.sync(() => {
        const entry = entries.get(key)
        return entry === undefined ? { _tag: "Closed", generation: 0 } : toState(entry)
      })
  })
}
