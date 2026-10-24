import {resumeReady, mountResumeIntake} from './resume-intake.mjs';

try {
  document.documentElement.dataset.theme = localStorage.getItem('career-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch { document.documentElement.dataset.theme = 'light'; }

async function openWorkspace() {
  try { await import('./app.js'); }
  catch {
    document.querySelector('#app').innerHTML = '<main class="intake-shell"><h1>Your resume is saved.</h1><p>The workspace could not load. Reload the page to try again.</p><button id="retryWorkspace" class="primary-btn">Reload workspace</button></main>';
    document.querySelector('#retryWorkspace').onclick = () => location.reload();
  }
}

if (resumeReady()) openWorkspace();
else mountResumeIntake(openWorkspace);
