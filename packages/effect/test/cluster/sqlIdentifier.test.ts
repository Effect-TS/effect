import { assert, describe, it } from "@effect/vitest"
import {
  SQL_IDENTIFIER_MAX_LENGTH,
  sqlIdentifier,
  storageObjectName,
  storageTableName
} from "effect/unstable/cluster/internal/sqlIdentifier"

describe("sqlIdentifier", () => {
  it("leaves short identifiers unchanged", () => {
    assert.strictEqual(sqlIdentifier("cluster_messages_shard_idx"), "cluster_messages_shard_idx")
    assert.strictEqual(storageTableName("cluster", "messages"), "cluster_messages")
    assert.strictEqual(storageObjectName("cluster", "messages", "shard_idx"), "cluster_messages_shard_idx")
    assert.strictEqual(storageObjectName("cluster", "messages", "request_id_idx"), "cluster_messages_request_id_idx")
    assert.strictEqual(
      storageObjectName("cluster", "replies", "request_lookup_idx"),
      "cluster_replies_request_lookup_idx"
    )
  })

  it("does not limit long names unless opted in", () => {
    const longPrefix = "p".repeat(80)
    const unlimited = storageObjectName(longPrefix, "messages", "request_id_idx")
    assert.isTrue(unlimited.length > SQL_IDENTIFIER_MAX_LENGTH)
    assert.strictEqual(unlimited, `${longPrefix}_messages_request_id_idx`)
  })

  it("keeps long table and index names within the SQL identifier limit when enabled", () => {
    const longPrefix = "p".repeat(80)
    const logicalIndex = `${longPrefix}_messages_request_id_idx`
    assert.isTrue(logicalIndex.length > SQL_IDENTIFIER_MAX_LENGTH)

    const names = [
      storageTableName(longPrefix, "messages", true),
      storageObjectName(longPrefix, "messages", "shard_idx", true),
      storageObjectName(longPrefix, "messages", "request_id_idx", true),
      storageObjectName(longPrefix, "replies", "request_lookup_idx", true),
      storageObjectName(longPrefix, "replies", "one_exit", true),
      storageObjectName(longPrefix, "replies", "sequence", true)
    ]
    for (const name of names) {
      assert.isTrue(name.length <= SQL_IDENTIFIER_MAX_LENGTH, name)
    }
    assert.strictEqual(
      storageObjectName(longPrefix, "messages", "shard_idx", true),
      storageObjectName(longPrefix, "messages", "shard_idx", true)
    )
    assert.notStrictEqual(
      storageObjectName(longPrefix, "messages", "shard_idx", true),
      storageObjectName(longPrefix + "x", "messages", "shard_idx", true)
    )
    assert.notStrictEqual(
      storageObjectName(longPrefix, "messages", "shard_idx", true),
      storageObjectName(longPrefix, "messages", "request_id_idx", true)
    )
  })
})
