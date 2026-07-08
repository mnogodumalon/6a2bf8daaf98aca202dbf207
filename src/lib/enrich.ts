import type { EnrichedMitgliedsbeitraege } from '@/types/enriched';
import type { Mitglieder, Mitgliedsbeitraege } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface MitgliedsbeitraegeMaps {
  mitgliederMap: Map<string, Mitglieder>;
}

export function enrichMitgliedsbeitraege(
  mitgliedsbeitraege: Mitgliedsbeitraege[],
  maps: MitgliedsbeitraegeMaps
): EnrichedMitgliedsbeitraege[] {
  return mitgliedsbeitraege.map(r => ({
    ...r,
    mitgliedName: resolveDisplay(r.fields.mitglied, maps.mitgliederMap, 'vorname', 'nachname'),
  }));
}
