import { effect as T } from "@matechs/effect";
import * as E from "@matechs/effect/lib/exit";
import * as SQL from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { PrimaryGeneratedColumn, Entity } from "typeorm";
import { graceful, Graceful, trigger } from "@matechs/graceful";
import * as S from "@matechs/effect/lib/stream";
import { Do } from "fp-ts-contrib/lib/Do";
import { semigroupString } from "fp-ts/lib/Semigroup";
import { monoidString } from "fp-ts/lib/Monoid";

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

interface Console {
  console: {
    log(message: string): T.Effect<T.NoEnv, T.NoErr, void>;
  };
}

const consoleLive: Console = {
  console: {
    log(message) {
      return T.sync(() => {
        console.log(message);
      });
    }
  }
};

function log(message: string) {
  return T.accessM(({ console }: Console) => console.log(message));
}

const program: T.Effect<
  SQL.Orm & Graceful & Config & Console,
  Error,
  void
> = Do(T.effect)
  .bindL("pool", () =>
    pipe(
      SQL.createPool(),
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
      })
    )
  )
  .doL(({ pool }) =>
    pipe(
      SQL.withRepository(DemoEntity)(r => () => r.insert({})),
      SQL.usePool(pool)
    )
  )
  .bindL("stream", ({ pool }) =>
    pipe(
      SQL.queryStreamB<{ d_id: number }>(
        5,
        10
      )(m =>
        m
          .createQueryBuilder(DemoEntity, "d")
          .select("d.id")
          .orderBy("d.id", "ASC")
          .stream()
      ),
      SQL.usePool(pool)
    )
  )
  .bindL("ids", ({ stream }) =>
    T.pure(
      S.scan(
        S.stream.chain(stream, a =>
          pipe(
            a,
            S.fromArray,
            S.mapMWith(r =>
              T.access(
                ({ config: { prefix } }: Config) => `(${prefix}${r.d_id})`
              )
            ),
            s => S.fold(s, monoidString.concat, monoidString.empty)
          )
        ),
        semigroupString.concat,
        "ids: "
      )
    )
  )
  .doL(({ ids }) => pipe(ids, S.dropWith(1), S.mapMWith(log), S.drain))
  // tslint:disable-next-line: no-empty
  .return(() => {});

const module = pipe(
  T.noEnv,
  T.mergeEnv({ config: { prefix: "id:" } } as Config),
  T.mergeEnv(graceful()),
  T.mergeEnv(SQL.orm),
  T.mergeEnv(consoleLive)
);

const main = pipe(program, T.provide(module));

T.runToPromiseExit(main)
  .then(
    E.fold(
      // tslint:disable-next-line: no-empty
      () => {},
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
  .then(() => T.runToPromise(T.provide(module)(trigger())));
