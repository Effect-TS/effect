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
  };
}

export const orm: Orm = {
  orm: {
    withPool<R, E, A>(
      op: Ef.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A> {
      return Ef.accessM(({ orm: { options } }: HasOrmConfig) =>
        Ef.bracket(
          Ef.tryCatch(() => createConnection(options), toError),
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
        Ef.accessM(({ orm: { manager } }: HasEntityManager) =>
          Ef.tryCatch(f(manager.getRepository(target)), toError)
        );
    }
  }
};

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
