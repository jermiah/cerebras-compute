import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { guestWorkbookCsv } from "../src/lib/guest-workbook";
import { previewCsv } from "../src/lib/csv";
import { readCreditWorkbook, readCreditCsv } from "../src/lib/credit-workbook";
async function parse(rows: ExcelJS.CellValue[][]) {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Credits").addRows(rows);
  return readCreditWorkbook((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}
test("Excel import supports paired text URLs, hyperlink cells and identical duplicate rows", async () => {
  const pair = ["https://example.com/codex", "https://example.com/api"];
  assert.deepEqual(
    await parse([
      ["Codex links", "API links"],
      [pair[0], { text: "Claim API", hyperlink: pair[1] }],
      pair,
    ]),
    [{ codex: pair[0], api: pair[1] }],
  );
});
test("Excel import rejects partial pairs, unsafe URLs, formulas, wrong columns and conflicting reuse", async () => {
  for (const rows of [
    [
      ["Codex links", "API links"],
      ["https://example.com/codex", ""],
    ],
    [
      ["Codex links", "API links"],
      ["https://example.com/codex", "javascript:alert(1)"],
    ],
    [
      ["Codex links", "API links"],
      [
        { formula: 'HYPERLINK("https://example.com")' },
        "https://example.com/api",
      ],
    ],
    [
      ["API links", "Codex links"],
      ["https://example.com/a", "https://example.com/b"],
    ],
    [
      ["Codex links", "API links"],
      ["https://example.com/a", "https://example.com/b"],
      ["https://example.com/c", "https://example.com/b"],
    ],
  ] as ExcelJS.CellValue[][][])
    await assert.rejects(parse(rows));
});

test("CSV credit imports use the same pair and URL validation", () => {
  assert.deepEqual(
    readCreditCsv(
      '\uFEFFCodex links,API links\r\n"https://example.com/c?x=1,2",https://example.com/a\r\n',
    ),
    [{ codex: "https://example.com/c?x=1,2", api: "https://example.com/a" }],
  );
  for (const text of [
    "Codex links,API links\na,b",
    "Codex links,API links\nhttps://example.com/c,",
    "Codex links,API links\nhttps://example.com/c,https://example.com/a,extra",
  ])
    assert.throws(() => readCreditCsv(text));
});
test("Luma Excel converts booleans and dates while preserving check-in filtering", async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Guests").addRows([
    ["email", "name", "checked_in"],
    ["yes@example.com", "Yes, Guest", true],
    ["no@example.com", "No", false],
    ["date@example.com", "Date", new Date("2026-09-28T10:00:00Z")],
  ]);
  const text = await guestWorkbookCsv(
    (await wb.xlsx.writeBuffer()) as ArrayBuffer,
  );
  const result = previewCsv(text, {
    email: "email",
    name: "name",
    checkin: "checked_in",
    filtered: false,
  });
  assert.deepEqual(
    result.guests.map((g) => g.email),
    ["yes@example.com", "date@example.com"],
  );
  assert.equal(result.guests[0].name, "Yes, Guest");
  assert.equal(result.unchecked, 1);
});

test("credit CSV trims surrounding spaces without changing token case", () => {
  assert.deepEqual(
    readCreditCsv(
      "Codex links,API links\n  https://example.com/CaseSensitive  , https://example.com/API-Token \nhttps://example.com/CaseSensitive,https://example.com/API-Token",
    ),
    [
      {
        codex: "https://example.com/CaseSensitive",
        api: "https://example.com/API-Token",
      },
    ],
  );
});
