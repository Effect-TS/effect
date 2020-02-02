import * as t from "io-ts";
import { ADT } from "morphic-ts/lib/adt";
import { Domain } from "./domain";

// experimental alpha
/* istanbul ignore file */

export function cqrs<E, A, Tag extends keyof A & string, Db extends symbol>(
  S: ADT<A, Tag> & { type: t.Type<A, E> },
  dbURI: Db
) {
  return new Domain(S, dbURI);
}

export { EventLog } from "./eventLog";
export { ReadSideConfig } from "./config";
export { EventMetaHidden, metaURI } from "./read"
export { Aggregate } from "./aggregate"