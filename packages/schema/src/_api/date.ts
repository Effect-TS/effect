// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import * as Th from "../These"

export const dateIdentifier = Symbol.for("@effect-ts/schema/ids/date")

export const date: S.Schema<
  unknown,
  S.LeafE<S.ParseDateE>,
  Date,
  Date,
  never,
  Date,
  string,
  {}
> = pipe(
  S.identity((u): u is Date => u instanceof Date),
  S.parser((u: unknown) => {
    if (typeof u !== "string" || u == null) {
      return Th.fail(S.leafE(S.parseDateE(u)))
    }
    const ms = Date.parse(u)
    if (Number.isNaN(ms)) {
      return Th.fail(S.leafE(S.parseDateE(u)))
    }
    return Th.succeed(new Date(ms))
  }),
  S.arbitrary((_) => _.date()),
  S.encoder((_) => _.toISOString()),
  S.mapApi((_) => ({})),
  S.identified(dateIdentifier, {})
)

export const dateMsIdentifier = Symbol.for("@effect-ts/schema/ids/dateMs")

export const dateMs: S.Schema<
  unknown,
  S.ParseDateMsE,
  Date,
  Date,
  never,
  Date,
  number,
  {}
> = pipe(
  date,
  S.parser((u) =>
    typeof u === "number" ? Th.succeed(new Date(u)) : Th.fail(S.parseDateMsE(u))
  ),
  S.encoder((_) => _.getTime()),
  S.mapApi((_) => ({})),
  S.identified(dateMsIdentifier, {})
)
