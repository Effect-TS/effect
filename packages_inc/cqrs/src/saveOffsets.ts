import { T, NEA, pipe } from "@matechs/prelude";
import { DbT } from "@matechs/orm";
import { accessConfig } from "./config";

// experimental alpha
/* istanbul ignore file */

export function saveOffsets<Db extends symbol | string>(db: DbT<Db>) {
  return (events: NEA.NonEmptyArray<string>) =>
    pipe(
      accessConfig,
      T.chain(({ id }) =>
        db.withManagerTask((manager) => () => {
          const query = `UPDATE event_log SET offsets = jsonb_set(offsets, '{${id}}', 'true') WHERE id IN (${events
            .map((e) => `'${e}'`)
            .join(",")})`;
          return manager.query(query);
        })
      )
    );
}
