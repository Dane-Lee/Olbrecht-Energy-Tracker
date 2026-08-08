# Olbrecht Energy Tracker — Program CLAUDE.md
*Ecosystem role: Tier 2 — Sport-Specific (Energy Systems / Lactate)*
*Master Mind: `C:\Users\dlee5\OneDrive\Desktop\Personal Coding Projects\Athlete Ecosystem\MasterMind\CLAUDE.md`*

---

## What This Program Is

The Olbrecht Energy Tracker implements Jan Olbrecht's lactate-driven training model for swimmers. It tracks aerobic capacity, anaerobic capacity, aerobic power, and anaerobic power via lactate testing. It determines what energy system to train, at what dose, and what adaptation is being targeted.

Biological role: **Metabolic Engine** — manages what's being built under the hood. The gas pedal and gear shift while Swim State decides if the engine can handle the road.

---

## Stack

- React + TypeScript + Vite (frontend)
- Self-hosted Node + TypeScript (Fastify) backend in `server/`, SQLite via better-sqlite3
- NO Supabase / no cloud BaaS — this is a deliberate, permanent decision

---

## Current State: Built

Olbrecht lactate model is implemented. Ongoing feature work only.

---

## Core Formula

```
Response_system = Load × e^(-t/τ) × R_modifier
```
where τ = system-specific time constant, R_modifier = current readiness from Swim State Pro.

### Energy System Contribution by Race Duration
| Duration | Aerobic % | Anaerobic Lactic % | Anaerobic Alactic % |
|---|---|---|---|
| 15 sec | 5 | 25 | 70 |
| 60 sec | 25 | 50 | 25 |
| 5 min | 70 | 20 | 10 |
| 20 min | 90 | 5 | 5 |

---

## 7 Session Classes — Full Numeric Thresholds

| Class | Work Interval | Rest Rule | Volume | Primary Load Shape |
|---|---|---|---|---|
| Neural Sprint | 6–15 s | ≥ 6:1 rest:work | 50–300 m | neuro=0.70, musc=0.20, cardio=0.10 |
| Muscle Power Endurance (MPE) | 25–50 m/rep | 5–15 s rest | 125–250 m | musc=0.55, neuro=0.30, cardio=0.15 |
| Anaerobic Capacity | 30–60 s/rep | ≥ 3:1 rest:work | 400–800 m | musc=0.45, cardio=0.35, neuro=0.20 |
| Race Pace | 50–200 m | ≥ 1:2 work:rest | structured | cardio=0.45, neuro=0.30, musc=0.25 |
| Aerobic Base | 200–1500 m | continuous/broken | low intensity | cardio=0.60, musc=0.30, neuro=0.10 |
| Threshold Aerobic Power | threshold zone | structured | LT2 zone | cardio=0.55, musc=0.35, neuro=0.10 |
| Recovery Technique | below LT1 | easy | technical | cardio=0.20, musc=0.35, neuro=0.45 |

---

## Mismatch Weights by Session Class

| Class | Intent | Intensity | Technical | Perceptual | Autonomic |
|---|---|---|---|---|---|
| Neural Sprint | 0.30 | 0.35 | 0.20 | 0.10 | 0.05 |
| MPE | 0.25 | 0.30 | 0.20 | 0.15 | 0.10 |
| Anaerobic Capacity | 0.25 | 0.30 | 0.15 | 0.15 | 0.15 |
| Race Pace | 0.20 | 0.30 | 0.25 | 0.15 | 0.10 |
| Aerobic Base | 0.20 | 0.25 | 0.15 | 0.20 | 0.20 |
| Threshold Aerobic Power | 0.20 | 0.30 | 0.20 | 0.15 | 0.15 |
| Recovery Technique | 0.15 | 0.15 | 0.45 | 0.15 | 0.10 |

---

## Key Production Rules

**Psych volatility**:
```
psychVolatilityRaw = sqrt(0.70 * score² + 0.30 * dailyChange²)
psychVolatilityPercent = 100 × (1 - exp(-2.2 × psychVolatilityRaw²))
```

**Mismatch severity bands**: Low <25, Moderate 25–50, High 50–70, Critical >70

**Decision order**: safety → competition (within 14 days) → mismatch → data quality

**MPE tolerance rule**: If ≥5/6 recent MPE sessions show muscular+neurological returning to green within 48h → permit MPE every 4 days. Otherwise every 6 days.

**4 Warning triggers**:
1. 2+ consecutive high/critical mismatch sessions
2. Neural Sprint or MPE violation (frequency cap)
3. Volume not dropping on schedule within 21 days of race
4. Recovery debt D(t) > 0.6 AND neurological suppressed > −3 before taper

**Taper logic**: 41–60% volume reduction, 2-week duration, maintain intensity and frequency. Auto-infer when race within 21 days AND volume dropped ≥35% from peak.

---

## Session Classification

1. Deterministic threshold label (interval duration, rest:work, volume)
2. Soft membership scores across all 7 classes
3. Softmax with temperature T=0.20

---

## Integration Responsibilities

- ← **Swim State Pro**: receive fatigue state to modulate session type and intensity
- → **AthleteOS**: export training block outcomes and energy system profiles
- → **SentiOS**: emit heartbeat + lactate events

### SentiOS Events Required
| Event | Category | Required |
|---|---|---|
| lactate_test_started | operational | no |
| lactate_value_recorded | operational | yes |
| lactate_curve_generated | operational | no |
| energy_load_calculated | operational | no |
| profile_updated | operational | yes |
| athlete_os_ingest_request | sync | no |
| athlete_os_export_success | sync | yes |
| athlete_os_export_fail | sync | yes |
| olbrecht_engine_heartbeat | heartbeat | yes |

### Sync Contract with Swim State Pro
- RFC 3339 timestamps, UUIDs, idempotency keys, `SyncEnvelope` wrapper
- `SharedAthleteLink` entity links same athlete across both apps
- Payload types: AthleteUpsert, SessionPlanUpsert, SessionResponseUpsert, DerivedMetricsUpsert, ReadinessSnapshotUpsert, RaceEventUpsert

---

## Locked Schemas

`SessionPlan`: UUID, poolCourse enum (SCY/SCM/LCM), intendedSessionClass, intendedEnergySystemFocus, intervalSets[].

`SessionResponse`: UUID, sessionRPE (CR10 or Borg20), readinessInputs, hooperInputs, heartRateSummary, strokeMetrics, postMainSetHeartRateRecovery {oneMin, threeMin}.

Do not change these schemas without updating the sync contract with Swim State Pro.

---

## Ecosystem Rules (Local)

- Session classification must happen before readiness calculation. Never apply mismatch logic without a confirmed session class.
- The 7 session class thresholds are authoritative. Use the probabilistic soft classifier — do not return only the deterministic label.
- Taper protocol takes priority over session class recommendations when triggered.
- Sync payloads to AthleteOS must use `SyncEnvelope` with semantic versioning. Breaking schema changes require a version bump.
