import {
  Connection,
  ConnectionOptions,
  createConnection,
  EntityManager,
  EntitySchema,
  ObjectType,
  Repository
} from "typeorm";
import * as Ef from "@matechs/effect";
import { toError } from "fp-ts/lib/Either";
import { IO } from "fp-ts/lib/IO";
import { pipe } from "fp-ts/lib/pipeable";
import { Graceful, onExit } from "@matechs/graceful/lib";
import { Do } from "fp-ts-contrib/lib/Do";

export interface HasOrmConfig {
  orm: {
    options: ConnectionOptions;
  };
}

export function ormConfig(options: ConnectionOptions): HasOrmConfig {
  return {
    orm: {
      options
    }
  };
}

export interface HasEntityManager {
  orm: {
    manager: EntityManager;
  };
}

export interface HasOrmPool {
  orm: {
    connection: Connection;
  };
}

export interface Orm {
  orm: {
    bracketPool<R, E, A>(
      op: Ef.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A>;
    createPool(): Ef.Effect<HasOrmConfig & Graceful, Error, Connection>;
    usePool(
      pool: Connection
    ): <R, E, A>(
      op: Ef.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ) => Ef.Effect<R, Error | E, A>;
    withRepository<Entity>(
      target: ObjectType<Entity> | EntitySchema<Entity> | string
    ): <A>(
      f: (r: Repository<Entity>) => IO<Promise<A>>
    ) => Ef.Effect<HasEntityManager, Error, A>;
    withTransaction<R, E, A>(
      op: Ef.Effect<HasEntityManager & R, E, A>
    ): Ef.Effect<HasOrmPool & R, Error | E, A>;
  };
}

export const ormFactory: (
  factory: typeof createConnection
) => Orm = factory => ({
  orm: {
    createPool() {
      return Ef.accessM(({ orm: { options } }: HasOrmConfig) =>
        Do(Ef.effectMonad)
          .bindL("c", () => Ef.tryCatch(() => factory(options), toError))
          .doL(({ c }) =>
            onExit(
              pipe(
                Ef.toTaskLike(Ef.tryCatch(() => c.close(), toError)),
                Ef.map(() => {})
              )
            )
          )
          .return(s => s.c)
      );
    },
    usePool(pool: Connection) {
      return <R, E, A>(
        op: Ef.Effect<HasOrmPool & HasEntityManager & R, E, A>
      ) =>
        Ef.provide<HasOrmPool & HasEntityManager>({
          orm: { connection: pool, manager: pool.manager }
        })(op);
    },
    bracketPool<R, E, A>(
      op: Ef.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A> {
      return Ef.accessM(({ orm: { options } }: HasOrmConfig) =>
        Ef.bracket(
          Ef.tryCatch(() => factory(options), toError),
          db =>
            Ef.provide<HasOrmPool & HasEntityManager>({
              orm: { connection: db, manager: db.manager }
            })(op),
          db => Ef.tryCatch(db.close, toError)
        )
      );
    },
    withRepository(target) {
      return f =>
        Ef.accessM(({ orm }: HasEntityManager) =>
          Ef.tryCatch(f(orm.manager.getRepository(target)), toError)
        );
    },
    withTransaction<R, E, A>(
      op: Ef.Effect<HasEntityManager & R, E, A>
    ): Ef.Effect<HasOrmPool & R, Error | E, A> {
      return Ef.accessM(({ orm: { connection } }: HasOrmPool) =>
        Ef.accessM((r: R) =>
          Ef.tryCatch(
            () =>
              connection.transaction(tx =>
                Ef.promise(
                  pipe(
                    op,
                    Ef.provide(r),
                    Ef.provide({
                      orm: {
                        manager: tx
                      }
                    } as HasEntityManager)
                  )
                )
              ),
            toError
          )
        )
      );
    }
  }
});

export const orm = ormFactory(createConnection);

export function bracketPool<R, E, A>(
  op: Ef.Effect<HasEntityManager & HasOrmPool & R, E, A>
): Ef.Effect<Orm & HasOrmConfig & R, Error | E, A> {
  return Ef.accessM(({ orm }: Orm) => orm.bracketPool(op));
}

export function withRepository<Entity>(
  target: ObjectType<Entity> | EntitySchema<Entity> | string
): <A>(
  f: (r: Repository<Entity>) => IO<Promise<A>>
) => Ef.Effect<Orm & HasEntityManager, Error, A> {
  return f => Ef.accessM(({ orm }: Orm) => orm.withRepository(target)(f));
}

export function withTransaction<R, E, A>(
  op: Ef.Effect<HasEntityManager & R, E, A>
): Ef.Effect<Orm & HasOrmPool & R, Error | E, A> {
  return Ef.accessM(({ orm }: Orm) => orm.withTransaction(op));
}

export function createPool(): Ef.Effect<
  HasOrmConfig & Graceful & Orm,
  Error,
  Connection
> {
  return Ef.accessM(({ orm }: Orm) => orm.createPool());
}

export function usePool(
  pool: Connection
): <R, E, A>(
  op: Ef.Effect<HasOrmPool & HasEntityManager & R, E, A>
) => Ef.Effect<R & Orm, Error | E, A> {
  return op => Ef.accessM(({ orm }: Orm) => orm.usePool(pool)(op));
}
