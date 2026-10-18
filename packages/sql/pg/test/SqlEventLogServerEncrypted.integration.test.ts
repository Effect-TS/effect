import { Layer } from "effect"
import * as EncryptedTest from "effect-test/eventlog/EventLogServerEncryptedTest"
import * as SqlEventLogServerEncryptedStorageTest from "effect-test/eventlog/SqlEventLogServerEncryptedStorageTest"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as SqlEventLogServerEncrypted from "effect/eventlog/SqlEventLogServerEncrypted"
import { Reactivity } from "effect/reactivity"
import { PgContainer } from "./utils.ts"

EncryptedTest.suite(
  "pg",
  SqlEventLogServerEncrypted.layerStorage().pipe(
    Layer.provide([PgContainer.layerClient, Reactivity.layer, EventLogEncryption.layerSubtle])
  )
)

SqlEventLogServerEncryptedStorageTest.suite("pg", PgContainer.layerClient)
