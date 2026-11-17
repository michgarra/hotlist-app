import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPersonName, normalizeWatchWith, personKey, resolvePerson, watchWithNames } from "./people";

test("person matching ignores case, Unicode-width and redundant spacing but not different names", () => {
  assert.equal(cleanPersonName("  Alex   Smith "), "Alex Smith");
  assert.equal(personKey("ＡＬＥＸ"), "alex");
  assert.equal(personKey(" Alex   Smith "), personKey("alex smith"));
  assert.notEqual(personKey("Alex"), personKey("Alexa"));
});

test("Watch With splits group names and eliminates repeated people", () => {
  assert.deepEqual(watchWithNames("Alex and Jamie, alex, Jamie & Sam, SAM"), ["Alex", "Jamie", "Sam"]);
  assert.equal(normalizeWatchWith(" , and & "), null);
  assert.deepEqual(watchWithNames("Andy, Cassandra"), ["Andy", "Cassandra"]);
});

test("only explicitly configured account nicknames are combined", () => {
  const people = [{ name: "Alex", aliases: ["Alexander"] }, { name: "Jamie", aliases: ["Jay"] }];
  assert.deepEqual(watchWithNames("Alexander & Jay, ALEX", people), ["Alex", "Jamie"]);
  assert.equal(resolvePerson(" alexander ", people), "Alex");
  assert.equal(resolvePerson("Alexander", []), "Alexander");
  assert.equal(resolvePerson("Alexa", people), "Alexa");
});
