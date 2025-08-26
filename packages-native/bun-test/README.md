# @effect-native/bun-test

Effect testing utilities for Bun's test runner, providing deterministic testing with full control over time, resources, and async operations.

## Problem

Testing Effect applications involves challenges with:
- Async operations that depend on real time
- Random value generation that's non-deterministic
- Complex resource management and cleanup
- Slow tests that wait for actual timeouts

## Solution

`@effect-native/bun-test` provides **TestServices** - a controlled testing environment with:
- **TestClock** - Manipulate time programmatically instead of waiting
- **TestAnnotations** - Track test metadata and configuration
- **TestLive** - Access real services when needed
- **TestSized** - Control data generation sizes for property tests

## What "TestServices automatically provided" means

When you use `it.effect()`, TestServices are injected into your test context:

```typescript
import { it, expect } from "@effect-native/bun-test"
import { Effect, TestClock, Duration } from "effect"

it.effect("fast time control", () =>
  Effect.gen(function* () {
    // Start an operation that sleeps for 5 hours
    const fiber = yield* Effect.sleep(Duration.hours(5)).pipe(Effect.fork)

    // Advance test time by 5 hours instantly
    yield* TestClock.adjust(Duration.hours(5))

    // The fiber completes without waiting
    yield* fiber.join

    // Real time elapsed: milliseconds
    // Simulated time: 5 hours
  })
)
```

Compare with `it.live()` which uses real time:

```typescript
it.live("actual time passes", () =>
  Effect.gen(function* () {
    // This actually waits 5 seconds
    yield* Effect.sleep(Duration.seconds(5))
    // Test takes 5 real seconds to complete
  })
)
```

## Installation

```bash
bun add -D @effect-native/bun-test
```

## Test Runners

### Core Methods

- **`it.effect()`** - Standard test runner with TestServices included. Time control available.
- **`it.scoped()`** - Same as effect with automatic resource cleanup.
- **`it.live()`** - Runs without test services. Used for integration tests.
- **`it.scopedLive()`** - Live environment with resource management.

### Layer Testing

Share expensive setup across tests. Perfect for database connections, API clients, or any service that's costly to initialize:

```typescript
// src/services/Database.ts
import { Effect, Layer, Context, Data } from "effect"
import * as pg from "pg"

export class Database extends Context.Tag("Database")<Database, {
  query: <T>(sql: string, params?: unknown[]) => Effect.Effect<T[], DatabaseError>
  transaction: <A>(effect: Effect.Effect<A>) => Effect.Effect<A, DatabaseError>
}>() {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  cause: unknown
}> {}

export const DatabaseLive = Layer.scoped(
  Database,
  Effect.gen(function* () {
    // This expensive connection setup happens ONCE for all tests
    const pool = yield* Effect.acquireRelease(
      Effect.promise(() => new pg.Pool({
        connectionString: process.env.DATABASE_URL
      })),
      (pool) => Effect.promise(() => pool.end())
    )
    
    return Database.of({
      query: (sql, params) =>
        Effect.tryPromise({
          try: () => pool.query(sql, params).then(r => r.rows),
          catch: (cause) => new DatabaseError({ cause })
        }),
      transaction: (effect) => 
        // Implementation details...
    })
  })
)
```

```typescript
// src/repositories/UserRepository.ts
import { Effect, Context, Layer } from "effect"
import { Database, DatabaseError } from "./services/Database"

interface User {
  id: string
  name: string
  email: string
}

interface CreateUserData {
  name: string
  email: string
}

export class UserRepository extends Context.Tag("UserRepository")<UserRepository, {
  findById: (id: string) => Effect.Effect<User | null, DatabaseError>
  create: (data: CreateUserData) => Effect.Effect<User, DatabaseError>
  updateEmail: (id: string, email: string) => Effect.Effect<void, DatabaseError>
}>() {}

export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const db = yield* Database
    
    return UserRepository.of({
      findById: (id) =>
        db.query<User>("SELECT * FROM users WHERE id = $1", [id])
          .pipe(Effect.map(rows => rows[0] ?? null)),
      
      create: (data) =>
        db.query<User>(
          "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
          [data.name, data.email]
        ).pipe(Effect.map(rows => rows[0])),
      
      updateEmail: (id, email) =>
        db.query("UPDATE users SET email = $1 WHERE id = $2", [email, id])
          .pipe(Effect.asVoid)
    })
  })
)
```

```typescript
// test/UserRepository.test.ts
import { describe, expect, layer } from "@effect-native/bun-test"
import { Effect, Layer, Context } from "effect"
import { DatabaseLive } from "../src/services/Database"
import { UserRepository, UserRepositoryLive } from "../src/repositories/UserRepository"

// Test data context for nested layer example
class TestData extends Context.Tag("TestData")<TestData, {
  testUser: { id: string; name: string; email: string }
}>() {}

describe("UserRepository", () => {
  // The database connection is established ONCE and shared across all tests
  layer(Layer.provide(DatabaseLive, UserRepositoryLive))("with database", (it) => {
    
    it.effect("should create and find users", () =>
      Effect.gen(function* () {
        const repo = yield* UserRepository
        
        // Create a user
        const created = yield* repo.create({
          name: "Alice",
          email: "alice@example.com"
        })
        expect(created.name).toBe("Alice")
        
        // Find the user
        const found = yield* repo.findById(created.id)
        expect(found).toEqual(created)
      })
    )
    
    it.effect("should update user email", () =>
      Effect.gen(function* () {
        const repo = yield* UserRepository
        
        // Create a user
        const user = yield* repo.create({
          name: "Bob",
          email: "bob@old.com"
        })
        
        // Update email
        yield* repo.updateEmail(user.id, "bob@new.com")
        
        // Verify update
        const updated = yield* repo.findById(user.id)
        expect(updated?.email).toBe("bob@new.com")
      })
    )
    
    // You can nest layers for more complex scenarios
    describe("with test data", () => {
      const TestDataLayer = Layer.effect(
        TestData,
        Effect.gen(function* () {
          const repo = yield* UserRepository
          // Set up test data once for this nested suite
          const testUser = yield* repo.create({
            name: "Test User",
            email: "test@example.com"
          })
          return { testUser }
        })
      )
      
      it.layer(TestDataLayer)((it) => {
        it.effect("should work with pre-created test data", () =>
          Effect.gen(function* () {
            const { testUser } = yield* TestData
            const repo = yield* UserRepository
            
            const found = yield* repo.findById(testUser.id)
            expect(found).toBeDefined()
            expect(found?.name).toBe("Test User")
          })
        )
      })
    })
  })
})
```

### Property-Based Testing

Test invariants across generated data:

```typescript
import { it } from "@effect-native/bun-test"
import * as Schema from "effect/Schema"

it.prop(
  "sorting is stable",
  {
    list: Schema.Array(Schema.Number),
    sortFn: Schema.literal("asc", "desc")
  },
  ({ list, sortFn }) => {
    const sorted = sortFn === "asc"
      ? [...list].sort((a, b) => a - b)
      : [...list].sort((a, b) => b - a)

    const doubleSorted = sortFn === "asc"
      ? [...sorted].sort((a, b) => a - b)
      : [...sorted].sort((a, b) => b - a)

    expect(sorted).toEqual(doubleSorted)
  }
)
```

### Flaky Test Retry

Retry unreliable operations:

```typescript
it.effect("flaky network call", () =>
  flakyTest(
    Effect.gen(function* () {
      const response = yield* Http.get("https://flaky-api.com")
      expect(response.status).toBe(200)
    }),
    Duration.seconds(30)  // Retry for up to 30 seconds
  )
)
```

## Quick Start

```typescript
import { describe, expect, it, layer } from "@effect-native/bun-test"
import { Effect, TestClock, Duration, Layer, Context } from "effect"

describe("Time Control Demo", () => {
  it.effect("control the flow of time", () =>
    Effect.gen(function* () {
      // Schedule something for the future
      const futureRef = yield* Ref.make<string>("past")
      const fiber = yield* Effect.gen(function* () {
        yield* Effect.sleep(Duration.minutes(10))
        yield* Ref.set(futureRef, "future")
      }).pipe(Effect.fork)

      // Jump to the future
      yield* TestClock.adjust(Duration.minutes(10))
      yield* Fiber.join(fiber)

      const value = yield* Ref.get(futureRef)
      expect(value).toBe("future")
    })
  )
})
```

## Features

- **Full Effect-TS integration** with Bun's test runner
- **TestClock** for time manipulation - test timeouts, delays, and schedules instantly
- **Multiple test contexts** - choose between test services or live services
- **Layer composition** - share expensive resources efficiently
- **Property-based testing** with FastCheck integration
- **Automatic resource management** with scoped tests
- **Flaky test utilities** for unreliable operations
- **Zero config** - works out of the box with Bun

## TestServices Components

When you use `it.effect()` or `it.scoped()`, these services are automatically provided:

1. **TestClock** - Control and advance time programmatically
2. **TestAnnotations** - Track test metadata and tags
3. **TestLive** - Access real services when needed
4. **TestSized** - Control sizes for property-based testing
5. **TestConfig** - Configure test behavior (repeats, retries, etc.)

These services make tests deterministic, fast, and reliable by removing dependencies on real time and system randomness.

## License

MIT
