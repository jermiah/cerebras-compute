import ExcelJS from "exceljs";
import Papa from "papaparse";
export type CreditPair = { codex: string; api: string };
export async function readCreditWorkbook(
  data: ArrayBuffer,
): Promise<CreditPair[]> {
  if (data.byteLength > 500000)
    throw new Error("Choose an Excel file smaller than 500 KB.");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data);
  } catch {
    throw new Error(
      "Unable to read Excel file. Save it as .xlsx and try again.",
    );
  }
  return validateCredits(workbook);
}
function validateCredits(workbook: ExcelJS.Workbook): CreditPair[] {
  const sheets = workbook.worksheets.filter((s) => s.actualRowCount > 0);
  if (sheets.length !== 1)
    throw new Error(
      "Use one worksheet with Codex links in column A and API coupons in column B.",
    );
  const sheet = sheets[0];
  if (sheet.columnCount > 2 || sheet.rowCount > 5001)
    throw new Error("Use exactly two columns and at most 5,000 reward rows.");
  if (
    !/^codex(?: links?)?$/i.test(sheet.getCell("A1").text.trim()) ||
    !/^api(?: links?| coupons?| codes?)?$/i.test(
      sheet.getCell("B1").text.trim(),
    )
  )
    throw new Error(
      "Name the first column Codex links and the second column API coupons.",
    );
  const pairs: CreditPair[] = [];
  const used = new Set<string>();
  const seenPairs = new Set<string>();
  for (let r = 2; r <= sheet.rowCount; r++) {
    const cells = [sheet.getCell(r, 1), sheet.getCell(r, 2)];
    if (cells.every((c) => c.value === null || c.text.trim() === "")) continue;
    const urls = cells.map((cell, col) => {
      const value = cell.value;
      const text =
        typeof value === "string" || typeof value === "number"
          ? String(value).trim()
          : value && typeof value === "object" && "hyperlink" in value
            ? value.hyperlink.trim()
            : "";
      if (!text || text.length > 2000)
        throw new Error(
          `Row ${r}: enter a nonempty text value of up to 2,000 characters in column ${col + 1}. Formulas are not supported.`,
        );
      return text;
    });
    const key = JSON.stringify(urls);
    if (seenPairs.has(key)) continue;
    if (urls[0] === urls[1] || urls.some((u) => used.has(u)))
      throw new Error(
        `Row ${r}: a link is reused in a different reward. No rewards were added.`,
      );
    seenPairs.add(key);
    urls.forEach((u) => used.add(u));
    pairs.push({ codex: urls[0], api: urls[1] });
  }
  if (!pairs.length)
    throw new Error(
      "Add at least one row containing a Codex link and an API coupon.",
    );
  return pairs;
}

export function readCreditCsv(text: string): CreditPair[] {
  if (new TextEncoder().encode(text).length > 500000)
    throw new Error("Choose a file smaller than 500 KB.");
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    delimiter: ",",
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length || parsed.data.some((row) => row.length !== 2))
    throw new Error(
      "Use a CSV with exactly two columns: Codex links, API coupons.",
    );
  if (parsed.data.length > 5001)
    throw new Error("Upload at most 5,000 reward rows.");
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Credits").addRows(parsed.data);
  return validateCredits(workbook);
}
