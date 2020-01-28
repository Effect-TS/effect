import * as t from "io-ts";
import { ADT } from "morphic-ts/lib/adt";
import { dbT } from "@matechs/orm";
import { Aggregate } from "./aggregate";
import { pipe } from "fp-ts/lib/pipeable";
import { createTable } from "./createTable";
import { createTableSeq } from "./createTableSeq";
import { effect as T } from "@matechs/effect";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { Read } from "./read";
import { ReadSideConfig } from "./config";
import { DomainFetcher, DomainFetcherAll } from "./fetchSlice";

// experimental alpha
/* istanbul ignore file */

export type TypeADT<E, A, Tag extends keyof A & string> = ADT<A, Tag> & {
  type: t.Type<A, E>;
};

export class Domain<E, A, Tag extends keyof A & string, Db extends symbol> {
  private readonly read: Read<E, A, Tag, Db>;

  constructor(
    private readonly S: TypeADT<E, A, Tag>,
    private readonly dbURI: Db,
    private readonly db = dbT(dbURI)
  ) {
    this.aggregate = this.aggregate.bind(this);
    this.init = this.init.bind(this);
    this.readAll = this.readAll.bind(this);
    this.readOnly = this.readOnly.bind(this);

    this.read = new Read(S, db)
  }

  aggregate<Keys extends NonEmptyArray<A[Tag]>>(
    aggregate: string,
    eventTypes: Keys
  ) {
    return new Aggregate(aggregate, eventTypes, this.S, this.dbURI, this.db);
  }

  init() {
    return pipe(
      createTable(this.db),
      T.chain(_ => createTableSeq(this.db)),
      T.asUnit
    );
  }

  readAll(config: ReadSideConfig) {
    return this.read.readSideAll(config)(
      new DomainFetcherAll(this.S, this.db).fetchSlice()
    );
  }

  readOnly(config: ReadSideConfig) {
    return <Keys extends NonEmptyArray<A[Tag]>>(eventTypes: Keys) =>
      this.read.readSide(config)(
        new DomainFetcher(this.S, eventTypes, this.db).fetchSlice(),
        eventTypes
      );
  }
}
