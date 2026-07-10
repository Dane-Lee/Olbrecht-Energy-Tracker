import { LOCK_SPEC_CONFIG } from '@/engine';
import {
  extractLocalHour,
  extractLocalTimestampContext,
  getCircadianModifierFromRhythmProfile,
  getCircadianPhasePosition,
  getCombinedRhythmModifier,
  getCombinedRhythmModifierFromRhythmProfile,
  getInfradianModifierFromRhythmProfile,
  getInfradianPhasePosition,
  lookupCircadianModifier,
} from '@/engine/phase';

import { engineTestAthlete } from './fixtures';
import { test, assertApproximatelyEqual } from './testHarness';

test('phase extracts local hour and produces stable circadian phase', () => {
  const timestampContext = extractLocalTimestampContext({
    timestamp: '2026-03-14T15:30:00-04:00',
    timeZone: engineTestAthlete.profile.timezone,
  });
  const localHour = extractLocalHour({
    timestamp: '2026-03-14T15:30:00-04:00',
    timeZone: engineTestAthlete.profile.timezone,
  });
  const phasePosition = getCircadianPhasePosition(
    localHour,
    '17:00',
    LOCK_SPEC_CONFIG.foundation.phase,
  );

  assertApproximatelyEqual(timestampContext.localHour, 15.5);
  assertApproximatelyEqual(localHour, 15.5);
  assertApproximatelyEqual(phasePosition, 0.9375);
});

test('phase computes deterministic combined circadian and infradian modifier', () => {
  const result = getCombinedRhythmModifier({
    timestamp: '2026-03-14T17:00:00-04:00',
    circadian: {
      peakLocalTime: '17:00',
      amplitudePercent: 2,
    },
    infradian: {
      anchorDate: '2026-03-14',
      cycleLengthDays: 28,
      amplitudePercent: 3,
    },
  });

  assertApproximatelyEqual(result.circadianPhasePosition, 0);
  assertApproximatelyEqual(result.infradianPhasePosition ?? 1, 0);
  assertApproximatelyEqual(result.circadianModifierPercent, 2);
  assertApproximatelyEqual(result.infradianModifierPercent, 3);
  assertApproximatelyEqual(result.combinedModifierPercent, 5.06, 1e-10);
});

test('phase computes circadian and infradian modifiers from the athlete rhythm profile', () => {
  const rhythmProfile = {
    ...engineTestAthlete.state.learningSnapshot.rhythmProfile,
    infradianTrackingEnabled: true,
  };
  const circadian = getCircadianModifierFromRhythmProfile({
    timestamp: '2026-03-14T17:00:00-04:00',
    timeZone: engineTestAthlete.profile.timezone,
    rhythmProfile,
  });
  const infradian = getInfradianModifierFromRhythmProfile({
    timestamp: '2026-03-14T17:00:00-04:00',
    timeZone: engineTestAthlete.profile.timezone,
    rhythmProfile,
    infradianState: {
      anchorDate: '2026-03-14',
      cycleLengthDays: 28,
      amplitudePercent: 3,
    },
  });
  const combined = getCombinedRhythmModifierFromRhythmProfile({
    timestamp: '2026-03-14T17:00:00-04:00',
    timeZone: engineTestAthlete.profile.timezone,
    rhythmProfile,
    infradianState: {
      anchorDate: '2026-03-14',
      cycleLengthDays: 28,
      amplitudePercent: 3,
    },
  });

  assertApproximatelyEqual(circadian.phasePosition, 0);
  assertApproximatelyEqual(circadian.modifierPercent, 2);
  assertApproximatelyEqual(infradian.phasePosition ?? 1, 0);
  assertApproximatelyEqual(infradian.modifierPercent, 3);
  assertApproximatelyEqual(combined.combinedModifierPercent, 5.06, 1e-10);
});

test('phase supports generic lookup-table modifiers when requested', () => {
  const modifier = lookupCircadianModifier(12, {
    peakLocalTime: '12:00',
    amplitudePercent: 0,
    lookupStrategy: 'table',
    lookupTable: [
      { phasePosition: 0, modifierPercent: 1.5 },
      { phasePosition: 0.5, modifierPercent: -1.5 },
    ],
  });
  const infradianPhase = getInfradianPhasePosition('2026-03-21', '2026-03-14', 28);

  assertApproximatelyEqual(modifier.phasePosition, 0);
  assertApproximatelyEqual(modifier.modifierPercent, 1.5);
  assertApproximatelyEqual(infradianPhase, 0.25);
});
