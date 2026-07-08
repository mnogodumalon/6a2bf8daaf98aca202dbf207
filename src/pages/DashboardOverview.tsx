import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichMitgliedsbeitraege } from '@/lib/enrich';
import type { EnrichedMitgliedsbeitraege } from '@/types/enriched';
import type { Veranstaltungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDateTime, formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconCalendar, IconUsers, IconCoin, IconAlertTriangle,
  IconPlus, IconCircleCheck,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { de } from 'date-fns/locale';
import { format, parseISO, isAfter, isBefore, startOfToday, addDays } from 'date-fns';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import {
  RecordOverlay,
  RecordHeader,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { VeranstaltungenDialog } from '@/components/dialogs/VeranstaltungenDialog';
import { MitgliedsbeitraegeDialog } from '@/components/dialogs/MitgliedsbeitraegeDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, namen, ENTRANCE, entranceDelay, undoToast } from '@/lib/polish';

const APPGROUP_ID = '6a2bf8daaf98aca202dbf207';
const REPAIR_ENDPOINT = '/claude/build/repair';

function typenTone(typ: string | undefined): CalendarEvent['tone'] {
  if (typ === 'stammtisch') return 'primary';
  if (typ === 'hands_on_meeting') return 'success';
  if (typ === 'vortrag') return 'warning';
  return 'default';
}

export default function DashboardOverview() {
  const clock = useClock();
  const {
    mitglieder, veranstaltungen, mitgliedsbeitraege,
    setVeranstaltungen,
    mitgliederMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBeitraege = useMemo(
    () => enrichMitgliedsbeitraege(mitgliedsbeitraege, { mitgliederMap }),
    [mitgliedsbeitraege, mitgliederMap],
  );

  const [kpiFilter, setKpiFilter] = useState<'all' | 'upcoming' | 'ausstehend'>('all');
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createEventDefaults, setCreateEventDefaults] = useState<Record<string, unknown> | undefined>();
  const [editEvent, setEditEvent] = useState<Veranstaltungen | null>(null);
  const [createBeitragOpen, setCreateBeitragOpen] = useState(false);
  const [editBeitrag, setEditBeitrag] = useState<EnrichedMitgliedsbeitraege | null>(null);

  const overlay = useRecordOverlayStack<{ type: 'veranstaltung' | 'beitrag'; id: string }>();

  const today = startOfToday();
  const in7Days = addDays(today, 7);

  const aktiveCount = useMemo(
    () => mitglieder.filter(m => !m.fields.austrittsdatum || !isBefore(parseISO(m.fields.austrittsdatum), today)).length,
    [mitglieder, today],
  );

  const upcomingEvents = useMemo(
    () => veranstaltungen
      .filter(v => v.fields.datum_uhrzeit && isAfter(parseISO(v.fields.datum_uhrzeit), today))
      .sort((a, b) => (a.fields.datum_uhrzeit ?? '').localeCompare(b.fields.datum_uhrzeit ?? '')),
    [veranstaltungen, today],
  );

  const baldEvents = useMemo(
    () => upcomingEvents.filter(v => isBefore(parseISO(v.fields.datum_uhrzeit!), in7Days)),
    [upcomingEvents, in7Days],
  );

  const ausstehendBeitraege = useMemo(
    () => enrichedBeitraege.filter(b => b.fields.zahlungsstatus?.key === 'ausstehend' || b.fields.zahlungsstatus?.key === 'gemahnt'),
    [enrichedBeitraege],
  );

  const gemahnteCount = useMemo(
    () => ausstehendBeitraege.filter(b => b.fields.zahlungsstatus?.key === 'gemahnt').length,
    [ausstehendBeitraege],
  );

  const events = useMemo<CalendarEvent[]>(
    () => veranstaltungen
      .filter(v => !!v.fields.datum_uhrzeit)
      .map(v => ({
        id: `veranstaltung:${v.record_id}`,
        start: v.fields.datum_uhrzeit!,
        title: v.fields.veranstaltungsname ?? 'Ohne Name',
        subtitle: v.fields.veranstaltungsort,
        tone: typenTone(v.fields.veranstaltungstyp?.key),
      })),
    [veranstaltungen],
  );

  const handleEventDrop = async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = veranstaltungen.find(v => v.record_id === rid);
    if (!prev) return;
    setVeranstaltungen(list =>
      list.map(v => v.record_id === rid ? { ...v, fields: { ...v.fields, datum_uhrzeit: newStart } } : v),
    );
    undoToast(
      `Datum verschoben auf ${formatDateTime(newStart)}`,
      () => {
        setVeranstaltungen(list =>
          list.map(v => v.record_id === rid ? { ...v, fields: { ...v.fields, datum_uhrzeit: prev.fields.datum_uhrzeit } } : v),
        );
        LivingAppsService.updateVeranstaltungenEntry(rid, { datum_uhrzeit: prev.fields.datum_uhrzeit }).catch(() => fetchAll());
      },
    );
    try {
      await LivingAppsService.updateVeranstaltungenEntry(rid, { datum_uhrzeit: newStart });
    } catch {
      await fetchAll();
    }
  };

  const currentEvent = overlay.top?.type === 'veranstaltung'
    ? veranstaltungen.find(v => v.record_id === overlay.top!.id)
    : undefined;
  const currentBeitrag = overlay.top?.type === 'beitrag'
    ? enrichedBeitraege.find(b => b.record_id === overlay.top!.id)
    : undefined;

  const contextLine = useMemo(() => {
    const nextV = upcomingEvents[0];
    if (!nextV) return 'Noch keine Veranstaltungen geplant — leg jetzt los!';
    const naechsteNamen = baldEvents.map(v => v.fields.veranstaltungsname ?? '').filter(Boolean);
    if (baldEvents.length > 0) {
      return `Diese Woche: ${namen(naechsteNamen)}.`;
    }
    return `Nächste Veranstaltung: ${nextV.fields.veranstaltungsname ?? ''} am ${formatDateTime(nextV.fields.datum_uhrzeit)}.`;
  }, [upcomingEvents, baldEvents]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const heroBanner = gemahnteCount > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      tone="warning"
      action={{
        label: 'Beiträge ansehen',
        onClick: () => setKpiFilter(f => f === 'ausstehend' ? 'all' : 'ausstehend'),
      }}
    >
      <b>{gemahnteCount} gemahnte Beitrag{gemahnteCount !== 1 ? 'szahlungen'  : 'szahlung'}</b> — sofort nachfassen:
      {' '}{namen(ausstehendBeitraege.filter(b => b.fields.zahlungsstatus?.key === 'gemahnt').map(b => b.mitgliedName).filter(Boolean))}
    </HeroBanner>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${ENTRANCE}`}>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {gruss(clock)} — Vereinsverwaltung
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <Button
          size="sm"
          onClick={() => { setCreateEventDefaults(undefined); setCreateEventOpen(true); }}
          className="shrink-0 gap-1.5"
        >
          <IconPlus size={16} className="shrink-0" />
          Veranstaltung
        </Button>
      </div>

      <DashboardGrid
        hero={heroBanner}
        kpis={
          <StatCardRow>
            <StatCard
              title="Aktive Mitglieder"
              value={aktiveCount}
              description={aktiveCount > 0 ? `${mitglieder.length} gesamt` : 'Noch keine Mitglieder'}
              icon={<IconUsers size={18} className="text-muted-foreground" />}
              tone="default"
            />
            <StatCard
              title="Nächste Woche"
              value={baldEvents.length}
              description={baldEvents.length > 0 ? namen(baldEvents.map(v => v.fields.veranstaltungsname ?? '').filter(Boolean)) : 'Keine Events in 7 Tagen'}
              icon={<IconCalendar size={18} className="text-muted-foreground" />}
              tone={baldEvents.length > 0 ? 'primary' : 'default'}
              onClick={() => setKpiFilter(f => f === 'upcoming' ? 'all' : 'upcoming')}
              active={kpiFilter === 'upcoming'}
            />
            <StatCard
              title="Ausstehende Beiträge"
              value={ausstehendBeitraege.length}
              description={ausstehendBeitraege.length > 0 ? `${gemahnteCount} gemahnt` : 'Alles beglichen'}
              icon={<IconCoin size={18} className="text-muted-foreground" />}
              tone={gemahnteCount > 0 ? 'warning' : ausstehendBeitraege.length > 0 ? 'warning' : 'default'}
              onClick={() => setKpiFilter(f => f === 'ausstehend' ? 'all' : 'ausstehend')}
              active={kpiFilter === 'ausstehend'}
            />
          </StatCardRow>
        }
        aside={
          <>
            <WorkList
              title="Kommende Veranstaltungen"
              icon={<IconCalendar size={14} className="shrink-0" />}
              items={upcomingEvents.slice(0, 6).map(v => ({
                id: v.record_id,
                title: v.fields.veranstaltungsname ?? 'Ohne Name',
                secondLine: (
                  <>
                    <span className="text-muted-foreground">{formatDateTime(v.fields.datum_uhrzeit)}</span>
                    {v.fields.veranstaltungsort && (
                      <span className="text-muted-foreground"> · {v.fields.veranstaltungsort}</span>
                    )}
                  </>
                ),
              }))}
              onItemClick={id => overlay.replace({ type: 'veranstaltung', id })}
              empty={{
                text: 'Noch keine Veranstaltungen geplant.',
                action: {
                  label: 'Neue Veranstaltung',
                  onClick: () => { setCreateEventDefaults(undefined); setCreateEventOpen(true); },
                },
              }}
            />
            <WorkList
              title="Offene Beiträge"
              icon={<IconCoin size={14} className="shrink-0" />}
              items={(kpiFilter === 'ausstehend' ? ausstehendBeitraege : ausstehendBeitraege).slice(0, 5).map(b => ({
                id: b.record_id,
                title: b.mitgliedName || 'Unbekanntes Mitglied',
                secondLine: (
                  <>
                    <span className={b.fields.zahlungsstatus?.key === 'gemahnt' ? 'font-medium text-amber-600' : 'text-muted-foreground'}>
                      {b.fields.zahlungsstatus?.label ?? '—'}
                    </span>
                    {b.fields.betrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(b.fields.betrag)}</span>
                    )}
                    {b.fields.beitragsjahr && (
                      <span className="text-muted-foreground"> · {b.fields.beitragsjahr}</span>
                    )}
                  </>
                ),
                action: b.fields.zahlungsstatus?.key !== 'bezahlt' ? {
                  label: <IconCircleCheck size={16} />,
                  onClick: async () => {
                    const prev = b.fields.zahlungsstatus?.key;
                    setVeranstaltungen(v => v); // no-op to avoid type issues; beitrag update below
                    try {
                      await LivingAppsService.updateMitgliedsbeitraegeEntry(b.record_id, { zahlungsstatus: 'bezahlt' });
                      undoToast(
                        `${b.mitgliedName || 'Beitrag'} als bezahlt markiert`,
                        async () => {
                          await LivingAppsService.updateMitgliedsbeitraegeEntry(b.record_id, { zahlungsstatus: prev });
                          await fetchAll();
                        },
                      );
                      await fetchAll();
                    } catch {
                      await fetchAll();
                    }
                  },
                } : undefined,
              }))}
              onItemClick={id => overlay.replace({ type: 'beitrag', id })}
              empty={{
                text: ausstehendBeitraege.length === 0 ? 'Alle Beiträge beglichen.' : 'Keine gemahnte Beiträge.',
                action: {
                  label: 'Beitrag erfassen',
                  onClick: () => { setCreateBeitragOpen(true); },
                },
              }}
            />
          </>
        }
        primary={
          <div style={entranceDelay(360)} className={ENTRANCE}>
            <CalendarWidget
              events={kpiFilter === 'upcoming' ? events.filter(e => {
                const v = veranstaltungen.find(v => v.record_id === e.id.split(':')[1]);
                return v && v.fields.datum_uhrzeit && isAfter(parseISO(v.fields.datum_uhrzeit), today) && isBefore(parseISO(v.fields.datum_uhrzeit), in7Days);
              }) : events}
              locale={de}
              defaultView="month"
              onEventClick={ev => overlay.replace({ type: 'veranstaltung', id: ev.id.split(':')[1] })}
              onEventDrop={handleEventDrop}
              onEmptyClick={date => {
                setCreateEventDefaults({ datum_uhrzeit: format(date, "yyyy-MM-dd'T'HH:mm") });
                setCreateEventOpen(true);
              }}
            />
          </div>
        }
      />

      {/* Veranstaltung create/edit dialog */}
      <VeranstaltungenDialog
        open={createEventOpen || !!editEvent}
        onClose={() => { setCreateEventOpen(false); setEditEvent(null); setCreateEventDefaults(undefined); }}
        onSubmit={async fields => {
          if (editEvent) {
            await LivingAppsService.updateVeranstaltungenEntry(editEvent.record_id, fields);
          } else {
            await LivingAppsService.createVeranstaltungenEntry(fields);
          }
          await fetchAll();
        }}
        defaultValues={editEvent ? editEvent.fields : createEventDefaults}
        recordId={editEvent?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Veranstaltungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Veranstaltungen']}
      />

      {/* Mitgliedsbeitrag create/edit dialog */}
      <MitgliedsbeitraegeDialog
        open={createBeitragOpen || !!editBeitrag}
        onClose={() => { setCreateBeitragOpen(false); setEditBeitrag(null); }}
        onSubmit={async fields => {
          if (editBeitrag) {
            await LivingAppsService.updateMitgliedsbeitraegeEntry(editBeitrag.record_id, fields);
          } else {
            await LivingAppsService.createMitgliedsbeitraegeEntry(fields);
          }
          await fetchAll();
        }}
        defaultValues={editBeitrag ? editBeitrag.fields : undefined}
        recordId={editBeitrag?.record_id}
        mitgliederList={mitglieder}
        enablePhotoScan={AI_PHOTO_SCAN['Mitgliedsbeitraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitgliedsbeitraege']}
      />

      {/* Veranstaltung detail overlay */}
      <RecordOverlay
        open={overlay.open && overlay.top?.type === 'veranstaltung'}
        onClose={overlay.close}
        onEdit={currentEvent ? () => { setEditEvent(currentEvent); overlay.close(); } : undefined}
        ariaLabel="Veranstaltung"
      >
        {currentEvent && (
          <>
            <RecordHeader
              title={currentEvent.fields.veranstaltungsname ?? 'Ohne Name'}
              subtitle={currentEvent.fields.veranstaltungsort}
              meta={formatDateTime(currentEvent.fields.datum_uhrzeit)}
              badges={currentEvent.fields.veranstaltungstyp ? [currentEvent.fields.veranstaltungstyp.label] : undefined}
            />
            <RecordSection title="Details" cols={2}>
              <RecordField label="Datum & Uhrzeit" value={currentEvent.fields.datum_uhrzeit} format="datetime" />
              <RecordField label="Typ" value={currentEvent.fields.veranstaltungstyp?.label} />
              <RecordField label="Ort" value={currentEvent.fields.veranstaltungsort} />
            </RecordSection>
            {currentEvent.fields.beschreibung && (
              <RecordSection title="Beschreibung">
                <RecordField label="" value={currentEvent.fields.beschreibung} format="longtext" />
              </RecordSection>
            )}
            {currentEvent.fields.notizen && (
              <RecordSection title="Notizen">
                <RecordField label="" value={currentEvent.fields.notizen} format="longtext" />
              </RecordSection>
            )}
            <RecordAttachments appId={APP_IDS.VERANSTALTUNGEN} recordId={currentEvent.record_id} />
          </>
        )}
      </RecordOverlay>

      {/* Beitrag detail overlay */}
      <RecordOverlay
        open={overlay.open && overlay.top?.type === 'beitrag'}
        onClose={overlay.close}
        onEdit={currentBeitrag ? () => { setEditBeitrag(currentBeitrag); overlay.close(); } : undefined}
        ariaLabel="Mitgliedsbeitrag"
      >
        {currentBeitrag && (
          <>
            <RecordHeader
              title={currentBeitrag.mitgliedName || 'Unbekanntes Mitglied'}
              subtitle={`Beitragsjahr ${currentBeitrag.fields.beitragsjahr ?? '—'}`}
              meta={currentBeitrag.fields.zahlungsstatus?.label}
            />
            <RecordSection title="Zahlungsinformationen" cols={2}>
              <RecordField label="Betrag" value={currentBeitrag.fields.betrag != null ? formatCurrency(currentBeitrag.fields.betrag) : undefined} />
              <RecordField label="Status" value={currentBeitrag.fields.zahlungsstatus?.label} />
              <RecordField label="Zahlungsart" value={currentBeitrag.fields.zahlungsart?.label} />
              <RecordField label="Zahlungsdatum" value={currentBeitrag.fields.zahlungsdatum} format="date" />
              <RecordField label="Beitragsjahr" value={currentBeitrag.fields.beitragsjahr != null ? String(currentBeitrag.fields.beitragsjahr) : undefined} />
            </RecordSection>
            {currentBeitrag.fields.notizen && (
              <RecordSection title="Notizen">
                <RecordField label="" value={currentBeitrag.fields.notizen} format="longtext" />
              </RecordSection>
            )}
            <RecordAttachments appId={APP_IDS.MITGLIEDSBEITRAEGE} recordId={currentBeitrag.record_id} />
          </>
        )}
      </RecordOverlay>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
