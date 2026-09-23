import {normalizeJobs} from './career-core.mjs';

export async function loadJobFeed({endpoint='', fetcher=fetch}={}) {
  const urls = endpoint ? [endpoint] : ['./api/jobs', './data/jobs.json'];
  let lastError;
  for (const url of urls) {
    try {
      const response = await fetcher(url, {signal: AbortSignal.timeout(20000), cache: 'no-cache'});
      if (!response.ok) throw Error(`Job feed returned ${response.status}`);
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.jobs) || !Array.isArray(data.sources)) {
        throw Error('Unsupported job feed');
      }
      return {...data, jobs: normalizeJobs(data.jobs)};
    } catch (error) { lastError = error; }
  }
  throw lastError || Error('Job pipeline is not available');
}
