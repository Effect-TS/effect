import { effect as T } from "@matechs/effect";
import { toError } from "fp-ts/lib/Either";
import { Lazy } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import {
  Connection,
  ConnectionOptions,
  createConnection,
  EntityManager,
  EntitySchema,
  ObjectType,
  Repository
} from "typeorm";

export const configEnv: unique symbol = Symbol();
export const poolEnv: unique symbol = Symbol();
export const managerEnv: unique symbol = Symbol();
export const factoryEnv: unique symbol = Symbol();

export interface DbConfig<A extends symbol> {
  [configEnv]: {
    [k in A]: {
      readConfig: T.Effect<T.NoEnv, T.NoErr, ConnectionOptions>;
    };
  };
}

export function dbConfig<A extends symbol>(
  env: A,
  readConfig: T.Effect<T.NoEnv, T.NoErr, ConnectionOptions>
) {
  return {
    [configEnv]: {
      [env]: {
        readConfig
      }
    }
  } as DbConfig<A>;
}

/* istnbul ignore next */
export function mergeConfig<R>(a: R) {
  return <B extends symbol>(b: DbConfig<B>): R & DbConfig<B> => ({
    ...a,
    [configEnv]: {
      ...a[configEnv],
      ...b[configEnv]
    }
  });
}

/* istnbul ignore next */
export function dbConfigs<A extends symbol, B extends symbol>(
  a: DbConfig<A>,
  b: DbConfig<B>
): DbConfig<A> & DbConfig<B>;

/* istnbul ignore next */
export function dbConfigs<A extends symbol, B extends symbol, C extends symbol>(
  a: DbConfig<A>,
  b: DbConfig<B>,
  c: DbConfig<C>
): DbConfig<A> & DbConfig<B> & DbConfig<C>;

/* istnbul ignore next */
export function dbConfigs<A extends symbol, B extends symbol, C extends symbol, D extends symbol>(
  a: DbConfig<A>,
  b: DbConfig<B>,
  c: DbConfig<C>,
  d: DbConfig<D>
): DbConfig<A> & DbConfig<B> & DbConfig<C> & DbConfig<D>;

/* istnbul ignore next */
export function dbConfigs(...configs: DbConfig<any>[]) {
  return configs.reduce((a, b) => mergeConfig(a)(b));
}

export interface Pool<A extends symbol> {
  [poolEnv]: {
    [k in A]: {
      pool: Connection;
    };
  };
}

export interface Manager<A extends symbol> {
  [managerEnv]: {
    [k in A]: {
      manager: EntityManager;
    };
  };
}

export interface DbFactory {
  [factoryEnv]: {
    createConnection: typeof createConnection;
  };
}

export const liveFactory: DbFactory = {
  [factoryEnv]: {
    createConnection: createConnection
  }
};

export const mockFactory: (x: typeof createConnection) => DbFactory = x => ({
  [factoryEnv]: {
    createConnection: x
  }
});

export class DbT<Db extends symbol> {
  constructor(private readonly dbEnv: Db) {}

  bracketPool<R, E, A>(
    op: T.Effect<ORM<Db> & R, E, A>
  ): T.Effect<DbConfig<Db> & DbFactory & R, Error | E, A> {
    return T.accessM(
      ({
        [configEnv]: {
          [this.dbEnv]: { readConfig }
        },
        [factoryEnv]: f
      }: DbConfig<Db> & DbFactory) =>
        T.effect.chain(readConfig, options =>
          T.bracket(
            pipe(() => f.createConnection(options), T.fromPromiseMap(toError)),
            db => pipe(() => db.close(), T.fromPromiseMap(toError)),
            db =>
              pipe(
                op,
                T.provideR((r: DbConfig<Db> & R) => ({
                  ...r,
                  [poolEnv]: {
                    ...r[poolEnv],
                    [this.dbEnv]: {
                      pool: db
                    }
                  },
                  [managerEnv]: {
                    ...r[managerEnv],
                    [this.dbEnv]: {
                      manager: db.manager
                    }
                  }
                }))
              )
          )
        )
    );
  }

  withRepository<Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ): <A>(
    f: (r: Repository<Entity>) => Lazy<Promise<A>>
  ) => T.Effect<ORM<Db>, Error, A> {
    return f =>
      T.accessM(
        ({
          [managerEnv]: {
            [this.dbEnv]: { manager }
          }
        }: Manager<Db>) =>
          pipe(f(manager.getRepository(target)), T.fromPromiseMap(toError))
      );
  }

  withTransaction<R, E, A>(
    op: T.Effect<Manager<Db> & R, E, A>
  ): T.Effect<ORM<Db> & R, Error | E, A> {
    return T.accessM(({ [poolEnv]: { [this.dbEnv]: { pool } } }: Pool<Db>) =>
      T.accessM((r: R) =>
        pipe(
          () =>
            pool.transaction(tx =>
              T.runToPromise(
                T.provideAll({
                  ...r,
                  [managerEnv]: {
                    ...r[managerEnv],
                    [this.dbEnv]: {
                      manager: tx
                    }
                  }
                })(op)
              )
            ),
          T.fromPromiseMap(toError)
        )
      )
    );
  }
}

export type ORM<A extends symbol> = Pool<A> & Manager<A>;

export function dbT<Db extends symbol>(dbEnv: Db): DbT<Db> {
  return new DbT(dbEnv);
}
