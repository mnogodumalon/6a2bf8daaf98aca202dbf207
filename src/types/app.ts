// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Mitglieder {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    mitgliedsstatus?: LookupValue;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    austrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    notizen?: string;
  };
}

export interface Veranstaltungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltungsname?: string;
    veranstaltungstyp?: LookupValue;
    datum_uhrzeit?: string; // Format: YYYY-MM-DD oder ISO String
    veranstaltungsort?: string;
    beschreibung?: string;
    notizen?: string;
  };
}

export interface Mitgliedsbeitraege {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    zahlungsart?: LookupValue;
    zahlungsstatus?: LookupValue;
    notizen?: string;
    mitglied?: string; // applookup -> URL zu 'Mitglieder' Record
    beitragsjahr?: number;
    betrag?: number;
    zahlungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  MITGLIEDER: '6a2bf8bead7569152b1598a0',
  VERANSTALTUNGEN: '6a2bf8c46c1559e567d5783f',
  MITGLIEDSBEITRAEGE: '6a2bf8c369cd76d671de312a',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitglieder': {
    mitgliedsstatus: [{ key: "normales_mitglied", label: "Normales Mitglied" }, { key: "foerdermitglied", label: "Fördermitglied" }, { key: "korrespondenzmitglied", label: "Korrespondenzmitglied" }],
  },
  'veranstaltungen': {
    veranstaltungstyp: [{ key: "stammtisch", label: "Stammtisch" }, { key: "hands_on_meeting", label: "Hands-on Meeting" }, { key: "vortrag", label: "Vortrag" }],
  },
  'mitgliedsbeitraege': {
    zahlungsart: [{ key: "lastschrift", label: "Lastschrift" }, { key: "bar", label: "Bar" }, { key: "ueberweisung", label: "Überweisung" }],
    zahlungsstatus: [{ key: "bezahlt", label: "Bezahlt" }, { key: "ausstehend", label: "Ausstehend" }, { key: "gemahnt", label: "Gemahnt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'mitglieder': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'mitgliedsstatus': 'lookup/radio',
    'eintrittsdatum': 'date/date',
    'austrittsdatum': 'date/date',
    'notizen': 'string/textarea',
  },
  'veranstaltungen': {
    'veranstaltungsname': 'string/text',
    'veranstaltungstyp': 'lookup/radio',
    'datum_uhrzeit': 'date/datetimeminute',
    'veranstaltungsort': 'string/text',
    'beschreibung': 'string/textarea',
    'notizen': 'string/textarea',
  },
  'mitgliedsbeitraege': {
    'zahlungsart': 'lookup/select',
    'zahlungsstatus': 'lookup/radio',
    'notizen': 'string/textarea',
    'mitglied': 'applookup/select',
    'beitragsjahr': 'number',
    'betrag': 'number',
    'zahlungsdatum': 'date/date',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMitglieder = StripLookup<Mitglieder['fields']>;
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateMitgliedsbeitraege = StripLookup<Mitgliedsbeitraege['fields']>;