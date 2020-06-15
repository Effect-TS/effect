import {
  Connection,
  ConnectionOptions,
  createConnection,
  EntityManager,
  EntitySchema,
  ObjectType,
  Repository
} from "typeorm"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as F from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as L from "@matechs/core/Layer"
import * as M from "@matechs/core/Managed"

export const configEnv = "@matechs/orm/configURI"
export const poolEnv = "@matechs/orm/poolURI"
export const managerEnv = "@matechs/orm/managerURI"
export const factoryEnv = "@matechs/orm/factoryURI"

export interface DbConfig<A extends symbol | string> {
  [configEnv]: {
    [k in A]: {
      readConfig: T.Async<ConnectionOptions>
    }
  }
}

export const Config = <Db extends symbol | string>(URI: Db) => (
  readConfig: T.Async<ConnectionOptions>
) =>
  L.fromEffect(
    T.access(
      (r: {}): DbConfig<Db> => ({
        ...r,
        [configEnv]: {
          ...r[configEnv],
          [URI]: {
            readConfig
          }
        }
      })
    )
  )

export interface Pool<A extends symbol | string> {
  [poolEnv]: {
    [k in A]: {
      pool: Connection
    }
  }
}

export interface Manager<A extends symbol | string> {
  [managerEnv]: {
    [k in A]: {
      manager: EntityManager
    }
  }
}

export interface DbFactory {
  [factoryEnv]: {
    createConnection: typeof createConnection
  }
}

export const liveFactory = L.fromValue<DbFactory>({
  [factoryEnv]: {
    createConnection
  }
})

export const mockFactory = (x: typeof createConnection) =>
  L.fromValue<DbFactory>({
    [factoryEnv]: {
      createConnection: x
    }
  })

export const dbTxURI = "@matechs/orm/dbTxURI"

export interface DbTx<A extends symbol | string> {
  [dbTxURI]: {
    [k in A]: {
      tx: {}
    }
  }
}

export interface DbT<Db extends symbol | string> {
  readonly Pool: L.Layer<unknown, DbConfig<Db> & DbFactory, TaskError, ORM<Db>>

  readonly requireTx: <S, R, E, A>(
    op: T.Effect<S, R, E, A>
  ) => T.Effect<S, R & DbTx<Db>, E, A>
  readonly withNewRegion: <S, R extends ORM<Db>, E, A>(
    op: T.Effect<S, R, E, A>
  ) => T.Effect<S, R, E, A>
  readonly withRepositoryTask: <Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ) => <A>(
    f: (r: Repository<Entity>) => F.Lazy<Promise<A>>
  ) => T.AsyncRE<ORM<Db>, TaskError, A>
  readonly withRepository: <Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ) => <S, R, E, A>(
    f: (r: Repository<Entity>) => T.Effect<S, R, E, A>
  ) => T.Effect<S, ORM<Db> & R, E, A>
  readonly withManagerTask: <A>(
    f: (m: EntityManager) => F.Lazy<Promise<A>>
  ) => T.AsyncRE<ORM<Db>, TaskError, A>
  readonly withManager: <S, R, E, A>(
    f: (m: EntityManager) => T.Effect<S, R, E, A>
  ) => T.Effect<S, ORM<Db> & R, E, A>
  readonly withConnectionTask: <A>(
    f: (m: Connection) => F.Lazy<Promise<A>>
  ) => T.AsyncRE<ORM<Db>, TaskError, A>
  readonly withConnection: <S, R, E, A>(
    f: (m: Connection) => T.Effect<S, R, E, A>
  ) => T.Effect<S, ORM<Db> & R, E, A>
  readonly withTransaction: <S, R, E, A>(
    op: T.Effect<S, Manager<Db> & DbTx<Db> & R, E, A>
  ) => T.AsyncRE<ORM<Db> & R, TaskError | E, A>
}

export class DbTImpl<Db extends symbol | string> implements DbT<Db> {
  constructor(private readonly dbEnv: Db) {
    this.withRepositoryTask = this.withRepositoryTask.bind(this)
    this.withRepository = this.withRepository.bind(this)
    this.withTransaction = this.withTransaction.bind(this)
    this.withConnectionTask = this.withConnectionTask.bind(this)
    this.withConnection = this.withConnection.bind(this)
    this.withManagerTask = this.withManagerTask.bind(this)
    this.withManager = this.withManager.bind(this)
    this.withNewRegion = this.withNewRegion.bind(this)
    this.requireTx = this.requireTx.bind(this)
  }

  accessConfig = T.accessM(
    ({
      [configEnv]: {
        [this.dbEnv]: { readConfig }
      }
    }: DbConfig<Db>) => readConfig
  )

  managedConnection = M.bracket(
    pipe(
      this.accessConfig,
      T.chain((options) =>
        T.accessM(({ [factoryEnv]: f }: DbFactory) =>
          pipe(
            T.fromPromiseMap(E.toError)(() => f.createConnection(options)),
            T.mapError((x) => new TaskError(x, "bracketPoolOpen"))
          )
        )
      )
    ),
    (db) =>
      pipe(
        T.fromPromiseMap(E.toError)(() => db.close()),
        T.mapError((x) => new TaskError(x, "bracketPoolClose"))
      )
  )

  Pool = L.fromManaged(
    M.chain_(this.managedConnection, (db) =>
      M.access(
        (r: {}): ORM<Db> => ({
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
        })
      )
    )
  )

  // tslint:disable-next-line: prefer-function-over-method
  requireTx<S, R, E, A>(op: T.Effect<S, R, E, A>): T.Effect<S, R & DbTx<Db>, E, A> {
    return op
  }

  withNewRegion<S, R extends ORM<Db>, E, A>(
    op: T.Effect<S, R, E, A>
  ): T.Effect<S, R, E, A> {
    return this.withConnection((connection) =>
      T.accessM((r: R) =>
        T.provide({
          ...r,
          [managerEnv]: {
            ...r[managerEnv],
            [this.dbEnv]: {
              manager: connection.manager
            }
          }
        })(op)
      )
    )
  }

  withRepositoryTask<Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ): <A>(
    f: (r: Repository<Entity>) => F.Lazy<Promise<A>>
  ) => T.AsyncRE<ORM<Db>, TaskError, A> {
    return (f) =>
      this.withRepository(target)((r) =>
        pipe(
          r,
          f,
          T.fromPromiseMap(E.toError),
          T.mapError((x) => new TaskError(x, "withRepositoryTask"))
        )
      )
  }

  withRepository<Entity>(
    target: ObjectType<Entity> | EntitySchema<Entity> | string
  ): <S, R, E, A>(
    f: (r: Repository<Entity>) => T.Effect<S, R, E, A>
  ) => T.Effect<S, ORM<Db> & R, E, A> {
    return (f) =>
      T.accessM(({ [managerEnv]: { [this.dbEnv]: { manager } } }: Manager<Db>) =>
        f(manager.getRepository(target))
      )
  }

  withManagerTask<A>(
    f: (m: EntityManager) => F.Lazy<Promise<A>>
  ): T.AsyncRE<ORM<Db>, TaskError, A> {
    return this.withManager((manager) =>
      pipe(
        manager,
        f,
        T.fromPromiseMap(E.toError),
        T.mapError((x) => new TaskError(x, "withManagerTask"))
      )
    )
  }

  withManager<S, R, E, A>(
    f: (m: EntityManager) => T.Effect<S, R, E, A>
  ): T.Effect<S, ORM<Db> & R, E, A> {
    return T.accessM(({ [managerEnv]: { [this.dbEnv]: { manager } } }: Manager<Db>) =>
      f(manager)
    )
  }

  withConnectionTask<A>(
    f: (m: Connection) => F.Lazy<Promise<A>>
  ): T.AsyncRE<ORM<Db>, TaskError, A> {
    return this.withConnection((pool) =>
      pipe(
        pool,
        f,
        T.fromPromiseMap(E.toError),
        T.mapError((x) => new TaskError(x, "withConnectionTask"))
      )
    )
  }

  withConnection<S, R, E, A>(
    f: (m: Connection) => T.Effect<S, R, E, A>
  ): T.Effect<S, ORM<Db> & R, E, A> {
    return T.accessM(({ [poolEnv]: { [this.dbEnv]: { pool } } }: Pool<Db>) => f(pool))
  }

  withTransaction<S, R, E, A>(
    op: T.Effect<S, Manager<Db> & DbTx<Db> & R, E, A>
  ): T.AsyncRE<ORM<Db> & R, TaskError | E, A> {
    return T.accessM(({ [poolEnv]: { [this.dbEnv]: { pool } } }: Pool<Db>) =>
      T.accessM((r: R) =>
        pipe(
          () =>
            pool.transaction((tx) =>
              T.runToPromise(
                T.provide<R & Manager<Db> & DbTx<Db>>({
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
                    T.mapError((x) => ({ _tag: "inner" as const, error: x }))
                  )
                )
              )
            ),
          T.fromPromiseMap((x) =>
            typeof x === "object" &&
            x !== null &&
            x["_tag"] === "Raise" &&
            x["error"]["_tag"] === "inner"
              ? ((x["error"]["error"] as any) as E)
              : new TaskError(E.toError(x), "withTransaction")
          )
        )
      )
    )
  }
}

export type ORM<A extends symbol | string> = Pool<A> & Manager<A>

export function dbT<Db extends symbol | string>(dbEnv: Db): DbT<Db> {
  return new DbTImpl(dbEnv)
}

export class TaskError extends Error {
  public _tag = "TaskError" as const

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
    super(error.message)
    this.name = this._tag
    this.stack = error.stack
    Object.setPrototypeOf(this, TaskError.prototype)
  }
}

export function isTaskError(u: unknown): u is TaskError {
  return u instanceof TaskError
}
