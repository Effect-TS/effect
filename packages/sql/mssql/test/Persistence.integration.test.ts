import { Layer } from "effect"
import * as PersistedCacheTest from "effect-test/persistence/PersistedCacheTest"
import * as PersistedQueueTest from "effect-test/persistence/PersistedQueueTest"
import { PersistedQueue, Persistence } from "effect/persistence"
import { MssqlContainer } from "./utils.ts"

PersistedCacheTest.suite(
  "sql-mssql-multi",
  Persistence.layerSqlMultiTable.pipe(Layer.provide(MssqlContainer.layerClient))
)

PersistedCacheTest.suite(
  "sql-mssql-single",
  Persistence.layerSql.pipe(Layer.provide(MssqlContainer.layerClient))
)

PersistedQueueTest.suite(
  "sql-mssql",
  PersistedQueue.layerStoreSql().pipe(Layer.provide(MssqlContainer.layerClient))
)
