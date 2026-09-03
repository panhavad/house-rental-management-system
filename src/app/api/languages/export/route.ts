import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { DEFAULT_KHMER_TRANSLATIONS } from "@/lib/language-catalog";
import { parseTranslations } from "@/lib/language";

export async function GET() {
  await requireSuperAdmin();
  const pack = await prisma.languagePack.findUnique({ where: { code: "km" } });
  const translations = pack
    ? { ...DEFAULT_KHMER_TRANSLATIONS, ...parseTranslations(pack.translations) }
    : DEFAULT_KHMER_TRANSLATIONS;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(
    JSON.stringify(
      {
        format: "rentalhrm-language-pack",
        version: 1,
        language: "km",
        exportedAt: new Date().toISOString(),
        translations,
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="rentalhrm-khmer-${date}.json"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
