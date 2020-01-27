import { effect as T } from "@matechs/effect";
import { dbT } from "@matechs/orm";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { SelectInterpURIs } from "morphic-ts/lib/usage/InterpreterResult";
import { MorphADT } from "morphic-ts/lib/usage/materializer";
import { ProgramURI } from "morphic-ts/lib/usage/ProgramType";
import { aggregate } from "./aggregate";
import { withConfig } from "./config";
import { createTable } from "./createTable";
import { createTableSeq } from "./createTableSeq";

// experimental alpha
/* istanbul ignore file */

export function cqrs<
  E,
  A,
  Tag extends keyof A & string,
  ProgURI extends ProgramURI,
  InterpURI extends SelectInterpURIs<E, A, { type: t.Type<A, E> }>,
  Db extends symbol
>(S: MorphADT<E, A, Tag, ProgURI, InterpURI>, db: Db) {
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
