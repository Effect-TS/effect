import * as T from "@matechs/effect";
import * as E from "@matechs/effect/lib/exit";
import * as SQL from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { PrimaryGeneratedColumn, Entity } from "typeorm";
import { graceful, Graceful } from "@matechs/graceful";
import { collectArray } from "@matechs/effect/lib/stream/stream";
import { Do } from "fp-ts-contrib/lib/Do";

@Entity()
class DemoEntity {
  @PrimaryGeneratedColumn()
  id: number;
}

const program: T.Effect<
  SQL.HasOrmConfig & SQL.Orm & Graceful,
  Error,
  any[]
> = SQL.bracketPool(
  Do(T.effectMonad)
    .do(SQL.withRepository(DemoEntity)(r => () => r.insert({})))
    .bindL("stream", () =>
      SQL.queryStream(m =>
        m
          .createQueryBuilder(DemoEntity, "d")
          .select("d.id")
          .orderBy("d.id", "ASC")
          .stream()
      )
    )
    .bindL("result", ({ stream }) => collectArray(stream))
    .return(s => s.result)
);

const main = pipe(
  program,
  T.provide(graceful()),
  T.provide<SQL.HasOrmConfig>({
    orm: {
      options: {
        type: "postgres",
        name: "demo_connection",
        username: "db_user",
        password: "db_pass",
        database: "demo",
        host: "127.0.0.1",
        port: 5432,
        synchronize: true,
        entities: [DemoEntity],
        extra: {
          pool: {
            min: 1,
            max: 10
          }
        }
      }
    }
  }),
  T.provide(SQL.orm)
);

T.run(main)().then(
  E.fold(
    v => {
      console.log(v);
    },
    e => {
      console.error(e);
    },
    e => {
      console.error("aborted", e);
    },
    () => {
      console.error("interrupted");
    }
  )
);
