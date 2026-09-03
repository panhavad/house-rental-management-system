"use client";

import { useMemo, useState } from "react";
import { Save, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { LANGUAGE_CATALOG } from "@/lib/language-catalog";
import { updateKhmerLanguagePackAction } from "@/app/super-admin/languages/actions";

const CATEGORIES = Array.from(new Set(LANGUAGE_CATALOG.map((entry) => entry.category)));

export function LanguagePackEditor({ translations }: { translations: Record<string, string> }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const visibleKeys = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return new Set(
      LANGUAGE_CATALOG.filter(
        (entry) =>
          (category === "All" || entry.category === category) &&
          (!query ||
            entry.key.toLocaleLowerCase().includes(query) ||
            (translations[entry.key] ?? "").toLocaleLowerCase().includes(query))
      ).map((entry) => entry.key)
    );
  }, [category, search, translations]);

  return (
    <form action={updateKhmerLanguagePackAction} className="space-y-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <label className="min-w-52 flex-1 text-sm font-medium text-slate-700">
          Search source or translation
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Search"
            />
          </span>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Category
          <Select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1">
            <option>All</option>
            {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </label>
        <Button type="submit" icon={Save}>Save changes</Button>
      </div>

      <p className="text-sm text-slate-500">
        Showing {visibleKeys.size} of {LANGUAGE_CATALOG.length} registered system phrases.
        Empty translations fall back to English. Keep placeholders such as {"{date}"} unchanged.
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-32 px-4 py-3 font-medium">Category</th>
              <th className="w-2/5 px-4 py-3 font-medium">English source</th>
              <th className="px-4 py-3 font-medium">Khmer translation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {LANGUAGE_CATALOG.map((entry) => (
              <tr key={entry.key} className={visibleKeys.has(entry.key) ? "" : "hidden"}>
                <td className="px-4 py-3 align-top text-xs text-slate-500">{entry.category}</td>
                <td className="px-4 py-3 align-top text-slate-700" data-no-translate>
                  {entry.key}
                  <input type="hidden" name="key" value={entry.key} />
                </td>
                <td className="px-4 py-2">
                  <textarea
                    name="value"
                    defaultValue={translations[entry.key] ?? ""}
                    rows={entry.key.length > 100 ? 3 : 1}
                    lang="km"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-sans text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
