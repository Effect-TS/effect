import * as E from "@matechs/effect";
import {
  ormFactory,
  ormConfig,
  withPool,
  withRepository,
  withTransaction
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

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string;
}

describe("Orm", () => {
  it("should connect to database", async () => {
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

    const program = withPool(
      withTransaction(
        withRepository(DemoEntity)(r => () =>
          r.findOne({ where: { id: "test" } })
        )
      )
    );

    const result = await E.run(E.provide(module)(program))();

    assert.deepEqual(result, left(new Error("not implemented")));
  });
});
