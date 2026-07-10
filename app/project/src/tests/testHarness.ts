type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const registeredTests: TestCase[] = [];

export function test(name: string, run: () => void | Promise<void>): void {
  registeredTests.push({ name, run });
}

export function assertApproximatelyEqual(
  actual: number,
  expected: number,
  tolerance = 1e-6,
): void {
  assertOk(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

export function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(actual)} to equal ${String(expected)}`);
  }
}

export function assertOk(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runRegisteredTests(): Promise<void> {
  let passedCount = 0;

  for (const testCase of registeredTests) {
    await testCase.run();
    passedCount += 1;
    console.log(`PASS ${testCase.name}`);
  }

  console.log(`Completed ${passedCount} engine foundation tests.`);
}
