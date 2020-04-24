import { MO } from "../src";
import * as J from "@matechs/test-jest";

interface Config {
  [MO.FastCheckURI]: {
    firstName: string;
    lastName: string;
  };
}

const { summon } = MO.summonFor<Config>({});

const Person = summon((F) =>
  F.interface(
    {
      firstName: F.string({ [MO.FastCheckURI]: (x, _) => x.map((n) => `${_.firstName}${n}`) }),
      lastName: F.string({ [MO.FastCheckURI]: (x, _) => x.map((n) => `${_.lastName}${n}`) })
    },
    "Person"
  )
);

const PersonArb = MO.arb(Person)({
  [MO.FastCheckURI]: {
    firstName: "f_",
    lastName: "l_"
  }
});

const MorphicSuite = J.suite("Morphic")(
  J.testM(
    "generate persons",
    J.property(1000)({
      pers: J.arb(PersonArb)
    })(({ pers }) => {
      expect(Object.keys(pers)).toStrictEqual(["firstName", "lastName"]);
      expect(pers.firstName.substr(0, 2)).toStrictEqual("f_");
      expect(pers.lastName.substr(0, 2)).toStrictEqual("l_");
    })
  )
);

J.run(MorphicSuite)(J.provideGenerator);
