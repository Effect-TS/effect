import type { ProofClock, SqlExpression } from "@effect/auth-persistence/Adapter"
import { is, SQL, sql } from "drizzle-orm"

export type MappedClock = ProofClock<SQL> | ProofClock<SqlExpression>
export type ClockMapping<M> = Omit<M, "clock"> & { readonly clock: MappedClock }

/**
 * Shared storage mappings already accept native expressions. Only a clock
 * declared with a real Drizzle SQL expression needs the foreign parameter bridge.
 * Never probe callbacks by executing and retrying them with another representation.
 *
 * @internal
 */
export const nativeClock = (clock: MappedClock): ProofClock<SqlExpression> => {
  if (!is(clock.engineNowMillis, SQL)) return clock as ProofClock<SqlExpression>
  // The physical expression identifies the callback family. This erases only
  // foreign compiler variance; persisted times still use the declared codecs.
  const drizzle = clock as ProofClock<SQL>

  return {
    ...drizzle,
    toMillis: (value) => drizzle.toMillis(sql`${sql.param(value)}`),
    fromMillis: (value) => drizzle.fromMillis(sql`${sql.param(value)}`)
  }
}
