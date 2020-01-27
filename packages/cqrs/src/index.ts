import { effect as T } from "@matechs/effect";
import { dbT } from "@matechs/orm";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { aggregate } from "./aggregate";
import { withConfig } from "./config";
import { createTable } from "./createTable";
import { createTableSeq } from "./createTableSeq";
import { ADT } from "morphic-ts/lib/adt";

// experimental alpha
/* istanbul ignore file */

export function cqrs<E, A, Tag extends keyof A & string, Db extends symbol>(
  S: ADT<A, Tag> & { type: t.Type<A, E> },
  db: Db
) {
  const db_ = dbT(db);

  return {
    aggregate: aggregate(db_, db)(S),
    withConfig,
    init: pipe(
      createTable(db_),
      T.chain(_ => createTableSeq(db_)),
      T.asUnit
    )
  };
}

export { InitError as CreateIndexError } from "./createIndex";
export { EventLog } from "./eventLog";
