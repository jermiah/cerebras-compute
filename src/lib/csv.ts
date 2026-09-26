import Papa from "papaparse";
import { normalizeEmail, validEmail } from "./portal";
export type CsvMapping = {
  email: string;
  name: string;
  checkin: string;
  filtered: boolean;
};
export type GuestRow = { email: string; name: string };
export function readCsv(text: string) {
  if (new TextEncoder().encode(text).length > 500_000)
    throw new Error("CSV must be smaller than 500 KB.");
  const result = Papa.parse<Record<string, string>>(
    text.replace(/^\uFEFF/, ""),
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    },
  );
  if (result.errors.length || result.meta.renamedHeaders)
    throw new Error(
      "CSV has duplicate columns or malformed rows. Export a fresh CSV from Luma.",
    );
  if (!result.data.length || result.data.length > 5000)
    throw new Error("Upload between 1 and 5,000 rows.");
  return { headers: result.meta.fields ?? [], rows: result.data };
}
function checkedIn(value: string) {
  const v = value.trim().toLowerCase();
  if (
    ["yes", "true", "1", "checked in", "checked-in", "checked_in"].includes(v)
  )
    return true;
  // Luma may export a status or a timestamp. Unknown values never grant access.
  return (
    /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4})[ t\d:./+z-]*$/i.test(
      v,
    ) && Number.isFinite(Date.parse(v))
  );
}
export function previewCsv(text: string, mapping: CsvMapping) {
  const { headers, rows } = readCsv(text);
  if (!headers.includes(mapping.email))
    throw new Error("Choose the email column.");
  if (!mapping.filtered && !headers.includes(mapping.checkin))
    throw new Error(
      "Choose a check-in column, or confirm this export contains only checked-in guests.",
    );
  const guests = new Map<string, GuestRow>();
  let invalid = 0,
    unchecked = 0,
    duplicates = 0;
  for (const row of rows) {
    const email = normalizeEmail(row[mapping.email] ?? "");
    if (!validEmail(email)) {
      invalid++;
      continue;
    }
    if (!mapping.filtered && !checkedIn(row[mapping.checkin] ?? "")) {
      unchecked++;
      continue;
    }
    if (guests.has(email)) {
      duplicates++;
      continue;
    }
    guests.set(email, {
      email,
      name: (row[mapping.name] ?? "").trim().slice(0, 120),
    });
  }
  return {
    guests: [...guests.values()],
    total: rows.length,
    invalid,
    unchecked,
    duplicates,
  };
}
