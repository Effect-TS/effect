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
  Repository
} from "typeorm";
import { Task } from "fp-ts/lib/Task";

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
export function dbConfigs<
  A extends symbol,
  B extends symbol,
  C extends symbol,
  D extends symbol
>(
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

export const dbTxURI: unique symbol = Symbol();

export interface DbTx<A extends symbol> {
  [dbTxURI]: {
    [k in A]: {
      tx: {};
    };
  };
}

export class DbT<Db extends symbol> {
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
  }

  bracketPool<R, E, A>(
    op: T.Effect<ORM<Db> & R, E, A>
  ): T.Effect<DbConfig<Db> & DbFactory & R, TaskError | E, A> {
    return T.accessM(
      ({
        [configEnv]: {
          [this.dbEnv]: { readConfig }
        },
        [factoryEnv]: f
      }: DbConfig<Db> & DbFactory) =>
        T.effect.chain(readConfig, options =>
          T.bracket(
            pipe(
              () => f.createConnection(options),
              T.fromPromiseMap(toError),
              T.mapError(x => new TaskError(x, "bracketPoolOpen"))
            ),
            db =>
              pipe(
                () => db.close(),
                T.fromPromiseMap(toError),
                T.mapError(x => new TaskError(x, "bracketPoolClose"))
              ),
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

  withRepositoryTask<Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ): <A>(
    f: (r: Repository<Entity>) => Task<A>
  ) => T.Effect<ORM<Db>, TaskError, A> {
    return f =>
      this.withRepository(target)(r =>
        pipe(
          r,
          f,
          T.fromPromiseMap(toError),
          T.mapError(x => new TaskError(x, "withRepositoryTask"))
        )
      );
  }

  withRepository<Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ): <R, E, A>(
    f: (r: Repository<Entity>) => T.Effect<R, E, A>
  ) => T.Effect<ORM<Db> & R, E, A> {
    return f =>
      T.accessM(
        ({
          [managerEnv]: {
            [this.dbEnv]: { manager }
          }
        }: Manager<Db>) => f(manager.getRepository(target))
      );
  }

  withManagerTask<A>(
    f: (m: EntityManager) => Task<A>
  ): T.Effect<ORM<Db>, TaskError, A> {
    return this.withManager(manager =>
      pipe(
        manager,
        f,
        T.fromPromiseMap(toError),
        T.mapError(x => new TaskError(x, "withManagerTask"))
      )
    );
  }

  withManager<R, E, A>(
    f: (m: EntityManager) => T.Effect<R, E, A>
  ): T.Effect<ORM<Db> & R, E, A> {
    return T.accessM(
      ({
        [managerEnv]: {
          [this.dbEnv]: { manager }
        }
      }: Manager<Db>) => f(manager)
    );
  }

  withConnectionTask<A>(
    f: (m: Connection) => Task<A>
  ): T.Effect<ORM<Db>, TaskError, A> {
    return this.withConnection(pool =>
      pipe(
        pool,
        f,
        T.fromPromiseMap(toError),
        T.mapError(x => new TaskError(x, "withConnectionTask"))
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
          runner =>
            pipe(
              T.fromPromiseMap(toError)(() => runner.query("BEGIN")),
              T.map(_ => runner)
            ),
          T.mapError(x => new TaskError(x, "withTransaction"))
        ),
        (runner, exit) =>
          EX.isDone(exit)
            ? pipe(
                T.fromPromiseMap(toError)(() => runner.query("COMMIT")),
                T.chainError(err =>
                  pipe(
                    T.fromPromiseMap(toError)(() => runner.query("ROLLBACK")),
                    T.chain(_ => T.raiseError(err))
                  )
                ),
                T.mapError(x => new TaskError(x, "withTransaction"))
              )
            : pipe(
                T.fromPromiseMap(toError)(() => runner.query("ROLLBACK")),
                T.mapError(x => new TaskError(x, "withTransaction")),
                T.chain(_ => T.raised(exit))
              ),
        runner =>
          pipe(
            op,
            T.provideR((r: R) => ({
              ...r,
              [managerEnv]: {
                ...r[managerEnv],
                [this.dbEnv]: {
                  manager: runner.manager
                }
              },
              [dbTxURI]: {
                ...r[dbTxURI],
                [this.dbEnv]: {
                  tx: {}
                }
              }
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
            pool.transaction(tx =>
              T.runToPromise(
                T.provideAll({
                  ...r,
                  [managerEnv]: {
                    ...r[managerEnv],
                    [this.dbEnv]: {
                      manager: tx
                    }
                  },
                  [dbTxURI]: {
                    ...r[dbTxURI],
                    [this.dbEnv]: {
                      tx: {}
                    }
                  }
                })(
                  pipe(
                    op,
                    T.mapError(x => ({ _tag: "inner" as const, error: x }))
                  )
                )
              )
            ),
          T.fromPromiseMap(x =>
            typeof x === "object" && x !== null && x["_tag"] === "inner"
              ? ((x["error"] as any) as E)
              : new TaskError(toError(x), "withTransaction")
          )
        )
      )
    );
  }
}

export type ORM<A extends symbol> = Pool<A> & Manager<A>;

export function dbT<Db extends symbol>(dbEnv: Db): DbT<Db> {
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
