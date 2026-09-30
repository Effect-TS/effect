import type * as NodeRedisModule from "@effect/platform-node/NodeRedis"
import * as Command from "@effect/redis/RedisCommand"
import * as Transaction from "@effect/redis/RedisTransaction"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { join } from "node:path"

const NodeRedis: typeof NodeRedisModule = await import(
  new URL("../../platform/node/src/NodeRedis.ts", import.meta.url).href
)

interface Options {
  readonly implementation: "native" | "reference"
  readonly referenceDir: string
  readonly name: string
  readonly endpoints: ReadonlyArray<{ readonly host: string; readonly port: number }>
  readonly warmupTime: number
  readonly iterations?: number
  readonly calibrationTime: number
}

const options: Options = JSON.parse(process.argv[2])
const batchSize = options.name === "standalone-sequential" ? 1 : 128
const clustered = options.name.startsWith("cluster-")
const multiSlot = options.name === "cluster-multiple-slots-pipeline128"
const raw = options.name === "standalone-reserved-pipeline128"
const transaction = options.name === "standalone-transactions128"
const binaryGet = options.name === "standalone-binary-get128"
const binarySet = options.name === "standalone-binary-set128"
const binary = binaryGet || binarySet
const keys = Array.from(
  { length: batchSize },
  (_, index) => `{parity${multiSlot ? index : 0}}:${options.name}:client`
)
const uniqueKeys = [...new Set(keys)]
const payload = Buffer.from(Array.from({ length: 4096 }, (_, index) => index % 256))
const scope = await Effect.runPromise(Scope.make())
let reference: any
let run: (iterations: number) => Promise<Array<ReadonlyArray<unknown>>>
let get: (key: string) => Promise<unknown>
let nativeResults = false
let rawResults = false
let expected = 0n

try {
  if (options.implementation === "native") {
    const client = await Effect.runPromise(
      NodeRedis.make({
        topology: clustered
          ? { _tag: "Cluster", seeds: options.endpoints }
          : { _tag: "Standalone", endpoint: options.endpoints[0] }
      }).pipe(Scope.provide(scope))
    )
    for (const key of uniqueKeys) {
      await Effect.runPromise(client.run(Command.make(["DEL", key], Command.integer, { keyIndexes: [1] })))
      if (binary) await Effect.runPromise(client.run(Command.set(key, payload)))
    }
    get = binary
      ? (key) => Effect.runPromise(client.run(Command.getBytes(key)))
      : (key) => Effect.runPromise(client.run(Command.get(key)))
    const commands: Array<Command.RedisCommand<bigint | string | Uint8Array | null>> = keys.map((key) =>
      binaryGet
        ? Command.getBytes(key)
        : binarySet
        ? Command.set(key, payload)
        : Command.make(["INCR", key], Command.integer, { keyIndexes: [1] })
    )
    const connection = raw ? await Effect.runPromise(client.reserve().pipe(Scope.provide(scope))) : undefined
    const operation = connection
      ? connection.pipeline(commands)
      : transaction
      ? Transaction.execute(client, commands)
      : batchSize === 1
      ? Effect.map(client.run(commands[0]), (value) => [value])
      : client.pipeline(commands)
    nativeResults = batchSize !== 1
    rawResults = raw
    run = (iterations) =>
      Effect.runPromise(Effect.gen(function*() {
        const outputs: Array<ReadonlyArray<unknown>> = []
        for (let index = 0; index < iterations; index++) {
          const replies = yield* operation
          if (replies === null) throw new Error("Unexpected WATCH conflict")
          outputs.push(replies)
        }
        return outputs
      }))
  } else {
    const require = createRequire(join(options.referenceDir, "package.json"))
    const { createClient, createCluster, RESP_TYPES } = require("redis")
    reference = clustered
      ? createCluster({ rootNodes: options.endpoints.map(({ host, port }) => ({ url: `redis://${host}:${port}` })) })
      : createClient({ socket: options.endpoints[0] })
    if (binary) reference = reference.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer })
    reference.on("error", (error: unknown) => console.error(error))
    await reference.connect()
    for (const key of uniqueKeys) {
      await reference.del(key)
      if (binary) await reference.set(key, payload)
    }
    get = (key) => reference.get(key)
    run = async (iterations) => {
      const outputs: Array<ReadonlyArray<unknown>> = []
      for (let index = 0; index < iterations; index++) {
        if (transaction) {
          const multi = reference.multi()
          for (const key of keys) multi.incr(key)
          outputs.push(await multi.exec())
        } else if (batchSize === 1) {
          outputs.push([await reference.incr(keys[0])])
        } else {
          outputs.push(
            await Promise.all(keys.map((key) =>
              binaryGet
                ? reference.get(key)
                : binarySet
                ? reference.set(key, payload)
                : reference.incr(key)
            ))
          )
        }
      }
      return outputs
    }
  }

  // Both implementations retain the same batch results during timing. Exact
  // validation, including bigint conversion and binary comparison, happens after.
  const validate = (outputs: Array<ReadonlyArray<unknown>>) => {
    for (const replies of outputs) {
      assert.equal(replies.length, batchSize)
      for (let index = 0; index < replies.length; index++) {
        let value: any = nativeResults ? Result.getOrThrow(replies[index] as any) : replies[index]
        if (rawResults) {
          assert.equal(value._tag, "Integer")
          value = value.value
        }
        if (binaryGet) {
          assert.ok(value instanceof Uint8Array)
          assert.ok(payload.equals(value), "Binary GET changed bytes")
        } else if (binarySet) {
          assert.equal(value, "OK")
        } else {
          const next = multiSlot ? expected + 1n : expected + BigInt(index + 1)
          assert.equal(BigInt(value), next, `Incorrect ordered INCR reply at position ${index}`)
        }
      }
      if (!binary) expected += BigInt(multiSlot ? 1 : batchSize)
    }
  }
  const validateStored = async () => {
    for (const key of uniqueKeys) {
      const final = await get(key)
      if (binary) {
        assert.ok(final instanceof Uint8Array)
        assert.ok(payload.equals(final), "Final stored bytes changed")
      } else {
        assert.equal(String(final), String(expected), `Incorrect final counter for ${key}`)
      }
    }
  }
  const warmupStart = performance.now()
  do {
    validate(await run(16))
  } while (performance.now() - warmupStart < options.warmupTime)
  await validateStored()

  let iterations = options.iterations ?? 16
  let elapsedMs = 0
  do {
    elapsedMs = 0
    // Bound retained 4 KiB replies at 32 MiB rather than retaining a full
    // one-second sample. Both drivers use the same 64-iteration chunks.
    for (let remaining = iterations; remaining > 0; remaining -= 64) {
      const start = performance.now()
      const outputs = await run(Math.min(64, remaining))
      elapsedMs += performance.now() - start
      validate(outputs)
    }
    await validateStored()
    if (options.iterations !== undefined || elapsedMs >= options.calibrationTime) break
    iterations *= 2
  } while (options.iterations === undefined && elapsedMs < options.calibrationTime)

  console.log(JSON.stringify({
    name: options.name,
    implementation: options.implementation,
    iterations,
    commands: iterations * batchSize,
    elapsedMs,
    nsPerCommand: elapsedMs * 1_000_000 / (iterations * batchSize),
    node: process.version,
    verified: true
  }))
} finally {
  if (reference?.isOpen) reference.destroy()
  await Effect.runPromise(Scope.close(scope, Exit.void))
}
