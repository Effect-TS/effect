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
    withPool<R, E, A>(
      op: Ef.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A>;
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

export const orm: (factory: typeof createConnection) => Orm = factory => ({
  orm: {
    withPool<R, E, A>(
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

export function withPool<R, E, A>(
  op: Ef.Effect<HasEntityManager & HasOrmPool & R, E, A>
): Ef.Effect<Orm & HasOrmConfig & R, Error | E, A> {
  return Ef.accessM(({ orm }: Orm) => orm.withPool(op));
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
