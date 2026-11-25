import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { HERO_JOBS } from "./hero-jobs";
import { buildLicensePdf, licensePosition } from "./hero-license-pdf";

const template = (size = "trading") => new Uint8Array(readFileSync(`public/downloads/hero-agency-${size}-templates.pdf`));
const cards = () => HERO_JOBS.map(job => ({ job, name: "Alex" }));
describe("wallet license PDFs", () => {
  it("creates a 2.5 by 3.5 inch PDF page for each trading card", async () => {
    const pdf = await PDFDocument.load(await buildLicensePdf(cards(), template(), "cards"));
    expect(pdf.getPageCount()).toBe(14);
    for (const page of pdf.getPages()) expect(page.getSize()).toEqual({ width: 2.5 * 72, height: 3.5 * 72 });
  });
  it("fits 14 trading cards on three Letter sheets at exact size", async () => {
    const pdf = await PDFDocument.load(await buildLicensePdf(cards(), template(), "letter"));
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getPages()[0]?.getSize()).toEqual({ width: 612, height: 792 });
    expect(licensePosition(0)).toEqual({ x: 27, y: 400.5 });
    expect(licensePosition(5)).toEqual({ x: 405, y: 139.5 });
    expect(licensePosition(6)).toEqual(licensePosition(0));
  });
  it("creates exact 3 by 4 inch lanyard cards and four per Letter sheet", async () => {
    const single = await PDFDocument.load(await buildLicensePdf(cards(), template("lanyard"), "cards", "lanyard"));
    for (const page of single.getPages()) expect(page.getSize()).toEqual({ width: 216, height: 288 });
    const sheets = await PDFDocument.load(await buildLicensePdf(cards(), template("lanyard"), "letter", "lanyard"));
    expect(sheets.getPageCount()).toBe(4);
  });
  it("exports only the selected student's card", async () => {
    const selected = cards().slice(4, 5);
    const pdf = await PDFDocument.load(await buildLicensePdf(selected, template(), "letter"));
    expect(pdf.getPageCount()).toBe(1);
  });
});