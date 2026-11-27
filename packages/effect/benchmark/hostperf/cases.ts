import { Context, Data, Effect, Exit, Fiber, HashMap, Layer, ManagedRuntime, Pool, Queue, Schema, Scope } from "effect"

/**
 * One measured operation. `run` may return a Promise; sync cases are timed
 * without awaiting so the loop adds no microtask cost.
 */
export interface Instance {
  readonly run: () => unknown
  readonly validate: (result: unknown) => void
  readonly dispose?: () => Promise<void>
}

export interface BenchCase {
  readonly name: string
  /** Logical operations performed by one `run`; results are reported per operation. */
  readonly operations: number
  readonly make: () => Instance | Promise<Instance>
}

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
  }
}

const yieldCount = 100
const forkCount = 100
const queueItems = 1_000
const poolSize = 4
const poolGets = 1_000
const contendedFibers = 8
const contendedGets = 8
const hashMapKeys = 1_000
const appRequests = 100

const sumTo = (n: number) => n * (n - 1) / 2

const makePool = async () => {
  const scope = await Effect.runPromise(Scope.make())
  let next = 0
  const pool = await Effect.runPromise(
    Pool.make({ acquire: Effect.sync(() => ++next), size: poolSize }).pipe(Scope.provide(scope))
  )
  return { pool, dispose: () => Effect.runPromise(Scope.close(scope, Exit.void)) }
}

class NotFound extends Data.TaggedError("NotFound")<{ readonly id: number }> {}

class Users extends Context.Service<Users, {
  readonly find: (id: number) => Effect.Effect<{ readonly id: number; readonly name: string }, NotFound>
}>()("hostperf/Users") {}

class Greeter extends Context.Service<Greeter, {
  readonly greet: (name: string) => Effect.Effect<string>
}>()("hostperf/Greeter") {}

const UsersLive = Layer.sync(Users)(() => {
  const users = new Map(Array.from({ length: 90 }, (_, id) => [id, { id, name: `user-${id}` }]))
  return Users.of({
    find: (id) => {
      const user = users.get(id)
      return user === undefined ? Effect.fail(new NotFound({ id })) : Effect.succeed(user)
    }
  })
})

const GreeterLive = Layer.effect(Greeter)(Effect.gen(function*() {
  const prefix = yield* Effect.succeed("hello ")
  return Greeter.of({ greet: (name) => Effect.sync(() => prefix + name) })
}))

const handleRequest = Effect.fnUntraced(function*(id: number) {
  const users = yield* Users
  const greeter = yield* Greeter
  const user = yield* users.find(id)
  return yield* greeter.greet(user.name)
}, Effect.catchTag("NotFound", (error) => Effect.succeed(`missing ${error.id}`)))

const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
  active: Schema.Boolean,
  tags: Schema.Array(Schema.String),
  address: Schema.Struct({
    street: Schema.String,
    city: Schema.String,
    zip: Schema.optional(Schema.String)
  })
})

export const cases: ReadonlyArray<BenchCase> = [
  {
    name: "Effect/yield",
    operations: yieldCount,
    make: () => {
      const program = Effect.gen(function*() {
        let i = 0
        for (; i < yieldCount; i++) yield* Effect.yieldNow
        return i
      })
      return { run: () => Effect.runPromise(program), validate: (result) => expectEqual(result, yieldCount) }
    }
  },
  {
    name: "Effect/forkJoin",
    operations: forkCount,
    make: () => {
      const program = Effect.gen(function*() {
        const fibers: Array<Fiber.Fiber<number>> = []
        for (let i = 0; i < forkCount; i++) fibers.push(yield* Effect.forkChild(Effect.succeed(i)))
        let sum = 0
        for (const fiber of fibers) sum += yield* Fiber.join(fiber)
        return sum
      })
      return { run: () => Effect.runPromise(program), validate: (result) => expectEqual(result, sumTo(forkCount)) }
    }
  },
  {
    name: "Queue/queueTake",
    operations: queueItems,
    make: () => {
      const program = Effect.gen(function*() {
        const queue = yield* Queue.bounded<number>(16)
        yield* Effect.forkChild(Effect.gen(function*() {
          for (let i = 0; i < queueItems; i++) yield* Queue.offer(queue, i)
        }))
        let sum = 0
        for (let i = 0; i < queueItems; i++) sum += yield* Queue.take(queue)
        return sum
      })
      return { run: () => Effect.runPromise(program), validate: (result) => expectEqual(result, sumTo(queueItems)) }
    }
  },
  {
    name: "Pool/get and release (fixed pool)",
    operations: poolGets,
    make: async () => {
      const { dispose, pool } = await makePool()
      const program = Effect.gen(function*() {
        let count = 0
        for (let i = 0; i < poolGets; i++) {
          if ((yield* Effect.scoped(Pool.get(pool))) > 0) count++
        }
        return count
      })
      return { run: () => Effect.runPromise(program), validate: (result) => expectEqual(result, poolGets), dispose }
    }
  },
  {
    name: "Pool/poolUseContended",
    operations: contendedFibers * contendedGets,
    make: async () => {
      const { dispose, pool } = await makePool()
      const worker = Effect.gen(function*() {
        let count = 0
        for (let i = 0; i < contendedGets; i++) {
          count += yield* Pool.use(pool, () => Effect.as(Effect.yieldNow, 1))
        }
        return count
      })
      const program = Effect.all(Array.from({ length: contendedFibers }, () => worker), {
        concurrency: "unbounded"
      }).pipe(Effect.map((counts) => counts.reduce((a, b) => a + b, 0)))
      return {
        run: () => Effect.runPromise(program),
        validate: (result) => expectEqual(result, contendedFibers * contendedGets),
        dispose
      }
    }
  },
  {
    name: "HashMap/set n fresh string keys + get all",
    operations: hashMapKeys,
    make: () => {
      let round = 0
      return {
        run: () => {
          const prefix = `k${round++}-`
          const keys = new Array<string>(hashMapKeys)
          for (let i = 0; i < hashMapKeys; i++) keys[i] = prefix + i
          let map = HashMap.empty<string, number>()
          for (let i = 0; i < hashMapKeys; i++) map = HashMap.set(map, keys[i], i)
          let sum = 0
          for (let i = 0; i < hashMapKeys; i++) {
            const value = HashMap.get(map, keys[i])
            if (value._tag === "Some") sum += value.value
          }
          return sum
        },
        validate: (result) => expectEqual(result, sumTo(hashMapKeys))
      }
    }
  },
  {
    name: "Schema/decode struct (valid)",
    operations: 1,
    make: () => {
      const decode = Schema.decodeUnknownSync(UserSchema)
      const input = {
        id: 1,
        name: "Ada",
        email: "ada@example.com",
        active: true,
        tags: ["admin", "ops", "dev"],
        address: { street: "1 Main St", city: "London", zip: "N1" }
      }
      return {
        run: () => decode(input),
        validate: (result) => expectEqual((result as typeof input).address.city, "London")
      }
    }
  },
  {
    name: "app/app-untraced",
    operations: appRequests,
    make: async () => {
      const runtime = ManagedRuntime.make(Layer.mergeAll(UsersLive, GreeterLive))
      await runtime.runPromise(Effect.void)
      const ids = Array.from({ length: appRequests }, (_, i) => i)
      const program = Effect.forEach(ids, handleRequest)
      return {
        run: () => runtime.runPromise(program),
        validate: (result) => {
          const responses = result as ReadonlyArray<string>
          expectEqual(responses[0], "hello user-0")
          expectEqual(responses[appRequests - 1], `missing ${appRequests - 1}`)
        },
        dispose: () => runtime.dispose()
      }
    }
  }
]
