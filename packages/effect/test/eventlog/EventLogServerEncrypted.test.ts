import * as EventLogServerEncrypted from "effect/eventlog/EventLogServerEncrypted"
import * as CompactionTest from "./EventLogServerEncryptedCompactionTest.ts"
import * as EncryptedTest from "./EventLogServerEncryptedTest.ts"

EncryptedTest.suite("memory", EventLogServerEncrypted.layerStorageMemory)
CompactionTest.suite("memory", EventLogServerEncrypted.layerStorageMemory)
