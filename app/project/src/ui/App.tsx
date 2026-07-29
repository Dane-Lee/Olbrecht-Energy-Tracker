import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  Dumbbell,
  Gauge,
  HeartPulse,
  Radio,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  InternalSystem,
  ReadinessCategory,
  SessionClass,
} from '@/domain';
import {
  createSessionPlannerRecommendation,
  useEcosystemControlCenter,
} from '@/features';
import {
  ControlCenter,
  ControlCenterLauncher,
  useControlCenterHotkey,
} from '@/ecosystem-control-center';

const SESSION_CLASS_LABELS: Readonly<Record<SessionClass, string>> = {
  [SessionClass.NeuralSprint]: 'Neural sprint',
  [SessionClass.MusclePowerEndurance]: 'Muscle power endurance',
  [SessionClass.AnaerobicCapacity]: 'Anaerobic capacity',
  [SessionClass.RacePace]: 'Race pace',
  [SessionClass.AerobicBase]: 'Aerobic base',
  [SessionClass.ThresholdAerobicPower]: 'Threshold aerobic power',
  [SessionClass.RecoveryTechnique]: 'Recovery technique',
};

const READINESS_LABELS: Readonly<Record<ReadinessCategory, string>> = {
  [ReadinessCategory.Green]: 'Ready',
  [ReadinessCategory.Yellow]: 'Watch',
  [ReadinessCategory.Orange]: 'Constrained',
  [ReadinessCategory.Red]: 'Protect',
};

const SYSTEM_META = {
  [InternalSystem.Neurological]: {
    label: 'Neurological',
    caption: 'Speed, coordination, neural drive',
    icon: BrainCircuit,
  },
  [InternalSystem.Muscular]: {
    label: 'Muscular',
    caption: 'Power, tissue load, local fatigue',
    icon: Dumbbell,
  },
  [InternalSystem.Cardiovascular]: {
    label: 'Cardiovascular',
    caption: 'Aerobic recovery and delivery',
    icon: HeartPulse,
  },
} as const;

interface PlannerDraft {
  athleteName: string;
  intendedSessionClass: SessionClass;
  plannedDistanceMeters: number;
  plannedDurationMinutes: number;
  globalReadinessCategory: ReadinessCategory;
  systemReadinessCategory: Record<InternalSystem, ReadinessCategory>;
  daysSinceLastAnaerobicPower: string;
  anaerobicPowerTolerant: boolean;
  daysToRace: string;
}

const STORAGE_KEY = 'olbrecht.sessionPlanner.draft.v1';

const DEFAULT_DRAFT: PlannerDraft = {
  athleteName: '',
  intendedSessionClass: SessionClass.ThresholdAerobicPower,
  plannedDistanceMeters: 4200,
  plannedDurationMinutes: 90,
  globalReadinessCategory: ReadinessCategory.Green,
  systemReadinessCategory: {
    [InternalSystem.Neurological]: ReadinessCategory.Green,
    [InternalSystem.Muscular]: ReadinessCategory.Green,
    [InternalSystem.Cardiovascular]: ReadinessCategory.Green,
  },
  daysSinceLastAnaerobicPower: '6',
  anaerobicPowerTolerant: false,
  daysToRace: '',
};

function loadDraft(): PlannerDraft {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_DRAFT;
    const parsed = JSON.parse(saved) as Partial<PlannerDraft>;
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      systemReadinessCategory: {
        ...DEFAULT_DRAFT.systemReadinessCategory,
        ...parsed.systemReadinessCategory,
      },
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatPercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

export default function App() {
  const [draft, setDraft] = useState<PlannerDraft>(loadDraft);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const ecosystem = useEcosystemControlCenter();
  useControlCenterHotkey(() => setControlCenterOpen((open) => !open));
  const recommendation = useMemo(
    () =>
      createSessionPlannerRecommendation({
        intendedSessionClass: draft.intendedSessionClass,
        plannedDistanceMeters: draft.plannedDistanceMeters,
        globalReadinessCategory: draft.globalReadinessCategory,
        systemReadinessCategory: draft.systemReadinessCategory,
        daysSinceLastAnaerobicPower: optionalNumber(
          draft.daysSinceLastAnaerobicPower,
        ),
        anaerobicPowerTolerant: draft.anaerobicPowerTolerant,
        daysToRace: optionalNumber(draft.daysToRace),
      }),
    [draft],
  );

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Draft persistence is a convenience; planning remains fully usable.
    }
  }, [draft]);

  const { modulation } = recommendation;
  const classChanged =
    modulation.recommendedSessionClass !== draft.intendedSessionClass;
  const resultTone =
    modulation.volumeScale >= 1
      ? 'green'
      : modulation.volumeScale >= 0.85
        ? 'yellow'
        : modulation.volumeScale >= 0.7
          ? 'orange'
          : 'red';

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Waves size={24} />
          </div>
          <div>
            <p className="eyebrow">Energy system decision support</p>
            <h1>Olbrecht</h1>
          </div>
        </div>
        <div className="header-status" title="This workspace remains usable without the AthleteOS hub">
          <span className="status-dot local" />
          Local planning mode
        </div>
        <ControlCenterLauncher
          status={ecosystem.status}
          onClick={() => setControlCenterOpen(true)}
        />
      </header>
      <ControlCenter
        hostApp="olbrechtSystem"
        status={ecosystem.status}
        loading={ecosystem.loading}
        error={ecosystem.error}
        open={controlCenterOpen}
        onClose={() => setControlCenterOpen(false)}
        onRefresh={ecosystem.refresh}
        onConnectionChange={ecosystem.setConnection}
      />

      <section className="hero-grid">
        <div>
          <div className="hero-kicker">
            <Sparkles size={16} />
            Readiness-modulated session planning
          </div>
          <h2>Protect the adaptation. Keep the intent.</h2>
          <p>
            Turn today&apos;s readiness signal into a coach-auditable session
            recommendation using the locked Olbrecht rules.
          </p>
        </div>
        <div className="trust-card">
          <ShieldCheck size={20} />
          <div>
            <strong>Engine-backed, never opaque</strong>
            <span>Every applied rule appears in the decision trail.</span>
          </div>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="panel input-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Session input</p>
              <h3>Plan context</h3>
            </div>
            <Database size={19} aria-label="Draft stored locally" />
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Athlete</span>
              <input
                value={draft.athleteName}
                placeholder="Athlete name (optional)"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    athleteName: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field field-wide">
              <span>Intended session</span>
              <select
                value={draft.intendedSessionClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    intendedSessionClass: event.target.value as SessionClass,
                  }))
                }
              >
                {Object.values(SessionClass).map((sessionClass) => (
                  <option key={sessionClass} value={sessionClass}>
                    {SESSION_CLASS_LABELS[sessionClass]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Distance</span>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={draft.plannedDistanceMeters}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      plannedDistanceMeters: Math.max(
                        0,
                        Number(event.target.value) || 0,
                      ),
                    }))
                  }
                />
                <span>m</span>
              </div>
            </label>

            <label className="field">
              <span>Duration</span>
              <div className="input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={draft.plannedDurationMinutes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      plannedDurationMinutes: Math.max(
                        0,
                        Number(event.target.value) || 0,
                      ),
                    }))
                  }
                />
                <span>min</span>
              </div>
            </label>

            <label className="field">
              <span>Days since anaerobic power</span>
              <input
                type="number"
                min="0"
                placeholder="Unknown"
                value={draft.daysSinceLastAnaerobicPower}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    daysSinceLastAnaerobicPower: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Days to race</span>
              <input
                type="number"
                min="0"
                placeholder="No active taper"
                value={draft.daysToRace}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    daysToRace: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={draft.anaerobicPowerTolerant}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  anaerobicPowerTolerant: event.target.checked,
                }))
              }
            />
            <span>
              <strong>Anaerobic-power tolerant</strong>
              <small>Qualified 4-day spacing rule instead of 6 days</small>
            </span>
          </label>

          <div className="readiness-heading">
            <div>
              <p className="section-label">Readiness input</p>
              <h3>System status</h3>
            </div>
            <span className={`readiness-pill ${draft.globalReadinessCategory}`}>
              {READINESS_LABELS[draft.globalReadinessCategory]}
            </span>
          </div>

          <label className="field field-wide">
            <span>Global readiness</span>
            <select
              value={draft.globalReadinessCategory}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  globalReadinessCategory: event.target
                    .value as ReadinessCategory,
                }))
              }
            >
              {Object.values(ReadinessCategory).map((category) => (
                <option key={category} value={category}>
                  {READINESS_LABELS[category]} · {category}
                </option>
              ))}
            </select>
          </label>

          <div className="system-list">
            {Object.values(InternalSystem).map((system) => {
              const meta = SYSTEM_META[system];
              const Icon = meta.icon;
              return (
                <label className="system-row" key={system}>
                  <span className="system-icon">
                    <Icon size={18} />
                  </span>
                  <span className="system-copy">
                    <strong>{meta.label}</strong>
                    <small>{meta.caption}</small>
                  </span>
                  <select
                    aria-label={`${meta.label} readiness`}
                    className={draft.systemReadinessCategory[system]}
                    value={draft.systemReadinessCategory[system]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        systemReadinessCategory: {
                          ...current.systemReadinessCategory,
                          [system]: event.target.value as ReadinessCategory,
                        },
                      }))
                    }
                  >
                    {Object.values(ReadinessCategory).map((category) => (
                      <option key={category} value={category}>
                        {READINESS_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </section>

        <aside className="result-column">
          <section className={`panel recommendation-card tone-${resultTone}`}>
            <div className="recommendation-topline">
              <span className="live-calculation">
                <Activity size={15} />
                Live engine result
              </span>
              {modulation.warnings.length > 0 ? (
                <AlertTriangle size={20} className="warning-icon" />
              ) : (
                <CheckCircle2 size={20} className="success-icon" />
              )}
            </div>

            <p className="section-label">Today&apos;s recommendation</p>
            <div className="class-transition">
              <span>{SESSION_CLASS_LABELS[draft.intendedSessionClass]}</span>
              {classChanged && <ArrowRight size={20} />}
              {classChanged && (
                <strong>
                  {SESSION_CLASS_LABELS[modulation.recommendedSessionClass]}
                </strong>
              )}
            </div>
            <p className="recommendation-code">
              {modulation.recommendationCode.replace(/([A-Z])/g, ' $1')}
            </p>

            <div className="metric-grid">
              <div className="metric">
                <Gauge size={18} />
                <span>Volume</span>
                <strong>{formatPercent(modulation.volumeScale)}</strong>
                <small>{recommendation.adjustedDistanceMeters.toLocaleString()} m</small>
              </div>
              <div className="metric">
                <Clock3 size={18} />
                <span>Rest</span>
                <strong>{formatPercent(modulation.restScale)}</strong>
                <small>of prescribed rest</small>
              </div>
              <div className="metric">
                <Radio size={18} />
                <span>Intensity</span>
                <strong>{modulation.intensityGuidance}</strong>
                <small>{draft.plannedDurationMinutes} min planned</small>
              </div>
            </div>
          </section>

          <section className="panel rationale-card">
            <div className="panel-heading compact">
              <div>
                <p className="section-label">Decision trail</p>
                <h3>Why this changed</h3>
              </div>
              <span className="rule-count">{modulation.rationale.length}</span>
            </div>
            <ol className="rationale-list">
              {modulation.rationale.map((reason, index) => (
                <li key={`${index}-${reason}`}>
                  <span>{index + 1}</span>
                  <p>{reason}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="sync-card">
            <div className="sync-icon">
              <Radio size={18} />
            </div>
            <div>
              <strong>Readiness source: manual</strong>
              <p>
                This recommendation is local and has not been synced as an
                ecosystem envelope. Hub-derived readiness will be identified
                here when the live service is configured.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
