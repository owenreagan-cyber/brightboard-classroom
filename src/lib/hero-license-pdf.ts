import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { HERO_JOBS, type HeroJob } from "./hero-jobs";

export const WALLET_CARD = { width: 153, height: 243 };
export type LicenseLayout = "letter" | "cards";
export type StudentLicense = { job: HeroJob; name: string };

/** Dimensions are PDF points (72 per inch); never scale the wallet artwork. */
export function licensePosition(index: number) {
  return { x: 70.5 + (index % 3) * 159, y: 25.5 + (2 - Math.floor((index % 9) / 3)) * 249 };
}

export async function buildLicensePdf(cards: StudentLicense[], templateBytes: ArrayBuffer | Uint8Array, layout: LicenseLayout) {
  if (!cards.length) throw new Error("No licenses selected.");
  const source = await PDFDocument.load(templateBytes);
  const nameFont = await source.embedFont(StandardFonts.HelveticaBold);
  for (const { job, name } of cards) {
    const index = HERO_JOBS.findIndex(j => j.id === job.id);
    const page = source.getPages()[index];
    if (!page) throw new Error("This job's license artwork is missing.");
    const size = Math.min(15, 133 / Math.max(1, nameFont.widthOfTextAtSize(name, 1)));
    page.drawText(name, { x: 10, y: 87, size, font: nameFont, color: rgb(0.125, 0.141, 0.235) });
  }
  const output = await PDFDocument.create();
  output.setTitle("Hero Agency — Student Wallet Licenses");
  output.setSubject("Wallet cards: 2.125 × 3.375 inches. Print at Actual size / 100%.");
  output.setCreator("Hero Board");
  // Flush newly added name-font resources before embedding into another document.
  const finalized = await PDFDocument.load(await source.save());
  const pages = await output.embedPages(cards.map(({ job }) => {
    const index = HERO_JOBS.findIndex(j => j.id === job.id);
    const page = finalized.getPages()[index];
    if (!page) throw new Error("License artwork is missing.");
    return page;
  }));
  const footerFont = await output.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages.length; i++) {
    const artwork = pages[i];
    if (!artwork) continue;
    const page = layout === "cards"
      ? output.addPage([WALLET_CARD.width, WALLET_CARD.height])
      : i % 9 === 0 ? output.addPage([612, 792]) : output.getPages().at(-1);
    if (!page) continue;
    const position = layout === "cards" ? { x: 0, y: 0 } : licensePosition(i);
    page.drawPage(artwork, { ...position, width: WALLET_CARD.width, height: WALLET_CARD.height });
    if (layout === "letter" && i % 9 === 0) {
      page.drawText('Hero Board | Wallet licenses 2.125 x 3.375 in | Print Actual size / 100% | Cut along borders', {
        x: 70.5, y: 12, size: 6, font: footerFont, color: rgb(0.125, 0.141, 0.235),
      });
    }
  }
  return output.save();
}

/** Call synchronously on the final download tap, keeping iOS user activation. */
export async function deliverLicensePdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Hero Agency licenses" }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}