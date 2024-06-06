# @effect/sql-drizzle

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
