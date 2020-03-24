import { effect as T, exit as EX } from "@matechs/effect";
import { toError } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import {
  Connection,
  ConnectionOptions,
  createConnection,
  EntityManager,
  EntitySchema,
  ObjectType,
  Repository,
} from "typeorm";
import { Task } from "fp-ts/lib/Task";

export const configEnv = "@matechs/orm/configURI";
export const poolEnv = "@matechs/orm/poolURI";
export const managerEnv = "@matechs/orm/managerURI";
export const factoryEnv = "@matechs/orm/factoryURI";

export interface DbConfig<A extends symbol | string> {
  [configEnv]: {
    [k in A]: {
      readConfig: T.Effect<T.NoEnv, T.NoErr, ConnectionOptions>;
    };
  };
}

export function dbConfig<A extends symbol | string>(
  env: A,
  readConfig: T.Effect<T.NoEnv, T.NoErr, ConnectionOptions>
) {
  return {
    [configEnv]: {
      [env]: {
        readConfig,
      },
    },
  } as DbConfig<A>;
}

/* istanbul ignore next */
export function mergeConfig<R>(a: R) {
  return <B extends symbol | string>(b: DbConfig<B>): R & DbConfig<B> => ({
    ...a,
    [configEnv]: {
      ...a[configEnv],
      ...b[configEnv],
    },
  });
}

/* istanbul ignore next */
export function dbConfigs<A extends symbol | string, B extends symbol | string>(
  a: DbConfig<A>,
  b: DbConfig<B>
): DbConfig<A> & DbConfig<B>;

/* istanbul ignore next */
export function dbConfigs<
  A extends symbol | string,
  B extends symbol | string,
  C extends symbol | string
>(
  a: DbConfig<A>,
  b: DbConfig<B>,
  c: DbConfig<C>
): DbConfig<A> & DbConfig<B> & DbConfig<C>;

/* istanbul ignore next */
export function dbConfigs<
  A extends symbol | string,
  B extends symbol | string,
  C extends symbol | string,
  D extends symbol | string
>(
  a: DbConfig<A>,
  b: DbConfig<B>,
  c: DbConfig<C>,
  d: DbConfig<D>
): DbConfig<A> & DbConfig<B> & DbConfig<C> & DbConfig<D>;

/* istanbul ignore next */
export function dbConfigs(...configs: DbConfig<any>[]) {
  return configs.reduce((a, b) => mergeConfig(a)(b));
}

export interface Pool<A extends symbol | string> {
  [poolEnv]: {
    [k in A]: {
      pool: Connection;
    };
  };
}

export interface Manager<A extends symbol | string> {
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
    createConnection: createConnection,
  },
};

export const mockFactory: (x: typeof createConnection) => DbFactory = (x) => ({
  [factoryEnv]: {
    createConnection: x,
  },
});

export const dbTxURI = "@matechs/orm/dbTxURI";

export interface DbTx<A extends symbol | string> {
  [dbTxURI]: {
    [k in A]: {
      tx: {};
    };
  };
}

export class DbT<Db extends symbol | string> {
  constructor(private readonly dbEnv: Db) {
    this.bracketPool = this.bracketPool.bind(this);
    this.withRepositoryTask = this.withRepositoryTask.bind(this);
    this.withRepository = this.withRepository.bind(this);
    this.withTransaction = this.withTransaction.bind(this);
    this.withORMTransaction = this.withORMTransaction.bind(this);
    this.withConnectionTask = this.withConnectionTask.bind(this);
    this.withConnection = this.withConnection.bind(this);
    this.withManagerTask = this.withManagerTask.bind(this);
    this.withManager = this.withManager.bind(this);
    this.withNewRegion = this.withNewRegion.bind(this);
  }

  requireTx = <R, E, A>(op: T.Effect<R, E, A>): T.Effect<R & DbTx<Db>, E, A> =>
    op;

  withNewRegion<R extends ORM<Db>, E, A>(
    op: T.Effect<R, E, A>
  ): T.Effect<R, E, A> {
    return this.withConnection((connection) =>
      T.provideR(
        (r: R): R => ({
          ...r,
          [managerEnv]: {
            ...r[managerEnv],
            [this.dbEnv]: {
              manager: connection.manager,
            },
          },
        })
      )(op)
    );
  }

  bracketPool<R, E, A>(
    op: T.Effect<ORM<Db> & R, E, A>
  ): T.Effect<DbConfig<Db> & DbFactory & R, TaskError | E, A> {
    return T.accessM(
      ({
        [configEnv]: {
          [this.dbEnv]: { readConfig },
        },
        [factoryEnv]: f,
      }: DbConfig<Db> & DbFactory) =>
        T.effect.chain(readConfig, (options) =>
          T.bracket(
            pipe(
              () => f.createConnection(options),
              T.fromPromiseMap(toError),
              T.mapError((x) => new TaskError(x, "bracketPoolOpen"))
            ),
            (db) =>
              pipe(
                () => db.close(),
                T.fromPromiseMap(toError),
                T.mapError((x) => new TaskError(x, "bracketPoolClose"))
              ),
            (db) =>
              pipe(
                op,
                T.provideR((r: DbConfig<Db> & R) => ({
                  ...r,
                  [poolEnv]: {
                    ...r[poolEnv],
                    [this.dbEnv]: {
                      pool: db,
                    },
                  },
                  [managerEnv]: {
                    ...r[managerEnv],
                    [this.dbEnv]: {
                      manager: db.manager,
                    },
                  },
                }))
              )
          )
        )
    );
  }

  withRepositoryTask<Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ): <A>(
    f: (r: Repository<Entity>) => Task<A>
  ) => T.Effect<ORM<Db>, TaskError, A> {
    return (f) =>
      this.withRepository(target)((r) =>
        pipe(
          r,
          f,
          T.fromPromiseMap(toError),
          T.mapError((x) => new TaskError(x, "withRepositoryTask"))
        )
      );
  }

  withRepository<Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ): <R, E, A>(
    f: (r: Repository<Entity>) => T.Effect<R, E, A>
  ) => T.Effect<ORM<Db> & R, E, A> {
    return (f) =>
      T.accessM(
        ({
          [managerEnv]: {
            [this.dbEnv]: { manager },
          },
        }: Manager<Db>) => f(manager.getRepository(target))
      );
  }

  withManagerTask<A>(
    f: (m: EntityManager) => Task<A>
  ): T.Effect<ORM<Db>, TaskError, A> {
    return this.withManager((manager) =>
      pipe(
        manager,
        f,
        T.fromPromiseMap(toError),
        T.mapError((x) => new TaskError(x, "withManagerTask"))
      )
    );
  }

  withManager<R, E, A>(
    f: (m: EntityManager) => T.Effect<R, E, A>
  ): T.Effect<ORM<Db> & R, E, A> {
    return T.accessM(
      ({
        [managerEnv]: {
          [this.dbEnv]: { manager },
        },
      }: Manager<Db>) => f(manager)
    );
  }

  withConnectionTask<A>(
    f: (m: Connection) => Task<A>
  ): T.Effect<ORM<Db>, TaskError, A> {
    return this.withConnection((pool) =>
      pipe(
        pool,
        f,
        T.fromPromiseMap(toError),
        T.mapError((x) => new TaskError(x, "withConnectionTask"))
      )
    );
  }

  withConnection<R, E, A>(
    f: (m: Connection) => T.Effect<R, E, A>
  ): T.Effect<ORM<Db> & R, E, A> {
    return T.accessM(({ [poolEnv]: { [this.dbEnv]: { pool } } }: Pool<Db>) =>
      f(pool)
    );
  }

  withORMTransaction<R, E, A>(
    op: T.Effect<Manager<Db> & DbTx<Db> & R, E, A>
  ): T.Effect<ORM<Db> & R, TaskError | E, A> {
    return T.accessM(({ [poolEnv]: { [this.dbEnv]: { pool } } }: Pool<Db>) =>
      T.bracketExit(
        pipe(
          pool.createQueryRunner(),
          (runner) =>
            pipe(
              T.fromPromiseMap(toError)(() => runner.manager.query("BEGIN")),
              T.map((_) => runner)
            ),
          T.mapError((x) => new TaskError(x, "withTransaction"))
        ),
        (runner, exit) =>
          EX.isDone(exit)
            ? pipe(
                T.fromPromiseMap(toError)(() => runner.manager.query("COMMIT")),
                T.chainError((err) =>
                  pipe(
                    T.fromPromiseMap(toError)(() =>
                      runner.manager.query("ROLLBACK")
                    ),
                    T.chain((_) => T.raiseError(err))
                  )
                ),
                T.mapError((x) => new TaskError(x, "withTransaction"))
              )
            : pipe(
                T.fromPromiseMap(toError)(() =>
                  runner.manager.query("ROLLBACK")
                ),
                T.mapError((x) => new TaskError(x, "withTransaction")),
                T.chain((_) => T.raised(exit))
              ),
        (runner) =>
          pipe(
            op,
            T.provideR((r: R) => ({
              ...r,
              [managerEnv]: {
                ...r[managerEnv],
                [this.dbEnv]: {
                  manager: runner.manager,
                },
              },
              [dbTxURI]: {
                ...r[dbTxURI],
                [this.dbEnv]: {
                  tx: {},
                },
              },
            }))
          )
      )
    );
  }

  withTransaction<R, E, A>(
    op: T.Effect<Manager<Db> & DbTx<Db> & R, E, A>
  ): T.Effect<ORM<Db> & R, TaskError | E, A> {
    return T.accessM(({ [poolEnv]: { [this.dbEnv]: { pool } } }: Pool<Db>) =>
      T.accessM((r: R) =>
        pipe(
          () =>
            pool.transaction((tx) =>
              T.runToPromise(
                T.provideAll({
                  ...r,
                  [managerEnv]: {
                    ...r[managerEnv],
                    [this.dbEnv]: {
                      manager: tx,
                    },
                  },
                  [dbTxURI]: {
                    ...r[dbTxURI],
                    [this.dbEnv]: {
                      tx: {},
                    },
                  },
                })(
                  pipe(
                    op,
                    T.mapError((x) => ({ _tag: "inner" as const, error: x }))
                  )
                )
              )
            ),
          T.fromPromiseMap((x) =>
            typeof x === "object" && x !== null && x["_tag"] === "inner"
              ? ((x["error"] as any) as E)
              : new TaskError(toError(x), "withTransaction")
          )
        )
      )
    );
  }
}

export type ORM<A extends symbol | string> = Pool<A> & Manager<A>;

export function dbT<Db extends symbol | string>(dbEnv: Db): DbT<Db> {
  return new DbT(dbEnv);
}

export class TaskError implements Error {
  public _tag = "TaskError" as const;

  public message: string;

  public name = this._tag;

  constructor(
    public error: Error,
    public meta:
      | "withTransaction"
      | "withConnectionTask"
      | "withRepositoryTask"
      | "withManagerTask"
      | "bracketPoolOpen"
      | "bracketPoolClose"
  ) {
    this.message = error.message;
  }
}

export function isTaskError(u: unknown): u is TaskError {
  return u instanceof TaskError;
}
