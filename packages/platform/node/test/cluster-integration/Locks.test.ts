import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { type Backend, make } from "./harness.ts"

describe("cluster lock-storage integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
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
            Effect.sync(() => {
              const assignments = Object.values(cluster.assignmentMap())
              assert(assignments.every((owners) => owners.length <= 1), "A shard had multiple owners")
              return assignments.some((owners) => owners.includes(faultedAddress)) &&
                assignments.some((owners) => owners.includes(peerAddress))
            })
          )

          const recovered = yield* cluster.waitForStableAssignments()
          assert(
            Object.values(recovered).some((owners) => owners.includes(faultedAddress)),
            "The recovered runner did not rejoin the assignment ring"
          )
        }),
      { timeout: 60_000, retry: 0 }
    )

    it.live(`${backend}: does not reacquire a shard before forced release completes`, () => {
      let clearFault: Effect.Effect<void> = Effect.void
      return Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 4 } })
        const [faulted] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const faultedAddress = `${faulted.address.host}:${faulted.address.port}`

        clearFault = cluster.faultLock(faulted, "clear")
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
      }).pipe(Effect.ensuring(Effect.suspend(() => clearFault)))
    }, { timeout: 60_000, retry: 0 })

    it.live(`${backend}: keeps peers progressing when a lock query is permanently stuck`, () => {
      let clearFault: Effect.Effect<void> = Effect.void
      return Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 4 } })
        const [faulted] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const faultedAddress = `${faulted.address.host}:${faulted.address.port}`

        clearFault = cluster.faultLock(faulted, "clear")
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
      }).pipe(Effect.ensuring(Effect.suspend(() => clearFault)))
    }, { timeout: 60_000, retry: 0 })

    it.live(`${backend}: converges after repeated lock-connection rebuilds and a hung release`, () => {
      let clearFault: Effect.Effect<void> = Effect.void
      return Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty, config: { shardsPerGroup: 4 } })
        const [faulted] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const faultedAddress = `${faulted.address.host}:${faulted.address.port}`

        clearFault = cluster.faultLock(faulted, "clear")
        yield* cluster.faultLock(faulted, "fail")
        let healthyPolls = 0
        yield* cluster.waitUntil(
          "The runner did not remain available after rebuilding its failed lock connection",
          Effect.sync(() => {
            const assignments = Object.values(cluster.assignmentMap())
            healthyPolls = assignments.every((owners) => owners.length === 1 && owners.includes(faultedAddress))
              ? healthyPolls + 1
              : 0
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
      }).pipe(Effect.ensuring(Effect.suspend(() => clearFault)))
    }, { timeout: 60_000, retry: 0 })
  }
})
