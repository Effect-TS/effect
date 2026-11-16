import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Layer } from "effect"
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

    it.live(`${backend}: keeps the shards it holds while handing a burst of shards to a joining runner`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty })
        const [holder] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const holderAddress = `${holder.address.host}:${holder.address.port}`
        // Releasing about 150 of the 300 shards together takes longer than the
        // 500ms lock operation deadline on this lock connection.
        yield* cluster.faultLock(holder, "slow")

        // The owners of each shard as they change
        const history = new Map<string, Array<string>>()
        const record = Effect.sync(() => {
          for (const [shard, owners] of Object.entries(cluster.assignmentMap())) {
            const changes = history.get(shard) ?? []
            const current = owners.join(",")
            if (changes[changes.length - 1] !== current) changes.push(current)
            history.set(shard, changes)
          }
        })
        yield* record
        const recorder = yield* Effect.forkChild(Effect.forever(Effect.andThen(Effect.sleep(10), record)))
        const [joiner] = yield* cluster.start(1)
        const joinerAddress = `${joiner.address.host}:${joiner.address.port}`
        const assignments = yield* cluster.waitForStableAssignments("30 seconds")
        // Run a few more lock refreshes
        yield* Effect.sleep(1500)
        yield* Fiber.interrupt(recorder)
        yield* record

        assert(Object.values(assignments).some((owners) => owners.includes(joinerAddress)), "No shard moved")
        for (const [shard, owners] of Object.entries(assignments)) {
          if (!owners.includes(holderAddress)) continue
          assert.deepStrictEqual(history.get(shard), [holderAddress], `The holder lost shard ${shard}`)
        }
      }))
  }
})
