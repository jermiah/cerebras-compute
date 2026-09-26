import ExcelJS from "exceljs";
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
  const sheets = workbook.worksheets.filter((s) => s.actualRowCount > 0);
  if (sheets.length !== 1)
    throw new Error(
      "Use one worksheet with Codex links in column A and API links in column B.",
    );
  const sheet = sheets[0];
  if (sheet.columnCount > 2 || sheet.rowCount > 5001)
    throw new Error("Use exactly two columns and at most 5,000 reward rows.");
  if (
    !/^codex(?: links?)?$/i.test(sheet.getCell("A1").text.trim()) ||
    !/^api(?: links?)?$/i.test(sheet.getCell("B1").text.trim())
  )
    throw new Error(
      "Name the first column Codex links and the second column API links.",
    );
  const pairs: CreditPair[] = [];
  const used = new Set<string>();
  const seenPairs = new Set<string>();
  for (let r = 2; r <= sheet.rowCount; r++) {
    const cells = [sheet.getCell(r, 1), sheet.getCell(r, 2)];
    if (cells.every((c) => c.value === null || c.text.trim() === "")) continue;
    const urls = cells.map((cell, col) => {
      const value = cell.value;
      const link =
        typeof value === "string"
          ? value.trim()
          : value && typeof value === "object" && "hyperlink" in value
            ? value.hyperlink.trim()
            : "";
      try {
        const u = new URL(link);
        if (
          link.length > 2000 ||
          !["http:", "https:"].includes(u.protocol) ||
          u.username ||
          u.password
        )
          throw new Error();
      } catch {
        throw new Error(
          `Row ${r}: add a full ${col === 0 ? "Codex" : "API"} URL. Both links are required; use URLs or hyperlinks, not formulas. No rewards were added.`,
        );
      }
      return link;
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
    throw new Error("Add at least one row containing both credit links.");
  return pairs;
}
