import ExcelJS from "exceljs";
import Papa from "papaparse";
import { readCsv } from "./csv";
export async function guestWorkbookCsv(data: ArrayBuffer): Promise<string> {
  if (data.byteLength > 500000)
    throw new Error("Choose a file smaller than 500 KB.");
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
    throw new Error("Use one worksheet containing the Luma guest list.");
  const sheet = sheets[0];
  if (sheet.rowCount > 5001 || sheet.columnCount > 100)
    throw new Error("Use at most 5,000 guest rows and 100 columns.");
  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values: string[] = [];
    for (let i = 1; i <= sheet.columnCount; i++) {
      const value = row.getCell(i).value;
      if (value === null) values.push("");
      else if (value instanceof Date) values.push(value.toISOString());
      else if (typeof value === "object")
        throw new Error(
          "Use plain values in the guest sheet, not formulas or objects.",
        );
      else values.push(String(value));
    }
    rows.push(values);
  });
  const text = Papa.unparse(rows);
  readCsv(text);
  return text;
}
