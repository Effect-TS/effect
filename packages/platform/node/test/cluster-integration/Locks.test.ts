import { assert, describe, it } from "@effect/vitest"
import { Clock, Effect, Layer } from "effect"
import { type Backend, type ClusterRunner, make } from "./harness.ts"

const addressOf = (runner: ClusterRunner) => `${runner.address.host}:${runner.address.port}`

// Starts two runners, keeps every lock operation of one of them failing while
// its heartbeat on the shared pool still works, and waits until the peer owns
// every shard the faulted runner held. No shard may have two owners, and the
// peer may not take a shard before the faulted runner's locks have expired.
const handOffFromFailingLocks = Effect.fnUntraced(function*(backend: Backend) {
  const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 8 } })
  const [faulted, peer] = yield* cluster.start(2)
  const stable = yield* cluster.waitForStableAssignments()
  const faultedShards = Object.keys(stable).filter((shard) => stable[shard].includes(addressOf(faulted)))
  assert.isAbove(faultedShards.length, 0)

  const faultedAt = yield* Clock.currentTimeMillis
  yield* cluster.faultLock(faulted, "failAlways")
  yield* cluster.waitUntil(
    "The peer did not take over the shards of the runner whose lock operations keep failing",
    Effect.gen(function*() {
      const assignments = cluster.assignmentMap()
      assert(Object.values(assignments).every((owners) => owners.length <= 1), "A shard had multiple owners")
      const taken = faultedShards.filter((shard) => assignments[shard].includes(addressOf(peer)))
      if (taken.length > 0) {
        const elapsed = (yield* Clock.currentTimeMillis) - faultedAt
        assert.isAtLeast(elapsed, 1_750, "The peer took a shard before the faulted runner's locks expired")
      }
      return taken.length === faultedShards.length
    })
  )
  return { cluster, faulted, peer }
})

describe("cluster lock-storage integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.live(`${backend}: hands off the shards of a runner whose lock operations keep failing`, () =>
      Effect.asVoid(handOffFromFailingLocks(backend)))

    it.live(`${backend}: a runner whose lock operations kept failing rejoins once they recover`, () =>
      Effect.gen(function*() {
        const { cluster, faulted } = yield* handOffFromFailingLocks(backend)

        yield* cluster.faultLock(faulted, "clear")
        let previous = ""
        let stablePolls = 0
        yield* cluster.waitUntil(
          "The recovered runner did not rejoin the shard assignments",
          Effect.sync(() => {
            const assignments = cluster.assignmentMap()
            const owners = Object.values(assignments)
            assert(owners.every((shardOwners) => shardOwners.length <= 1), "A shard had multiple owners")
            const complete = owners.every((shardOwners) => shardOwners.length === 1) &&
              owners.some((shardOwners) => shardOwners.includes(addressOf(faulted)))
            const encoded = complete ? JSON.stringify(assignments) : ""
            stablePolls = encoded !== "" && encoded === previous ? stablePolls + 1 : 0
            previous = encoded
            return stablePolls >= 3
          })
        )
      }))

    it.live(
      `${backend}: rebuilds a blackholed reserved lock connection and rejoins without split brain`,
      () =>
        Effect.gen(function*() {
          const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 4 } })
          const [faulted] = yield* cluster.start(1)
          yield* cluster.waitForStableAssignments()
          const faultedAddress = `${faulted.address.host}:${faulted.address.port}`

          yield* cluster.faultLock(faulted, "blackhole")
          const [peer] = yield* cluster.start(1)
          const peerAddress = `${peer.address.host}:${peer.address.port}`
          yield* cluster.waitUntil(
            "The peer did not take over shards after the lock connection was blackholed",
            Effect.gen(function*() {
              yield* cluster.faultLock(faulted, "blackhole")
              const assignments = Object.values(cluster.assignmentMap())
              assert(assignments.every((owners) => owners.length <= 1), "A shard had multiple owners")
              return assignments.every((owners) => !owners.includes(faultedAddress)) &&
                assignments.some((owners) => owners.includes(peerAddress))
            })
          )

          yield* cluster.faultLock(faulted, "clear")
          const recovered = yield* cluster.waitForStableAssignments()
          assert(
            Object.values(recovered).some((owners) => owners.includes(faultedAddress)),
            "The recovered runner did not rejoin the assignment ring"
          )
        })
    )

    it.live(`${backend}: does not reacquire a shard before forced release completes`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 4 } })
        const [faulted] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const faultedAddress = `${faulted.address.host}:${faulted.address.port}`

        yield* cluster.faultLock(faulted, "hangRelease")
        yield* cluster.waitUntil(
          "The faulted runner did not drop its shards",
          Effect.sync(() => {
            const assignments = Object.values(cluster.assignmentMap())
            assert(assignments.every((owners) => owners.length <= 1), "A shard had multiple owners")
            return assignments.every((owners) => !owners.includes(faultedAddress))
          })
        )

        const [peer] = yield* cluster.start(1)
        const peerAddress = `${peer.address.host}:${peer.address.port}`
        yield* cluster.waitUntil(
          "The peer did not make progress while the forced release was pending",
          Effect.sync(() => {
            const assignments = Object.values(cluster.assignmentMap())
            assert(assignments.every((owners) => owners.length <= 1), "A shard had multiple owners")
            return assignments.some((owners) => owners.includes(peerAddress))
          })
        )

        yield* cluster.faultLock(faulted, "clear")
        let previous = ""
        let stablePolls = 0
        yield* cluster.waitUntil(
          "The cluster did not reach a terminal assignment after the forced release",
          Effect.sync(() => {
            const assignments = cluster.assignmentMap()
            const owners = Object.values(assignments)
            assert(owners.every((shardOwners) => shardOwners.length <= 1), "A shard had multiple owners")
            const complete = owners.every((shardOwners) => shardOwners.length === 1) &&
              owners.some((shardOwners) => shardOwners.includes(faultedAddress)) &&
              owners.some((shardOwners) => shardOwners.includes(peerAddress))
            const encoded = complete ? JSON.stringify(assignments) : ""
            stablePolls = encoded !== "" && encoded === previous ? stablePolls + 1 : 0
            previous = encoded
            return stablePolls >= 3
          })
        )
      }))

    it.live(`${backend}: keeps peers progressing when a lock query is permanently stuck`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 4 } })
        const [faulted] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const faultedAddress = `${faulted.address.host}:${faulted.address.port}`

        yield* cluster.faultLock(faulted, "stuck")
        yield* cluster.waitUntil(
          "The permanently stuck runner did not drop its shards",
          Effect.sync(() => Object.values(cluster.assignmentMap()).every((owners) => !owners.includes(faultedAddress)))
        )

        const [peer] = yield* cluster.start(1)
        const peerAddress = `${peer.address.host}:${peer.address.port}`
        yield* cluster.waitUntil(
          "The peer did not acquire shards while the other lock query remained stuck",
          Effect.sync(() => {
            const owners = Object.values(cluster.assignmentMap())
            assert(owners.every((shardOwners) => !shardOwners.includes(faultedAddress)))
            return owners.some((shardOwners) => shardOwners.includes(peerAddress))
          })
        )

        yield* cluster.faultLock(faulted, "clear")
        yield* cluster.waitForStableAssignments()
      }))

    it.live(`${backend}: converges after repeated lock-connection rebuilds and a hung release`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 4 } })
        const [faulted] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const faultedAddress = `${faulted.address.host}:${faulted.address.port}`

        yield* cluster.faultLock(faulted, "fail")
        let healthyPolls = 0
        yield* cluster.waitUntil(
          "The runner lost shards while rebuilding failed lock connections",
          Effect.gen(function*() {
            yield* cluster.faultLock(faulted, "fail")
            const assignments = Object.values(cluster.assignmentMap())
            assert(
              assignments.every((owners) => owners.length === 1 && owners.includes(faultedAddress)),
              "The runner lost a shard during lock-connection rebuild"
            )
            healthyPolls++
            return healthyPolls >= 10
          })
        )

        yield* cluster.faultLock(faulted, "hangRelease")
        yield* cluster.waitUntil(
          "The runner did not drop its shards while the previous connection release hung",
          Effect.sync(() => Object.values(cluster.assignmentMap()).every((owners) => !owners.includes(faultedAddress)))
        )

        const [peer] = yield* cluster.start(1)
        const peerAddress = `${peer.address.host}:${peer.address.port}`
        yield* cluster.waitUntil(
          "The peer did not acquire shards during the repeated rebuild",
          Effect.sync(() => Object.values(cluster.assignmentMap()).some((owners) => owners.includes(peerAddress)))
        )

        yield* cluster.faultLock(faulted, "clear")
        yield* cluster.waitForStableAssignments()
      }))
  }
})
