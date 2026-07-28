import './phase.test';
import './decay.test';
import './coupling.test';
import './accumulation.test';
import './classificationMetrics.test';
import './readinessModulation.test';
import './hubSyncAdapter.test';
import './connectionSettings.test';

import { runRegisteredTests } from './testHarness';

await runRegisteredTests();
