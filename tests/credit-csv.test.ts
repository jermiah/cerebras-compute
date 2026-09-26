import { test } from "node:test";
import assert from "node:assert/strict";
import { readCreditCsv } from "../src/lib/csv";

test("credit CSV handles BOM, quoted URLs, blanks and duplicate links", () => {
  assert.deepEqual(
    readCreditCsv(
      '\uFEFFlink\r\n"https://example.com/claim?a=1,b=2"\r\n\r\n"https://example.com/claim?a=1,b=2"\r\n',
    ),
    ["https://example.com/claim?a=1,b=2"],
  );
});
test("credit CSV rejects malformed files and unsafe or missing links", () => {
  for (const csv of [
    "link\n",
    "url\nhttps://example.com",
    "link,code\nhttps://example.com,x",
    "link\nhttps://example.com\njavascript:alert(1)",
    "link\nCOUPON123",
    'link\n"https://example.com',
    "link\nhttps://user:password@example.com",
  ]) {
    assert.throws(() => readCreditCsv(csv));
  }
});
