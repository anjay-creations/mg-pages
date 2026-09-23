import test from 'node:test';
import assert from 'node:assert/strict';
import {loadJobFeed} from '../src/job-feed.mjs';
import {normalizeJobs, filterJobs} from '../src/career-core.mjs';

test('uses published Pages snapshot when the API is absent', async () => {
  const calls = [];
  const result = await loadJobFeed({fetcher:async url => {
    calls.push(url);
    return url.includes('api/') ? {ok:false,status:404} : {ok:true,json:async()=>({version:1,jobs:[],sources:[]})};
  }});
  assert.equal(result.version, 1);
  assert.deepEqual(calls, ['./api/jobs','./data/jobs.json']);
});

test('configured API reports failure instead of silently using a different source', async () => {
  let calls = 0;
  await assert.rejects(loadJobFeed({endpoint:'https://example.com/api/jobs',fetcher:async()=>{calls++; return {ok:false,status:503};}}));
  assert.equal(calls,1);
});

test('unknown dates are opt-in and never confused with original posting dates', () => {
  const rows = normalizeJobs([{id:'a',title:'Analyst',url:'https://example.com/job',firstSeenAt:new Date().toISOString(),dateBasis:'first_seen',sourceId:'company',description:'SQL'}]);
  assert.equal(rows[0].postedAt,null);
  assert.equal(filterJobs(rows).length,0);
  assert.equal(filterJobs(rows,{includeUnknown:true,source:'company',min:'0'}).length,1);
  assert.equal(filterJobs(rows,{includeUnknown:true,source:'other'}).length,0);
});

test('archived jobs and jobs older than 30 days cannot reappear through wide filters', () => {
  const base = {title:'Analyst',url:'https://example.com/job',description:'SQL'};
  const rows=normalizeJobs([{...base,postedAt:new Date().toISOString(),status:'archived'}, {...base,postedAt:new Date(Date.now()-31*86400000).toISOString()}]);
  assert.equal(filterJobs(rows,{days:90}).length,0);
});
