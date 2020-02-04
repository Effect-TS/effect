import { effect as T } from "@matechs/effect";
import { Entity, PrimaryColumn, Column } from "typeorm";
import { DbT, ORM, TaskError } from "@matechs/orm";
import { offsetStore, OffsetStore } from "./read";
import { pipe } from "fp-ts/lib/pipeable";
import * as O from "fp-ts/lib/Option";

@Entity({
  name: "event_store_reads",
  synchronize: true
})
export class TableOffset {
  @PrimaryColumn({
    name: "id",
    type: "varying character"
  })
  id: string;

  @Column({
    name: "offset",
    type: "bigint"
  })
  offset: string;
}

export const ormOffsetStore = <Db extends symbol>(
  DB: DbT<Db>
): OffsetStore<ORM<Db>, TaskError, ORM<Db>, TaskError> =>
  offsetStore({
    get: (readId, streamId) =>
      pipe(
        DB.withRepositoryTask(TableOffset)(r => () =>
          r.findOne({ id: `${readId}-${streamId}` })
        ),
        T.map(O.fromNullable),
        T.map(O.map(x => BigInt(x.offset))),
        T.map(O.getOrElse(() => BigInt(0)))
      ),
    set: (readId, streamId, offset) =>
      T.asUnit(
        DB.withRepositoryTask(TableOffset)(r => () =>
          r.save({
            id: `${readId}-${streamId}`,
            offset: offset.toString(10)
          })
        )
      )
  });
