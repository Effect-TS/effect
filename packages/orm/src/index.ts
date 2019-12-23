import { effect as T } from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as Ei from "fp-ts/lib/Either";
import { Do } from "fp-ts-contrib/lib/Do";
import { toError } from "fp-ts/lib/Either";
import { IO } from "fp-ts/lib/IO";
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
import { ReadStream } from "fs";
import { isNonEmpty } from "fp-ts/lib/Array";

export const configEnv: unique symbol = Symbol();
export const entityManagerEnv: unique symbol = Symbol();
export const poolEnv: unique symbol = Symbol();
export const ormEnv: unique symbol = Symbol();

export interface HasOrmConfig {
  [configEnv]: {
    options: ConnectionOptions;
  };
}

export function ormConfig(options: ConnectionOptions): HasOrmConfig {
  return {
    [configEnv]: {
      options
    }
  };
}

export interface HasEntityManager {
  [entityManagerEnv]: {
    manager: EntityManager;
  };
}

export interface HasOrmPool {
  [poolEnv]: {
    connection: Connection;
  };
}

export interface Orm {
  [ormEnv]: {
    bracketPool<R, E, A>(
      op: T.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ): T.Effect<HasOrmConfig & R, Error | E, A>;
    createPool(): T.Effect<HasOrmConfig, Error, Connection>;
    usePool(
      pool: Connection
    ): <R, E, A>(
      op: T.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ) => T.Effect<R, Error | E, A>;
    withRepository<Entity>(
      target: ObjectType<Entity> | EntitySchema<Entity> | string
    ): <A>(
      f: (r: Repository<Entity>) => IO<Promise<A>>
    ) => T.Effect<HasEntityManager, Error, A>;
    withTransaction<R, E, A>(
      op: T.Effect<HasEntityManager & R, E, A>
    ): T.Effect<HasOrmPool & R, Error | E, A>;
  };
}

export const ormFactory: (
  factory: typeof createConnection
) => Orm = factory => ({
  [ormEnv]: {
    createPool() {
      return T.accessM(({ [configEnv]: { options } }: HasOrmConfig) =>
        pipe(() => factory(options), T.fromPromiseMap(toError))
      );
    },
    usePool(pool: Connection) {
      return <R, E, A>(op: T.Effect<HasOrmPool & HasEntityManager & R, E, A>) =>
        T.provideR((r: R) => ({
          ...r,
          [poolEnv]: { connection: pool },
          [entityManagerEnv]: { manager: pool.manager }
        }))(op);
    },
    bracketPool<R, E, A>(
      op: T.Effect<HasOrmPool & HasEntityManager & R, E, A>
    ): T.Effect<HasOrmConfig & R, Error | E, A> {
      return T.accessM(({ [configEnv]: { options } }: HasOrmConfig) =>
        T.bracket(
          pipe(() => factory(options), T.fromPromiseMap(toError)),
          db => pipe(() => db.close(), T.fromPromiseMap(toError)),
          db =>
            T.provideR((r: HasOrmConfig & R) => ({
              ...r,
              [poolEnv]: { connection: db },
              [entityManagerEnv]: { manager: db.manager }
            }))(op)
        )
      );
    },
    withRepository(target) {
      return f =>
        T.accessM(({ [entityManagerEnv]: orm }: HasEntityManager) =>
          pipe(f(orm.manager.getRepository(target)), T.fromPromiseMap(toError))
        );
    },
    withTransaction<R, E, A>(
      op: T.Effect<HasEntityManager & R, E, A>
    ): T.Effect<HasOrmPool & R, Error | E, A> {
      return T.accessM(({ [poolEnv]: { connection } }: HasOrmPool) =>
        T.accessM((r: R) =>
          pipe(
            () =>
              connection.transaction(tx =>
                T.runToPromise(
                  T.provideAll({
                    ...r,
                    [entityManagerEnv]: { manager: tx }
                  })(op)
                )
              ),
            T.fromPromiseMap(toError)
          )
        )
      );
    }
  }
});

export const orm = ormFactory(createConnection);

export function bracketPool<R, E, A>(
  op: T.Effect<HasEntityManager & HasOrmPool & R, E, A>
): T.Effect<Orm & HasOrmConfig & R, Error | E, A> {
  return T.accessM(({ [ormEnv]: orm }: Orm) => orm.bracketPool(op));
}

export function withRepository<Entity>(
  target: ObjectType<Entity> | EntitySchema<Entity> | string
): <A>(
  f: (r: Repository<Entity>) => IO<Promise<A>>
) => T.Effect<Orm & HasEntityManager, Error, A> {
  return f =>
    T.accessM(({ [ormEnv]: orm }: Orm) => orm.withRepository(target)(f));
}

export function withTransaction<R, E, A>(
  op: T.Effect<HasEntityManager & R, E, A>
): T.Effect<Orm & HasOrmPool & R, Error | E, A> {
  return T.accessM(({ [ormEnv]: orm }: Orm) => orm.withTransaction(op));
}

export function createPool(): T.Effect<HasOrmConfig & Orm, Error, Connection> {
  return T.accessM(({ [ormEnv]: orm }: Orm) => orm.createPool());
}

export function usePool(
  pool: Connection
): <R, E, A>(
  op: T.Effect<HasOrmPool & HasEntityManager & R, E, A>
) => T.Effect<R & Orm, Error | E, A> {
  return op => T.accessM(({ [ormEnv]: orm }: Orm) => orm.usePool(pool)(op));
}

/* istanbul ignore next */
export function queryStreamB<RES>(
  batch: number,
  every = 0
): (
  f: (m: EntityManager) => Promise<ReadStream>
) => T.Effect<HasEntityManager, Error, S.Stream<T.NoEnv, Error, Array<RES>>> {
  return f =>
    T.accessM(({ [entityManagerEnv]: { manager } }: HasEntityManager) =>
      Do(T.effect)
        .bindL("stream", () =>
          pipe(() => f(manager), T.fromPromiseMap(Ei.toError))
        )
        .bindL("res", ({ stream }) =>
          T.pure(
            S.filter(
              S.fromObjectReadStreamB<RES>(stream, batch, every),
              isNonEmpty
            )
          )
        )
        .return(({ res }) => res)
    );
}

/* istanbul ignore next */
export function queryStream<RES>(
  f: (m: EntityManager) => Promise<ReadStream>
): T.Effect<HasEntityManager, Error, S.Stream<T.NoEnv, Error, RES>> {
  return T.accessM(({ [entityManagerEnv]: { manager } }: HasEntityManager) =>
    Do(T.effect)
      .bindL("stream", () =>
        pipe(() => f(manager), T.fromPromiseMap(Ei.toError))
      )
      .bindL("res", ({ stream }) => T.pure(S.fromObjectReadStream<RES>(stream)))
      .return(({ res }) => res)
  );
}
