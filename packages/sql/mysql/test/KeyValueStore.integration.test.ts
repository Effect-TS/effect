import { Layer } from "effect"
import * as KeyValueStoreTest from "effect-test/unstable/persistence/KeyValueStoreTest"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import { MysqlContainer } from "./utils.ts"

KeyValueStoreTest.suite(
  "sql-mysql",
  KeyValueStore.layerSql().pipe(Layer.provide(MysqlContainer.layerClient))
)

KeyValueStoreTest.suite(
  "sql-mysql-custom-table",
  KeyValueStore.layerSql({ table: "effect_key_value_store_custom" }).pipe(
    Layer.provide(MysqlContainer.layerClient)
  )
)
