import { watch } from 'node:fs';
import { join } from 'path';
import type { TestReport } from './types';
import { readFile } from 'node:fs/promises';

import type { Channel } from '@storybook/channels';
import type { Options } from '@storybook/types';

import { SharedState } from './utils/SharedState';

async function getTestReport(reportFile: string): Promise<TestReport> {
  try {
    const data = await readFile(reportFile, 'utf8');
    return JSON.parse(data); // TODO: Streaming and parsing large files
  } catch (e) {
    console.error('Failed to parse test results', e);
    throw e;
  }
}

const watchTestReport = async (
  reportFile: string | undefined,
  onChange: (results: Awaited<ReturnType<typeof getTestReport>>) => Promise<void>
) => {
  if (!reportFile) return;
  const results = await getTestReport(reportFile);
  await onChange(results);

  watch(reportFile, async (eventType: string, filename: string | null) => {
    if (filename) await onChange(await getTestReport(filename));
  });
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export async function experimental_serverChannel(
  channel: Channel,
  options: Options & { reportFile?: string }
) {
  const { reportFile = join(process.cwd(), '.test-results.json') } = options;

  const testReportState = SharedState.subscribe<TestReport>('TEST_RESULTS', channel);
  testReportState.value = await getTestReport(reportFile);

  watchTestReport(reportFile, async (results) => {
    testReportState.value = results;
  });
}
