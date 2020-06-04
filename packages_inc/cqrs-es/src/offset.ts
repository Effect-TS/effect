import { Entity, PrimaryColumn, Column } from "typeorm"

import { offsetStore } from "./read"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import { DbT } from "@matechs/orm"

@Entity({
  name: "event_store_reads",
  synchronize: true
})
export class TableOffset {
  @PrimaryColumn({
    name: "id",
    type: "varying character"
  })
  id: string

  @Column({
    name: "offset",
    type: "bigint"
  })
  offset: string
}

export const ormOffsetStore = <Db extends symbol | string>(DB: DbT<Db>) =>
  offsetStore({
    get: (readId, streamId) =>
      pipe(
        DB.withRepositoryTask(TableOffset)((r) => () =>
          r.findOne({ id: `${readId}-${streamId}` })
        ),
        T.map(O.fromNullable),
        T.map(O.map((x) => BigInt(x.offset))),
        T.map(O.getOrElse(() => BigInt(0)))
      ),
    set: (readId, streamId, offset) =>
      T.asUnit(
        DB.withRepositoryTask(TableOffset)((r) => () =>
          r.save({
            id: `${readId}-${streamId}`,
            offset: offset.toString(10)
          })
        )
      )
  })
