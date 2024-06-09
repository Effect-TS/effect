# @effect/sql-drizzle

## 0.1.2

### Patch Changes

- Updated dependencies [[`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612), [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b), [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba), [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36)]:
  - effect@3.3.1
  - @effect/sql@0.3.10

## 0.1.1

### Patch Changes

- Updated dependencies [[`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd), [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376), [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f)]:
  - effect@3.3.0
  - @effect/sql@0.3.9

## 0.1.0

### Minor Changes

- [#2860](https://github.com/Effect-TS/effect/pull/2860) [`e50e01d`](https://github.com/Effect-TS/effect/commit/e50e01db54958c74946ac0e7dbba8c461671ccae) Thanks @tim-smart! - add @effect/sql-drizzle integration package

  This package allows you to use drizzle's query builders with
  `@effect/sql`.

  ```ts
  import { SqliteDrizzle } from "@effect/sql-drizzle/Sqlite";
  import * as D from "drizzle-orm/sqlite-core";
  import { Effect } from "effect";

  const users = D.sqliteTable("users", {
    id: D.integer("id").primaryKey(),
    name: D.text("name"),
  });

  Effect.gen(function* () {
    const db = yield* SqliteDrizzle;
    yield* db.delete(users);
    yield* db.insert(users).values({ id: 1, name: "Alice" });
    const results: Array<{
      id: number;
      name: string | null;
    }> = yield* db.select().from(users);
    console.log("got results", results);
  });
  ```

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.3.8
