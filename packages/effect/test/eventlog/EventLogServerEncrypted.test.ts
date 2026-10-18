import * as EventLogServerEncrypted from "effect/eventlog/EventLogServerEncrypted"
import * as EncryptedTest from "./EventLogServerEncryptedTest.ts"

EncryptedTest.suite("memory", EventLogServerEncrypted.layerStorageMemory)
