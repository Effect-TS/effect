import * as T from "@matechs/effect";
import * as E from "@matechs/effect/lib/exit";
import * as SQL from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { PrimaryGeneratedColumn, Entity } from "typeorm";
import { graceful, Graceful, trigger } from "@matechs/graceful";
import * as S from "@matechs/effect/lib/stream/stream";
import { Do } from "fp-ts-contrib/lib/Do";

@Entity()
class DemoEntity {
  @PrimaryGeneratedColumn()
  id: number;
}

interface Config {
  config: {
    prefix: string;
  };
}

const program: T.Effect<
  SQL.HasOrmConfig & SQL.Orm & Graceful & Config,
  Error,
  string
> = SQL.bracketPool(
  Do(T.effectMonad)
    .do(SQL.withRepository(DemoEntity)(r => () => r.insert({})))
    .bindL("stream", () =>
      SQL.queryStream<{ d_id: number }>(m =>
        m
          .createQueryBuilder(DemoEntity, "d")
          .select("d.id")
          .orderBy("d.id", "ASC")
          .stream()
      )
    )
    .bindL("ids", ({ stream }) =>
      T.right(
        S.foldM(
          stream,
          (s, r) =>
            T.accessM(({ config: { prefix } }: Config) =>
              T.fromIO(() => {
                return `${s}(${prefix}${r.d_id})`;
              })
            ),
          "ids: "
        )
      )
    )
    .bindL("result", ({ ids }) => S.collectArray(ids))
    .return(s => s.result[0])
);

const module = pipe(
  T.noEnv,
  T.mergeEnv({ config: { prefix: "id:" } } as Config),
  T.mergeEnv(graceful()),
  T.mergeEnv(SQL.orm),
  T.mergeEnv({
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
  } as SQL.HasOrmConfig)
);

const main = pipe(program, T.provide(module));

T.run(main)()
  .then(
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
  )
  .then(() => T.promise(T.provide(module)(trigger())));
