import { effect as T } from "@matechs/effect";
import * as EX from "@matechs/express";
import { gql } from "apollo-server";
import { array as A } from "fp-ts";
import { pipe } from "fp-ts/lib/pipeable";
import * as Apollo from "../src";

// Experimental
/* istanbul ignore file */

const typeDefs = gql`
  type Book {
    title: String
    author: String
  }
  type Query {
    books(n: Int!): [Book]
    hi: String
  }
`;

const books = Apollo.resolver({
  ["Query/books"]: ({ args }) =>
    pipe(
      T.access((_: { foo: string }) => _.foo),
      T.map(foo =>
        pipe(
          A.range(0, args["n"] as number),
          A.map(i => ({ title: `book: ${i}`, author: foo }))
        )
      )
    )
});

const hi = Apollo.resolver({
  ["Query/hi"]: () => T.accessM((_: { bar: string }) => T.pure(_.bar))
});

const resolvers = Apollo.resolver({
  ...hi,
  ...books
});

const main = pipe(Apollo.bindToSchema(resolvers, typeDefs), EX.bracketWithApp(8080));

const cancel = pipe(
  main,
  T.provideS({
    foo: "foo"
  }),
  T.provideS({
    bar: "bar"
  }),
  T.provideS(EX.express),
  x =>
    T.run(x, ex => {
      console.log(ex);
    })
);

process.on("SIGINT", () => {
  cancel();
});

process.on("SIGTERM", () => {
  cancel();
});
