interface PrefDatumBase {
  prefType: string;
  prefName: string;
}

type PrefDatumBoolean = PrefDatumBase & {
  prefType: "boolean";
};

type PrefDatumInteger = PrefDatumBase & {
  prefType: "integer";
};

type PrefDatumString = PrefDatumBase & {
  prefType: "string";
};

export type PrefDatum = PrefDatumBoolean | PrefDatumInteger | PrefDatumString;

type PrefDatumBooleanWithValue = PrefDatumBoolean & {
  prefValue: boolean;
};

type PrefDatumIntegerWithValue = PrefDatumInteger & {
  prefValue: number;
};

type PrefDatumStringWithValue = PrefDatumString & {
  prefValue: string;
};

export type PrefDatumWithValue =
  | PrefDatumBooleanWithValue
  | PrefDatumIntegerWithValue
  | PrefDatumStringWithValue;
