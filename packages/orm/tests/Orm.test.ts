import * as E from "@matechs/effect";
import {
  ormFactory,
  ormConfig,
  bracketPool,
  withRepository,
  withTransaction,
  createPool,
  usePool
} from "../src";
import {
  ConnectionOptions,
  EntityManager,
  EntitySchema,
  FindOneOptions,
  ObjectID,
  Repository,
  createConnection,
  Connection,
  Entity,
  PrimaryColumn
} from "typeorm";
import { pipe } from "fp-ts/lib/pipeable";
import * as assert from "assert";
import { left } from "fp-ts/lib/Either";
import { Do } from "fp-ts-contrib/lib/Do";
import { graceful, trigger } from "@matechs/graceful/lib";

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string;
}

describe("Orm", () => {
  it("should use bracketPool (single db)", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        manager: {} as EntityManager,
        close(): Promise<void> {
          return Promise.resolve();
        },
        transaction<T>(
          runInTransaction: (entityManager: EntityManager) => Promise<T>
        ): Promise<T> {
          return runInTransaction({
            getRepository<Entity>(
              target:
                | { new (): Entity }
                | Function
                | EntitySchema<Entity>
                | string
            ): Repository<Entity> {
              return {
                findOne(
                  id?: string | number | Date | ObjectID,
                  options?: FindOneOptions<Entity>
                ): Promise<Entity | undefined> {
                  return Promise.reject("not implemented");
                }
              } as Repository<Entity>;
            }
          } as EntityManager);
        }
      } as Connection);

    const module = pipe(
      E.noEnv,
      E.mergeEnv(ormFactory(mockFactory)),
      E.mergeEnv(ormConfig({} as ConnectionOptions))
    );

    const program = bracketPool(
      withTransaction(
        withRepository(DemoEntity)(r => () =>
          r.findOne({ where: { id: "test" } })
        )
      )
    );

    const result = await E.run(E.provide(module)(program))();

    assert.deepEqual(result, left(new Error("not implemented")));
  });

  it("should use createPool/usePool (maybe multiple dbs)", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        manager: {} as EntityManager,
        close(): Promise<void> {
          return Promise.resolve();
        },
        transaction<T>(
          runInTransaction: (entityManager: EntityManager) => Promise<T>
        ): Promise<T> {
          return runInTransaction({
            getRepository<Entity>(
              target:
                | { new (): Entity }
                | Function
                | EntitySchema<Entity>
                | string
            ): Repository<Entity> {
              return {
                findOne(
                  id?: string | number | Date | ObjectID,
                  options?: FindOneOptions<Entity>
                ): Promise<Entity | undefined> {
                  return Promise.reject("not implemented");
                }
              } as Repository<Entity>;
            }
          } as EntityManager);
        }
      } as Connection);

    const module = pipe(
      E.noEnv,
      E.mergeEnv(ormFactory(mockFactory)),
      E.mergeEnv(graceful())
    );

    const program = Do(E.effectMonad)
      .bind("db1", E.provide(ormConfig({} as ConnectionOptions))(createPool()))
      .bind("db2", E.provide(ormConfig({} as ConnectionOptions))(createPool()))
      .bindL("res", ({ db1, db2 }) =>
        usePool(db1)(
          withTransaction(
            usePool(db2)(
              withTransaction(
                withRepository(DemoEntity)(r => () =>
                  r.findOne({ where: { id: "test" } })
                )
              )
            )
          )
        )
      )
      .return(s => s.res);

    const result = await E.run(E.provide(module)(program))();

    await E.promise(E.provide(module)(trigger()));

    assert.deepEqual(result, left(new Error("not implemented")));
  });
});
