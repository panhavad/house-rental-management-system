"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { CATALOG_KEYS, LANGUAGE_CATALOG } from "@/lib/language-catalog";
import type { RestoreState } from "@/components/ui/RestoreButton";

const MAX_TRANSLATION_LENGTH = 5_000;
const PLACEHOLDER_PATTERN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

function placeholders(value: string) {
  return Array.from(value.matchAll(PLACEHOLDER_PATTERN), (match) => match[1]).sort().join(",");
}

function validatePlaceholders(key: string, value: string) {
  if (value && placeholders(value) !== placeholders(key)) {
    throw new Error(`Translation placeholders must match the English source: ${key}`);
  }
}

function validateTranslations(keys: FormDataEntryValue[], values: FormDataEntryValue[]) {
  if (keys.length !== LANGUAGE_CATALOG.length || values.length !== keys.length) {
    throw new Error("The language pack is incomplete. Refresh the page and try again.");
  }

  const translations: Record<string, string> = {};
  keys.forEach((keyValue, index) => {
    const key = String(keyValue);
    const value = String(values[index] ?? "").trim();
    if (!CATALOG_KEYS.has(key)) throw new Error(`Unknown translation key: ${key}`);
    if (value.length > MAX_TRANSLATION_LENGTH) throw new Error(`Translation is too long: ${key}`);
    validatePlaceholders(key, value);
    translations[key] = value;
  });
  return translations;
}

export async function updateKhmerLanguagePackAction(formData: FormData) {
  await requireSuperAdmin();
  const translations = validateTranslations(formData.getAll("key"), formData.getAll("value"));

  await prisma.languagePack.upsert({
    where: { code: "km" },
    update: { name: "Khmer", nativeName: "ភាសាខ្មែរ", translations: JSON.stringify(translations) },
    create: { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ", translations: JSON.stringify(translations) },
  });
  revalidatePath("/", "layout");
}

export async function restoreKhmerLanguagePackAction(formData: FormData): Promise<RestoreState> {
  await requireSuperAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Please choose a language pack backup." };
  if (file.size > 2_000_000) return { error: "The language pack backup is too large." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { error: "The selected file is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Invalid language pack backup." };
  }
  const backup = parsed as { format?: unknown; version?: unknown; language?: unknown; translations?: unknown };
  if (backup.format !== "rentalhrm-language-pack" || backup.version !== 1 || backup.language !== "km") {
    return { error: "This is not a supported RentalHRM Khmer language pack backup." };
  }
  if (!backup.translations || typeof backup.translations !== "object" || Array.isArray(backup.translations)) {
    return { error: "The backup does not contain valid translations." };
  }

  const translations: Record<string, string> = {};
  for (const entry of LANGUAGE_CATALOG) {
    const value = (backup.translations as Record<string, unknown>)[entry.key];
    if (typeof value !== "string") {
      return { error: `The backup is missing a valid translation for "${entry.key}".` };
    }
    if (value.length > MAX_TRANSLATION_LENGTH) {
      return { error: `The translation for "${entry.key}" is too long.` };
    }
    if (value && placeholders(value) !== placeholders(entry.key)) {
      return { error: `The placeholders for "${entry.key}" do not match the English source.` };
    }
    translations[entry.key] = value.trim();
  }

  await prisma.languagePack.upsert({
    where: { code: "km" },
    update: { name: "Khmer", nativeName: "ភាសាខ្មែរ", translations: JSON.stringify(translations) },
    create: { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ", translations: JSON.stringify(translations) },
  });
  revalidatePath("/", "layout");
  return { success: `Restored ${LANGUAGE_CATALOG.length} Khmer translations from "${file.name}".` };
}
