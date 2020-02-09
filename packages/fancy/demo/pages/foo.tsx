import { pipe } from "fp-ts/lib/pipeable";
import { App, DATE } from "../src/app";
import { Foo } from "../view/Foo";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Foo, DATE.provide));
