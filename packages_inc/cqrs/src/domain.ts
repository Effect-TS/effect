import { InterpreterURI } from "@morphic-ts/batteries/lib/usage/InterpreterResult"
import { ProgramURI } from "@morphic-ts/batteries/lib/usage/ProgramType"
import { MorphADT, AOfMorhpADT } from "@morphic-ts/batteries/lib/usage/tagged-union"

import { Aggregate } from "./aggregate"
import { ReadSideConfig } from "./config"
import { createTable } from "./createTable"
import { DomainFetcher, DomainFetcherAll } from "./fetchSlice"
import { matcher } from "./matcher"
import { MatcherT } from "./matchers"
import { Read } from "./read"

import * as T from "@matechs/core/Effect"
import * as NEA from "@matechs/core/NonEmptyArray"
import { dbT } from "@matechs/orm"

// experimental alpha
/* istanbul ignore file */

export class Domain<
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Db extends symbol | string,
  Env
> {
  private readonly read: Read<Types, Tag, ProgURI, InterpURI, Db, Env>

  constructor(
    private readonly S: MorphADT<Types, Tag, ProgURI, InterpURI, Env>,
    private readonly dbURI: Db,
    private readonly db = dbT(dbURI)
  ) {
    this.aggregate = this.aggregate.bind(this)
    this.init = this.init.bind(this)
    this.readAll = this.readAll.bind(this)
    this.readOnly = this.readOnly.bind(this)

    this.read = new Read(S, db)
  }

  adt: MorphADT<Types, Tag, ProgURI, InterpURI, Env> & {
    matchEffect: MatcherT<
      AOfMorhpADT<MorphADT<Types, Tag, ProgURI, InterpURI, Env>>,
      Tag
    >
  } = {
    ...this.S,
    matchEffect: matcher(this.S)
  }

  aggregate<Keys extends NEA.NonEmptyArray<keyof Types>>(
    aggregate: string,
    eventTypes: Keys
  ) {
    return new Aggregate(aggregate, eventTypes, this.S, this.dbURI, this.db)
  }

  init() {
    return T.asUnit(createTable(this.db))
  }

  readAll(config: ReadSideConfig) {
    return this.read.readSideAll(config)(
      new DomainFetcherAll(this.S, this.db).fetchSlice()
    )
  }

  readOnly(config: ReadSideConfig) {
    return <Keys extends NEA.NonEmptyArray<keyof Types>>(eventTypes: Keys) =>
      this.read.readSide(config)(
        new DomainFetcher(this.S, eventTypes, this.db).fetchSlice(),
        eventTypes
      )
  }
}
