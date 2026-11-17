export function cleanPersonName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function personKey(name: string): string {
  return cleanPersonName(name).toLowerCase();
}

export interface NamedPerson {
  name: string;
  aliases?: string[] | null;
}

export function resolvePerson(name: string, people: NamedPerson[] = []): string {
  const key = personKey(name);
  const person = people.find(p =>
    [p.name, ...(p.aliases ?? [])].some(n => personKey(n) === key)
  );
  return person ? cleanPersonName(person.name) : cleanPersonName(name);
}

// Commas, "and", and "&" separate people, not distinct group identities.
export function watchWithNames(value: string | null | undefined, people: NamedPerson[] = []): string[] {
  const seen = new Map<string, string>();
  for (const part of (value ?? "").split(/\s*(?:,|&|\band\b)\s*/i)) {
    const name = resolvePerson(part, people);
    if (name && !seen.has(personKey(name))) seen.set(personKey(name), name);
  }
  return Array.from(seen.values());
}

export function normalizeWatchWith(value: string | null | undefined, people: NamedPerson[] = []): string | null {
  return watchWithNames(value, people).join(", ") || null;
}
