import { APP_NAME } from '@/domain';
import { LOCK_SPEC_CONFIG } from '@/engine';
import { architectureManifest } from '@/tests';
import {
  STANDALONE_INTEROP_STATEMENT,
  TOP_LEVEL_SOURCE_FOLDERS,
} from '@/utils';

const formatList = (items: readonly string[]) => items.join(', ');

const folderTree = [
  'src',
  ...TOP_LEVEL_SOURCE_FOLDERS.map((folder) => `  ${folder}`),
] as const;

export default function App() {
  return (
    <main className="app-shell">
      <h1>{APP_NAME}</h1>
      <p className="muted">
        Architecture-only production skeleton. No business logic is hidden in
        components.
      </p>

      <section>
        <h2>Source Layout</h2>
        <pre>{folderTree.join('\n')}</pre>
      </section>

      <section>
        <h2>Locked Taxonomy</h2>
        <ul>
          <li>Internal systems: {formatList(architectureManifest.internalSystems)}</li>
          <li>
            Fatigue scale: {architectureManifest.fatigueScale[0]} to{' '}
            {
              architectureManifest.fatigueScale[
                architectureManifest.fatigueScale.length - 1
              ]
            }
          </li>
          <li>Session classes: {formatList(architectureManifest.sessionClasses)}</li>
          <li>
            Classifier priority:{' '}
            {formatList(LOCK_SPEC_CONFIG.classification.priorityOrder)}
          </li>
        </ul>
      </section>

      <section>
        <h2>Interop Boundary</h2>
        <ul>
          <li>{STANDALONE_INTEROP_STATEMENT}</li>
          <li>Sync schema version: {LOCK_SPEC_CONFIG.sync.syncSchemaVersion}</li>
          <li>
            Payload types: {formatList(architectureManifest.syncPayloadTypes)}
          </li>
        </ul>
      </section>

      <section>
        <h2>Domain Exports</h2>
        <ul>
          {architectureManifest.domainModelExports.map((modelName) => (
            <li key={modelName}>{modelName}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Explicit Unresolved Slots</h2>
        <ul>
          {architectureManifest.unresolvedConfigSlots.map((slot) => (
            <li key={slot.key}>
              <strong>{slot.key}:</strong> {slot.reason}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
