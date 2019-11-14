import * as TO from "typeorm";
import * as Ef from "@matechs/effect";
import { toError } from "fp-ts/lib/Either";
import { EntityManager } from "typeorm";

export interface HasOrmConfig {
  orm: {
    options: TO.ConnectionOptions;
  };
}

export interface HasOrmPool {
  orm: {
    connection: TO.Connection;
    manager: EntityManager;
  };
}

export interface Orm {
  orm: {
    withPool<R, E, A>(
      op: Ef.Effect<HasOrmPool & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A>;
  };
}

export const orm: Orm = {
  orm: {
    withPool<R, E, A>(
      op: Ef.Effect<HasOrmPool & R, E, A>
    ): Ef.Effect<HasOrmConfig & R, Error | E, A> {
      return Ef.accessM(({ orm: { options } }: HasOrmConfig) =>
        Ef.bracket(
          Ef.tryCatch(() => TO.createConnection(options), toError),
          db =>
            Ef.provide<HasOrmPool>({
              orm: { connection: db, manager: db.manager }
            })(op),
          db => Ef.tryCatch(db.close, toError)
        )
      );
    }
  }
};

export function withPool<R, E, A>(
  op: Ef.Effect<HasOrmPool & R, E, A>
): Ef.Effect<Orm & HasOrmConfig & R, Error | E, A> {
  return Ef.accessM(({ orm }: Orm) => orm.withPool(op));
}
