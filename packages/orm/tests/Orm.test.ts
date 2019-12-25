import { effect as E } from "@matechs/effect";
import { raise } from "@matechs/effect/lib/original/exit";
import { Env } from "@matechs/effect/lib/utils/types";
import * as assert from "assert";
import {
  Connection,
  createConnection,
  Entity,
  EntityManager,
  EntitySchema,
  FindOneOptions,
  ObjectID,
  PrimaryColumn,
  Repository
} from "typeorm";
import * as DB from "../src";

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string;
}

const testDbEnv: unique symbol = Symbol();

const testDb = DB.dbT(testDbEnv);

describe("Orm", () => {
  it("should use db", async () => {
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
              _: { new (): Entity } | Function | EntitySchema<Entity> | string
            ): Repository<Entity> {
              return {
                findOne(
                  _?: string | number | Date | ObjectID,
                  _2?: FindOneOptions<Entity>
                ): Promise<Entity | undefined> {
                  return Promise.reject("not implemented");
                }
              } as Repository<Entity>;
            }
          } as EntityManager);
        }
      } as Connection);

    const program = testDb.bracketPool(
      testDb.withTransaction(
        testDb.withRepository(DemoEntity)(r => () =>
          r.findOne({ where: { id: "test" } })
        )
      )
    );

    const env: Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, E.pure({} as any))
    };

    const result = await E.runToPromiseExit(E.provideAll(env)(program));

    assert.deepEqual(result, raise(new Error("not implemented")));
  });
});
