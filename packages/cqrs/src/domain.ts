import { dbT } from "@matechs/orm";
import { Aggregate } from "./aggregate";
import { createTable } from "./createTable";
import { effect as T } from "@matechs/effect";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { Read } from "./read";
import { ReadSideConfig } from "./config";
import { DomainFetcher, DomainFetcherAll } from "./fetchSlice";
import { MorphADT } from "@morphic-ts/batteries/lib/usage/tagged-union";
import { ProgramURI } from "@morphic-ts/batteries/lib/usage/ProgramType";
import { InterpreterURI } from "@morphic-ts/batteries/lib/usage/InterpreterResult";
import { matcher } from "./matcher";

// experimental alpha
/* istanbul ignore file */

export class Domain<
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Db extends symbol | string
> {
  private readonly read: Read<Types, Tag, ProgURI, InterpURI, Db>;

  constructor(
    private readonly S: MorphADT<Types, Tag, ProgURI, InterpURI>,
    private readonly dbURI: Db,
    private readonly db = dbT(dbURI)
  ) {
    this.aggregate = this.aggregate.bind(this);
    this.init = this.init.bind(this);
    this.readAll = this.readAll.bind(this);
    this.readOnly = this.readOnly.bind(this);

    this.read = new Read(S, db);
  }

  adt = {
    ...this.S,
    matchEffect: matcher(this.S)
  };

  aggregate<Keys extends NonEmptyArray<keyof Types>>(aggregate: string, eventTypes: Keys) {
    return new Aggregate(aggregate, eventTypes, this.S, this.dbURI, this.db);
  }

  init() {
    return T.asUnit(createTable(this.db));
  }

  readAll(config: ReadSideConfig) {
    return this.read.readSideAll(config)(new DomainFetcherAll(this.S, this.db).fetchSlice());
  }

  readOnly(config: ReadSideConfig) {
    return <Keys extends NonEmptyArray<keyof Types>>(eventTypes: Keys) =>
      this.read.readSide(config)(
        new DomainFetcher(this.S, eventTypes, this.db).fetchSlice(),
        eventTypes
      );
  }
}
