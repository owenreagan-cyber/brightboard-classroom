import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { HERO_JOBS } from "./hero-jobs";
import { buildLicensePdf, licensePosition } from "./hero-license-pdf";

const template = () => new Uint8Array(readFileSync("public/downloads/hero-agency-wallet-templates.pdf"));
const cards = () => HERO_JOBS.map(job => ({ job, name: "Alex" }));
describe("wallet license PDFs", () => {
  it("creates a 2.125 by 3.375 inch PDF page for each wallet card", async () => {
    const pdf = await PDFDocument.load(await buildLicensePdf(cards(), template(), "cards"));
    expect(pdf.getPageCount()).toBe(14);
    for (const page of pdf.getPages()) expect(page.getSize()).toEqual({ width: 2.125 * 72, height: 3.375 * 72 });
  });
  it("fits 14 cards on two Letter sheets at exact size with no overlap", async () => {
    const pdf = await PDFDocument.load(await buildLicensePdf(cards(), template(), "letter"));
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPages()[0]?.getSize()).toEqual({ width: 612, height: 792 });
    expect(licensePosition(0)).toEqual({ x: 70.5, y: 523.5 });
    expect(licensePosition(8)).toEqual({ x: 388.5, y: 25.5 });
    expect(licensePosition(9)).toEqual(licensePosition(0));
  });
  it("exports only the selected student's card", async () => {
    const selected = cards().slice(4, 5);
    const pdf = await PDFDocument.load(await buildLicensePdf(selected, template(), "letter"));
    expect(pdf.getPageCount()).toBe(1);
  });
});