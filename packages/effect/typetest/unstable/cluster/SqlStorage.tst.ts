import type * as SqlMessageStorage from "effect/unstable/cluster/SqlMessageStorage"
import type * as SqlRunnerStorage from "effect/unstable/cluster/SqlRunnerStorage"
import { describe, expect, it } from "tstyche"

type MessageRow<BigIntValue, IntegerValue, BooleanValue, TimestampValue> = {
  readonly id: BigIntValue
  readonly message_id: string | null
  readonly shard_id: string
  readonly entity_type: string
  readonly entity_id: string
  readonly kind: IntegerValue
  readonly tag: string | null
  readonly payload: string | null
  readonly headers: string | null
  readonly trace_id: string | null
  readonly span_id: string | null
  readonly sampled: BooleanValue | null
  readonly processed: BooleanValue
  readonly request_id: BigIntValue
  readonly reply_id: BigIntValue | null
  readonly last_reply_id: BigIntValue | null
  readonly last_read: TimestampValue | null
  readonly deliver_at: BigIntValue | null
}

type MessageRowWithRowId<BigIntValue, IntegerValue, BooleanValue, TimestampValue> =
  & MessageRow<BigIntValue, IntegerValue, BooleanValue, TimestampValue>
  & { readonly rowid: BigIntValue }

type ReplyRow<BigIntValue, IntegerValue, BooleanValue> = {
  readonly id: BigIntValue
  readonly kind: IntegerValue | null
  readonly request_id: BigIntValue
  readonly payload: string
  readonly sequence: IntegerValue | null
  readonly acked: BooleanValue
}

type ReplyRowWithRowId<BigIntValue, IntegerValue, BooleanValue> =
  & ReplyRow<BigIntValue, IntegerValue, BooleanValue>
  & { readonly rowid: BigIntValue }

type RunnerRow<MachineIdValue, BooleanValue, TimestampValue> = {
  readonly machine_id: MachineIdValue
  readonly address: string
  readonly runner: string
  readonly healthy: BooleanValue
  readonly last_heartbeat: TimestampValue
}

type LockRow<TimestampValue> = {
  readonly shard_id: string
  readonly address: string
  readonly acquired_at: TimestampValue
}

describe("SQL storage row contracts", () => {
  it("describes PostgreSQL rows", () => {
    expect<SqlMessageStorage.PgMessageRow>().type.toBe<MessageRowWithRowId<bigint, number, boolean, number>>()
    expect<SqlMessageStorage.PgReplyRow>().type.toBe<ReplyRowWithRowId<bigint, number, boolean>>()
    expect<SqlRunnerStorage.PgRunnerRow>().type.toBe<RunnerRow<number, boolean, number>>()
    expect<SqlRunnerStorage.PgLockRow>().type.toBe<LockRow<number>>()
  })

  it("describes MySQL rows", () => {
    expect<SqlMessageStorage.MysqlMessageRow>().type.toBe<
      MessageRowWithRowId<number | string, number, number, Date | string>
    >()
    expect<SqlMessageStorage.MysqlReplyRow>().type.toBe<ReplyRowWithRowId<number | string, number, number>>()
    expect<SqlRunnerStorage.MysqlRunnerRow>().type.toBe<RunnerRow<number, number, Date | string>>()
    expect<SqlRunnerStorage.MysqlLockRow>().type.toBe<LockRow<Date | string>>()
  })

  it("describes Microsoft SQL Server rows", () => {
    expect<SqlMessageStorage.MssqlMessageRow>().type.toBe<MessageRowWithRowId<string, number, boolean, Date>>()
    expect<SqlMessageStorage.MssqlReplyRow>().type.toBe<ReplyRowWithRowId<string, number, boolean>>()
    expect<SqlRunnerStorage.MssqlRunnerRow>().type.toBe<RunnerRow<number, boolean, Date>>()
    expect<SqlRunnerStorage.MssqlLockRow>().type.toBe<LockRow<Date>>()
  })

  it("describes SQLite rows without a separate rowid column", () => {
    type Integer = number | bigint | string
    type Boolean = boolean | number | bigint | string

    expect<SqlMessageStorage.SqliteMessageRow>().type.toBe<MessageRow<Integer, Integer, Boolean, string>>()
    expect<SqlMessageStorage.SqliteReplyRow>().type.toBe<ReplyRow<Integer, Integer, Boolean>>()
    expect<SqlRunnerStorage.SqliteRunnerRow>().type.toBe<RunnerRow<Integer, Boolean, string>>()
    expect<SqlRunnerStorage.SqliteLockRow>().type.toBe<LockRow<string>>()
  })

  it("allows schema tools to select their scalar representations", () => {
    expect<SqlMessageStorage.MysqlMessageRow<bigint, boolean, Date>>().type.toBe<
      MessageRowWithRowId<bigint, number, boolean, Date>
    >()
    expect<SqlRunnerStorage.SqliteRunnerRow<number, boolean, Date>>().type.toBe<
      RunnerRow<number, boolean, Date>
    >()
  })
})
