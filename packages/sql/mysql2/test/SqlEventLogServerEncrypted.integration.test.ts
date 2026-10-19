import { Layer } from "effect"
import * as EncryptedTest from "effect-test/eventlog/EventLogServerEncryptedTest"
import * as SqlEventLogServerEncryptedStorageTest from "effect-test/eventlog/SqlEventLogServerEncryptedStorageTest"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as SqlEventLogServerEncrypted from "effect/eventlog/SqlEventLogServerEncrypted"
import { Reactivity } from "effect/reactivity"
import { MysqlContainer } from "./utils.ts"

EncryptedTest.suite(
  "mysql2",
  SqlEventLogServerEncrypted.layerStorage().pipe(
    Layer.provide([MysqlContainer.layerClient, Reactivity.layer, EventLogEncryption.layerSubtle])
  )
)

SqlEventLogServerEncryptedStorageTest.suite("mysql2", MysqlContainer.layerClientRoot)
