import type { Primitive } from "@effect/sql/Statement"

/** @internal */
export type OpfsWorkerMessage =
  | [id: number, sql: string, params: ReadonlyArray<Primitive>]
  | ["import", id: number, data: Uint8Array]
  | ["export", id: number]
  | ["update_hook"]
  | ["close"]
