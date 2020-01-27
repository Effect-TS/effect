import { effect as T } from "@matechs/effect";
import { DbT } from "@matechs/orm";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { pipe } from "fp-ts/lib/pipeable";
import { readID } from "./config";

// experimental alpha
/* istanbul ignore file */

export function saveOffsets<Db extends symbol>(db: DbT<Db>) {
  return (events: NonEmptyArray<string>) =>
    pipe(
      readID,
      T.chain(id =>
        db.withManagerTask(manager => () => {
          const query = `UPDATE event_log SET offsets = jsonb_set(offsets, '{${id}}', 'true') WHERE id IN (${events
            .map(e => `'${e}'`)
            .join(",")})`;
          return manager.query(query);
        })
      )
    );
}
