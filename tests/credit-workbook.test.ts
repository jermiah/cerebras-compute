import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { readCreditWorkbook } from "../src/lib/credit-workbook";
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
