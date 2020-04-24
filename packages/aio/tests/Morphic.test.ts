import { MO } from "../src";
import * as J from "@matechs/test-jest";

const { summon } = MO.summonFor({});

const Person = summon((F) =>
  F.interface(
    {
      firstName: F.string({ ...MO.fastCheckConfig((x) => x.map((n) => `f_${n}`)) }),
      lastName: F.string({ ...MO.fastCheckConfig((x) => x.map((n) => `l_${n}`)) })
    },
    "Person"
  )
);

const PersonArb = MO.arb(Person)({});

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
