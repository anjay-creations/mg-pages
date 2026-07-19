const navItems = [
  { id: "search", label: "AI Search", icon: "spark" },
  { id: "find", label: "Find Locks", icon: "search" },
  { id: "focus", label: "Focus", icon: "clock" },
  { id: "resume", label: "Resume Builder", icon: "doc" },
  { id: "create", label: "Create Locks", icon: "lock" },
  { id: "tagged", label: "Tagged Gyaan", icon: "tag" }
];

const aiSpecialistPrompt = `
You are AI Gyaan, a strict recruitment and career-preparation specialist.
You help candidates with job search strategy, role targeting, resume improvement, interview preparation, salary and recruiter communication, hiring-market research, and learning plans for employability.
If a user asks outside recruitment, preparation, jobs, careers, hiring, or professional growth, do not answer the general topic deeply. Give one helpful reference link and say that AI Gyaan is purely for job search and career preparation. Ask the candidate not to wander in thoughts and to return to the next useful career action.
Always give practical next steps, top references, and candidate-focused advice.
`;

const sourceBank = [
  {
    title: "Google Careers",
    url: "https://www.google.com/about/careers/applications/jobs/",
    domain: "google.com/careers",
    summary: "Official openings, role requirements, locations, and hiring-team details from Google."
  },
  {
    title: "LinkedIn Jobs",
    url: "https://www.linkedin.com/jobs",
    domain: "linkedin.com",
    summary: "Professional job posts with recruiter signals, company context, and applicant fit indicators."
  },
  {
    title: "Naukri Jobs",
    url: "https://www.naukri.com",
    domain: "naukri.com",
    summary: "India-focused role discovery across technology, product, operations, and leadership roles."
  },
  {
    title: "Foundit Jobs",
    url: "https://www.foundit.in",
    domain: "foundit.in",
    summary: "Searchable listings with role metadata, experience levels, and company hiring needs."
  },
  {
    title: "Instahyre",
    url: "https://www.instahyre.com",
    domain: "instahyre.com",
    summary: "Curated startup and tech hiring opportunities with candidate-company matching."
  }
];

const jobBoards = [
  {
    name: "LinkedIn",
    domain: "linkedin.com/jobs",
    note: "Uses LinkedIn's past 7 days URL filter.",
    buildUrl: (role, location) => `https://www.linkedin.com/jobs/search/?keywords=${encodeQuery(role)}&location=${encodeQuery(location)}&f_TPR=r604800&sortBy=DD`
  },
  {
    name: "Naukri",
    domain: "naukri.com",
    note: "Open search, then keep Freshness set to Last 7 days if the filter is not already applied.",
    buildUrl: (role, location) => `https://www.naukri.com/${slugify(role)}-jobs-in-${slugify(location)}?k=${encodeQuery(role)}&l=${encodeQuery(location)}&jobAge=7&sort=rec`
  },
  {
    name: "Foundit",
    domain: "foundit.in",
    note: "Opens Foundit search; verify the posted date and keep only jobs from the last 7 days.",
    buildUrl: (role, location) => `https://www.foundit.in/srp/results?query=${encodeQuery(role)}&locations=${encodeQuery(location)}&sort=1`
  }
];

const brandCareerPages = [
  { name: "Google", url: "https://www.google.com/about/careers/applications/jobs/" },
  { name: "Microsoft", url: "https://jobs.careers.microsoft.com/global/en/search" },
  { name: "JP Morgan", url: "https://careers.jpmorgan.com/global/en/students/programs" },
  { name: "Morgan Stanley", url: "https://www.morganstanley.com/people-opportunities/careers/job-search" },
  { name: "Wells Fargo", url: "https://www.wellsfargojobs.com/en/jobs/" },
  { name: "Amazon", url: "https://www.amazon.jobs/en/search" },
  { name: "Flipkart", url: "https://www.flipkartcareers.com/#!/joblist" }
];

const roleProfiles = [
  { title: "AI Product Manager", terms: ["product", "roadmap", "stakeholder", "analytics", "llm", "ai"] },
  { title: "Generative AI Engineer", terms: ["python", "llm", "nlp", "fastapi", "rag", "langchain", "openai"] },
  { title: "Frontend Engineer", terms: ["react", "javascript", "typescript", "css", "frontend", "ui"] },
  { title: "Data Analyst", terms: ["sql", "analytics", "excel", "tableau", "power bi", "data"] },
  { title: "Cloud Engineer", terms: ["aws", "azure", "gcp", "docker", "kubernetes", "cloud"] },
  { title: "Business Analyst", terms: ["requirements", "stakeholder", "process", "business", "communication", "analysis"] }
];

const state = {
  activeView: "search",
  roleMode: "applier",
  messages: [],
  tagged: loadTagged(),
  savedChats: loadSavedChats(),
  locks: loadLocks(),
  dailyKeys: loadDailyKeys(),
  profileOpen: false,
  focusDuration: Number(localStorage.getItem("aigyaan-focus-duration") || 60),
  focusRemaining: Number(localStorage.getItem("aigyaan-focus-duration") || 60),
  focusRunning: false,
  focusCompleted: false,
  mindBacklog: loadMindBacklog(),
  authMessage: "",
  resumeBuilder: loadResumeBuilder()
};

function icon(name) {
  const paths = {
    spark: '<path d="M12 2l1.8 5.6L19 9.4l-5.2 1.8L12 17l-1.8-5.8L5 9.4l5.2-1.8L12 2z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    tag: '<path d="M20 13l-7 7L4 11V4h7l9 9z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5h8v2M3 12h18"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.spark}</svg>`;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">${icon("spark")}</div>
        <div><strong>AI Gyaan</strong><span>Locks and Keys intelligence</span></div>
      </div>
      <nav>${navItems.map(renderNavItem).join("")}</nav>
      <div class="role-card">
        <span>Workspace</span>
        <div class="segmented">
          <button class="${state.roleMode === "applier" ? "active" : ""}" data-role="applier">Key</button>
          <button class="${state.roleMode === "hirer" ? "active" : ""}" data-role="hirer">Hirer</button>
        </div>
      </div>
      <div class="mini-panel">
        <b>${state.savedChats.length}</b>
        <span>saved chats expire automatically after 24 hours.</span>
      </div>
    </aside>
    <main class="shell">
      ${renderTopNav()}
      ${renderActiveView()}
    </main>
    ${state.profileOpen ? renderProfileDrawer() : ""}
  `;

  bindGlobalEvents();
  bindViewEvents();
  tickTimers();
}

function renderTopNav() {
  return `
    <header class="app-topnav">
      <div>
        <span class="source-pill">Candidate Console</span>
        <strong>${state.dailyKeys.remaining} / ${state.dailyKeys.total} keys left today</strong>
      </div>
      <div class="topnav-actions">
        <div class="key-meter" aria-label="${state.dailyKeys.remaining} application keys remaining">
          ${Array.from({ length: state.dailyKeys.total }, (_, index) => `<span class="${index < state.dailyKeys.remaining ? "available" : ""}"></span>`).join("")}
        </div>
        <button class="profile-button" id="profileButton" type="button" aria-label="Open profile and settings">
          <img src="./src/assets/profile.svg" alt="" />
        </button>
      </div>
    </header>
  `;
}

function renderProfileDrawer() {
  return `
    <div class="drawer-backdrop" id="drawerBackdrop"></div>
    <aside class="profile-drawer" aria-label="Candidate profile">
      <div class="drawer-head">
        <div class="profile-large"><img src="./src/assets/profile.svg" alt="" /></div>
        <button class="ghost-btn" id="closeProfile" type="button">Close</button>
      </div>
      <h2>Anjali Candidate</h2>
      <p>AI and product builder preparing for stronger role matches.</p>
      <div class="profile-detail"><span>Daily application keys</span><strong>${state.dailyKeys.remaining} remaining</strong></div>
      <div class="profile-detail"><span>Workspace mode</span><strong>${state.roleMode === "applier" ? "Key / Applier" : "Hirer"}</strong></div>
      <div class="drawer-section">
        <h3>Login</h3>
        <button class="login-btn auth-login" data-provider="google" type="button">Continue with Google</button>
        <button class="login-btn auth-login" data-provider="linkedin" type="button">Continue with LinkedIn</button>
        <p class="auth-status" id="authStatus" role="status">${escapeHtml(state.authMessage)}</p>
      </div>
      <div class="drawer-section">
        <h3>Settings</h3>
        <label class="toggle-row"><input type="checkbox" checked /> Save tagged gyaan locally</label>
        <label class="toggle-row"><input type="checkbox" checked /> Show focus reminders</label>
      </div>
      <button class="ghost-btn logout-btn" type="button">Logout</button>
    </aside>
  `;
}

function renderNavItem(item) {
  return `
    <button class="nav-item ${state.activeView === item.id ? "active" : ""}" data-view="${item.id}">
      ${icon(item.icon)}
      <span>${item.label}</span>
      ${item.id === "tagged" ? `<small>${state.tagged.length}</small>` : ""}
    </button>
  `;
}

function renderActiveView() {
  if (state.activeView === "find") return renderFindLocks();
  if (state.activeView === "focus") return renderFocus();
  if (state.activeView === "resume") return renderResumeBuilder();
  if (state.activeView === "create") return renderCreateLocks();
  if (state.activeView === "tagged") return renderTagged();
  return renderSearch();
}

function renderSearch() {
  return `
    <section class="chat-layout">
      <div class="chat-main">
        <header class="topbar">
          <div>
            <p class="eyebrow">Recruitment specialist</p>
            <h1>Ask for jobs, preparation, resumes, interviews, and hiring clarity.</h1>
          </div>
          <button class="ghost-btn" id="newChat">${icon("plus")} New</button>
        </header>
        <div class="chat-stream" id="chatStream">
          ${state.messages.length ? state.messages.map(renderMessage).join("") : renderEmptyChat()}
        </div>
        <form class="composer" id="searchForm">
          <input id="queryInput" placeholder="Search AI agents, job trends, interview prep, hiring signals..." autocomplete="off" />
          <button class="primary-btn" type="submit">${icon("send")} Search</button>
        </form>
      </div>
      <aside class="context-panel">
        <h2>Agent Prompt</h2>
        <p class="prompt-copy">${escapeHtml(aiSpecialistPrompt.trim())}</p>
        <h2>Saved For 24h</h2>
        <div class="saved-list">
          ${state.savedChats.length ? state.savedChats.map(renderSavedChat).join("") : "<p>No saved chats yet.</p>"}
        </div>
      </aside>
    </section>
  `;
}

function renderEmptyChat() {
  return `
    <div class="empty-chat">
      <div class="signal-art">
        <span></span><span></span><span></span><span></span>
      </div>
      <h2>Search, rerank, cite, tag.</h2>
      <p>AI Gyaan is focused on recruitment, interview preparation, job search, resumes, and learning that improves employability.</p>
    </div>
  `;
}

function renderMessage(message) {
  if (message.role === "user") {
    return `<article class="message user"><p>${escapeHtml(message.text)}</p></article>`;
  }

  return `
    <article class="message assistant">
      <div class="answer-head">
        <span>${icon("spark")} AI answer</span>
        <button class="text-btn save-answer" data-id="${message.id}">${icon("clock")} Save 24h</button>
      </div>
      <p>${message.answer}</p>
      <div class="reference-grid">
        ${message.references.map((ref, index) => `
          <a class="reference-card" href="${ref.url}" target="_blank" rel="noreferrer">
            <small>#${index + 1} ${ref.domain}</small>
            <strong>${ref.title}</strong>
            <span>${ref.summary}</span>
          </a>
        `).join("")}
      </div>
      <div class="tag-row">
        ${["Career", "AI", "Interview", "Hiring", "Research"].map(tag => `
          <button class="chip tag-answer" data-id="${message.id}" data-tag="${tag}">${tag}</button>
        `).join("")}
      </div>
    </article>
  `;
}

function renderSavedChat(chat) {
  return `
    <div class="saved-chat">
      <strong>${escapeHtml(chat.query)}</strong>
      <span class="timer" data-expires="${chat.expiresAt}">${formatRemaining(chat.expiresAt)}</span>
    </div>
  `;
}

function renderFindLocks() {
  const initialResults = buildJobSearchLinks("", "India", "LLM apps, analytics, stakeholder communication");
  return `
    <section class="workspace-grid">
      <header class="section-head">
        <p class="eyebrow">For Keys</p>
        <h1>Find Locks</h1>
        <p>Search live job boards for roles posted within the last 7 days. Hirer-created locks appear first when available.</p>
      </header>
      <form class="tool-panel" id="findLocksForm">
        <label>Roles you are looking for (optional)<input id="roleInput" placeholder="Leave blank to get resume-based suggestions" /></label>
        <label>Preferred location<input id="locationInput" placeholder="India, Bengaluru, Remote, Mumbai" /></label>
        <label>Upload resume<input id="resumeFile" type="file" accept=".txt,.pdf,.doc,.docx" /><small>Text files are read automatically. For PDF/DOC, add profile notes below in this static version.</small></label>
        <label>Resume or profile notes<textarea id="resumeInput" placeholder="Paste resume text, skills, achievements, and experience."></textarea></label>
        <p class="form-status" id="resumeStatus" role="status"></p>
        <button class="primary-btn" type="submit">${icon("search")} Suggest Roles &amp; Find Jobs</button>
      </form>
      <div class="results-column" id="jobResults">${renderJobResults(initialResults)}</div>
    </section>
  `;
}

function renderJobResults(results) {
  const hirerLocks = state.locks.length ? `
    <div class="result-group">
      <h2>Hirer Locks</h2>
      ${state.locks.map(lock => `
        <article class="job-card">
          <span class="source-pill">Hirer lock</span>
          <h3>${escapeHtml(lock.title)}</h3>
          <p>${escapeHtml(lock.company)}</p>
          <p>${escapeHtml(lock.description)}</p>
        </article>
      `).join("")}
    </div>
  ` : "";

  return `
    ${hirerLocks}
    <div class="result-group">
      <h2>Suggested roles from your resume</h2>
      <p class="result-note">${escapeHtml(results.explanation)}</p>
      <div class="suggestion-grid">${results.suggestedRoles.map(renderSuggestedRole).join("")}</div>
    </div>
    <div class="result-group">
      <h2>Recent Board Searches</h2>
      ${results.boardLinks.map(renderJobCard).join("")}
    </div>
    <div class="result-group">
      <h2>Top Brand Career Pages</h2>
      <div class="brand-grid">${results.brandLinks.map(renderBrandLink).join("")}</div>
    </div>
  `;
}

function renderSuggestedRole(role) {
  return `
    <article class="role-suggestion">
      <span class="match-badge">${role.score}% match</span>
      <h3>${escapeHtml(role.title)}</h3>
      <p>Matched: ${role.matches.map(escapeHtml).join(", ") || "transferable experience"}</p>
      <div class="role-actions">
        ${role.links.map(link => `<a href="${link.url}" target="_blank" rel="noreferrer">View ${link.board} roles</a>`).join("")}
      </div>
    </article>
  `;
}

function renderJobCard(job) {
  return `
    <article class="job-card">
      <div class="job-card-head">
        <div>
          <span class="source-pill">${job.board}</span>
          <h3>${job.title}</h3>
          <p>${job.domain} · last 7 days only</p>
        </div>
        <div class="lock-visual" aria-hidden="true">
          <span class="key-shape"></span>
          ${icon("lock")}
        </div>
      </div>
      <button class="primary-btn job-link apply-job" data-url="${job.url}" type="button">${icon("search")} Apply with Key</button>
      <p>${job.reason}</p>
      <div class="tag-row">${job.skills.map(skill => `<span class="chip">${skill}</span>`).join("")}</div>
    </article>
  `;
}

function renderBrandLink(brand) {
  return `
    <a class="brand-link" href="${brand.url}" target="_blank" rel="noreferrer">
      <strong>${brand.name}</strong>
      <span>Official careers</span>
    </a>
  `;
}

function renderFocus() {
  return `
    <section class="focus-page">
      <header class="section-head">
        <p class="eyebrow">Self improvement</p>
        <h1>Focus</h1>
        <p>This page is only for self improvement and not to showcase. Be true to yourself before you mark a session successful.</p>
      </header>
      <div class="focus-stage">
        <div class="candle-frame ${state.focusRunning ? "is-burning" : ""}">
          <img src="./src/assets/candle.svg" alt="A candle flame for focus practice" />
        </div>
        <div class="focus-panel">
          <span class="source-pill">Look at the candle</span>
          <strong id="focusClock">${formatFocusTime(state.focusRemaining)}</strong>
          <p>Stay with the image. If you complete the timer honestly, your next focus round increases by 5 seconds. If not, the timer stays the same.</p>
          <div class="focus-actions">
            <button class="primary-btn" id="startFocus" type="button">${state.focusRunning ? "Running" : "Start"}</button>
            <button class="ghost-btn" id="resetFocus" type="button">Reset</button>
            <button class="ghost-btn" id="failFocus" type="button">I was not focused</button>
          </div>
          ${state.focusCompleted ? `<button class="primary-btn complete-focus" id="completeFocus" type="button">I completed it truthfully</button>` : ""}
        </div>
      </div>
      <section class="mind-backlog">
        <div>
          <p class="eyebrow">Clear your mind</p>
          <h2>Let it go for now</h2>
          <p>Capture a thought without following it. Your latest 10 stay here; older thoughts move into the archive automatically.</p>
        </div>
        <form id="mindBacklogForm" class="mind-form">
          <textarea id="mindThought" maxlength="500" placeholder="What is coming to mind?"></textarea>
          <button class="primary-btn" type="submit">Let it go</button>
        </form>
        ${renderMindBacklog()}
      </section>
    </section>
  `;
}

function renderMindBacklog() {
  const current = state.mindBacklog.slice(0, 10);
  const archived = state.mindBacklog.slice(10);
  const cards = items => items.map(item => `
    <article class="thought-card">
      <div><p>${escapeHtml(item.text)}</p><small>${formatThoughtDate(item.createdAt)}</small></div>
      <button class="text-btn delete-thought" data-id="${item.id}" type="button" aria-label="Delete thought">Delete</button>
    </article>
  `).join("");
  return `
    <div class="thought-list">
      <h3>Mind backlog <span>${current.length}/10</span></h3>
      ${current.length ? cards(current) : "<p class=\"empty-note\">Your mind backlog is clear.</p>"}
    </div>
    ${archived.length ? `<details class="thought-archive"><summary>Archive (${archived.length})</summary><div class="thought-list">${cards(archived)}</div></details>` : ""}
  `;
}

function renderResumeBuilder() {
  const builder = state.resumeBuilder;
  return `
    <section class="resume-builder-page">
      <header class="section-head">
        <p class="eyebrow">Guided ATS workflow</p>
        <h1>AI Resume Builder</h1>
        <p>First extract, then review, then generate. Nothing is treated as fact until you confirm it, and the builder never invents achievements or metrics.</p>
      </header>
      <div class="resume-steps" aria-label="Resume progress">
        ${["1. Goal & material", "2. Review extraction", "3. Generate & download"].map((label, index) => `<span class="${builder.step >= index + 1 ? "active" : ""}">${label}</span>`).join("")}
      </div>
      ${renderResumeIntake(builder)}
      ${builder.step >= 2 ? renderResumeReview(builder) : ""}
      ${builder.step >= 3 ? renderResumeOutput(builder) : ""}
    </section>
  `;
}

function renderResumeIntake(builder) {
  return `
    <form class="resume-section resume-intake" id="resumeIntakeForm">
      <div class="resume-section-head"><div><span class="source-pill">Step 1</span><h2>Goal and existing information</h2></div><p>Upload or paste what you already have. The next step asks only for important gaps.</p></div>
      <div class="resume-field-grid">
        <label>Target role<input id="rbTargetRole" value="${escapeHtml(builder.targetRole)}" placeholder="Enter the role presented by the user" /></label>
        <label>Profession / field<input id="rbProfession" value="${escapeHtml(builder.profession || "")}" placeholder="Teaching, design, healthcare, finance, trades..." /></label>
        <label>Industry<input id="rbIndustry" value="${escapeHtml(builder.industry)}" placeholder="Enter only when relevant" /></label>
        <label>Target company (optional)<input id="rbCompany" value="${escapeHtml(builder.company || "")}" placeholder="Company or organisation" /></label>
        <label>Target country / market<input id="rbCountry" value="${escapeHtml(builder.country)}" placeholder="India" /></label>
        <label>Candidate type<select id="rbLevel"><option value="">Select</option>${["Student / fresher", "Experienced professional", "Manager / senior leader", "Career changer", "Returning after a break", "Creative professional", "Research / academic", "Freelancer / consultant", "Entrepreneur", "Skilled trade / vocational"].map(value => `<option ${builder.level === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label>Resume purpose<select id="rbPurpose">${["General-purpose", "Role-specific", "Company-specific", "Job-description-specific"].map(value => `<option ${builder.purpose === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label>Resume length<select id="rbLength"><option ${builder.length === "One page" ? "selected" : ""}>One page</option><option ${builder.length === "Two pages" ? "selected" : ""}>Two pages</option></select></label>
        <label>Language<input id="rbLanguage" value="${escapeHtml(builder.language || "English")}" placeholder="English" /></label>
        <label>Style<select id="rbStyle">${["Professional and restrained", "Modern", "Academic", "Creative but ATS-readable"].map(value => `<option ${builder.style === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label>Existing resume or notes<input id="rbFile" type="file" accept=".txt,.pdf,.doc,.docx" /><small>Text files are extracted locally. Paste text for PDF/DOC in this static version.</small></label>
      </div>
      <label>Resume, LinkedIn text, biography, experience, projects, or rough notes<textarea id="rbSource" placeholder="Paste all available professional information here...">${escapeHtml(builder.sourceText)}</textarea></label>
      <label>Target job description (optional)<textarea id="rbJobDescription" placeholder="Paste a job description for honest keyword matching...">${escapeHtml(builder.jobDescription)}</textarea></label>
      <p class="form-status" id="rbFileStatus" role="status"></p>
      <button class="primary-btn" type="submit">${icon("spark")} Extract information</button>
    </form>
  `;
}

function renderResumeReview(builder) {
  const data = builder.data;
  const labels = getResumeLabels(builder);
  const field = (label, key, type = "text") => `
    <label>${label} ${resumeStatusPill(data[key])}<input type="${type}" data-resume-field="${key}" value="${escapeHtml(data[key] || "")}" /></label>`;
  return `
    <section class="resume-section" id="resumeReview">
      <div class="resume-section-head"><div><span class="source-pill">Step 2</span><h2>Review extracted information</h2></div><p>Correct, replace, or delete anything inaccurate. Your edits become the source of truth.</p></div>
      <div class="resume-field-grid">
        ${field("Full name", "fullName")}${field("Professional title", "professionalTitle")}
        ${field("Email", "email", "email")}${field("Phone with country code", "phone", "tel")}
        ${field("Location", "location")}${field("LinkedIn URL", "linkedin", "url")}
        ${field("Relevant professional / portfolio link", "portfolio", "url")}${field("Years of experience", "years")}
      </div>
      <label>Skills supported by the user's evidence ${resumeStatusPill(data.skills)}<textarea data-resume-field="skills" placeholder="Skills evidenced in experience, projects, education, or certifications">${escapeHtml(data.skills || "")}</textarea></label>
      <label>${labels.experience} ${resumeStatusPill(data.experience)}<textarea data-resume-field="experience" placeholder="Include role, organisation, dates, contributions, methods, stakeholders, and factual impact">${escapeHtml(data.experience || "")}</textarea></label>
      <label>${labels.projects} ${resumeStatusPill(data.projects)}<textarea data-resume-field="projects" placeholder="Selected work, objective, personal contribution, approach, outcome, and relevant link">${escapeHtml(data.projects || "")}</textarea></label>
      <label>Education ${resumeStatusPill(data.education)}<textarea data-resume-field="education" placeholder="Degree, institution, location, dates, grade if useful">${escapeHtml(data.education || "")}</textarea></label>
      <label>Certifications and achievements ${resumeStatusPill(data.certifications)}<textarea data-resume-field="certifications" placeholder="Name, issuer, date, credential link, awards">${escapeHtml(data.certifications || "")}</textarea></label>
      <label>${labels.additional} ${resumeStatusPill(data.additional)}<textarea data-resume-field="additional" placeholder="Only applicable publications, licences, languages, volunteering, memberships, awards, or leadership">${escapeHtml(data.additional || "")}</textarea></label>
      <div class="missing-panel">
        <h3>Highest-impact information to complete</h3>
        ${builder.missing.length ? `<ol>${builder.missing.slice(0, 6).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : "<p>Core information is present. Verify dates, claims, links, and confidential details before generating.</p>"}
      </div>
      <label class="confirm-row"><input id="rbConfirm" type="checkbox" ${builder.confirmed ? "checked" : ""} /> I reviewed the extracted facts and removed unsupported or confidential claims.</label>
      <button class="primary-btn" id="generateResume" type="button">${icon("doc")} Generate ATS resume</button>
    </section>
  `;
}

function renderResumeOutput(builder) {
  const report = buildResumeMatchReport(builder);
  return `
    <section class="resume-section resume-output" id="resumeOutput">
      <div class="resume-section-head"><div><span class="source-pill">Step 3</span><h2>Resume preview and files</h2></div><p>Directional compatibility only—this is not a guaranteed ATS score.</p></div>
      <div class="tailoring-basis"><strong>Tailored for:</strong> ${escapeHtml(builder.targetRole)}${builder.profession ? ` · ${escapeHtml(builder.profession)}` : ""}${builder.industry ? ` · ${escapeHtml(builder.industry)}` : ""}${builder.company ? ` · ${escapeHtml(builder.company)}` : ""}</div>
      <div class="match-report">
        <div><h3>Strong matches</h3><p>${builder.jobDescription ? report.strong.join(", ") || "No supported keyword matches identified yet." : "Add a job description for role-specific matching."}</p></div>
        <div><h3>Missing or unsupported</h3><p>${builder.jobDescription ? report.missing.join(", ") || "No obvious keyword gaps found." : "No job description was supplied; no requirements were assumed."}</p></div>
        <div><h3>Validation notes</h3><p>${builder.missing.slice(0, 3).join(" ") || "Core sections are present; perform a final date and claim check."}</p></div>
      </div>
      <article class="resume-preview" id="resumePreview">${buildResumePreview(builder)}</article>
      <div class="download-row">
        <button class="primary-btn" id="downloadTex" type="button">Download LaTeX Resume</button>
        <button class="ghost-btn" id="downloadText" type="button">Download Plain Text</button>
        <button class="ghost-btn" id="printResume" type="button">Print / Save PDF</button>
      </div>
      <details class="latex-source"><summary>View complete LaTeX source</summary><pre>${escapeHtml(buildLatexResume(builder))}</pre></details>
    </section>
  `;
}

function resumeStatusPill(value) {
  const status = value?.trim() ? "Confirmed from source—verify" : "Missing";
  return `<span class="field-status ${value?.trim() ? "confirmed" : "missing"}">${status}</span>`;
}

function getResumeLabels(builder) {
  const type = builder.level;
  if (type === "Creative professional") return { experience: "Professional experience", projects: "Selected work / portfolio", additional: "Awards, exhibitions, publications, or other relevant sections" };
  if (type === "Research / academic") return { experience: "Research and teaching experience", projects: "Research, publications, presentations, or major assignments", additional: "Grants, memberships, awards, or other relevant sections" };
  if (type === "Freelancer / consultant") return { experience: "Consulting / freelance experience", projects: "Selected client work and outcomes", additional: "Services, memberships, publications, or other relevant sections" };
  if (type === "Student / fresher") return { experience: "Internships, apprenticeships, volunteering, or experience", projects: "Projects, coursework, or selected work", additional: "Activities, awards, languages, or other relevant sections" };
  if (type === "Manager / senior leader") return { experience: "Leadership and professional experience", projects: "Career achievements and major initiatives", additional: "Board, advisory, speaking, awards, or other relevant sections" };
  if (type === "Skilled trade / vocational") return { experience: "Employment and apprenticeship history", projects: "Selected assignments or completed work", additional: "Licences, safety training, equipment, or other relevant sections" };
  return { experience: "Professional experience and achievements", projects: "Projects, selected work, or major assignments", additional: "Additional relevant information" };
}

function renderCreateLocks() {
  return `
    <section class="workspace-grid">
      <header class="section-head">
        <p class="eyebrow">For Hirers</p>
        <h1>Create Locks</h1>
        <p>Problem Owners can publish jobs now; matching Keys will be recommended as the network opens.</p>
      </header>
      <form class="tool-panel" id="createLockForm">
        <label>Role title<input id="lockTitle" placeholder="Senior AI Agent Engineer" /></label>
        <label>Company<input id="lockCompany" placeholder="Company or team name" /></label>
        <label>Lock description<textarea id="lockDescription" placeholder="Responsibilities, skills, outcomes, compensation, location."></textarea></label>
        <button class="primary-btn" type="submit">${icon("lock")} Publish Lock</button>
      </form>
      <div class="results-column">
        ${state.locks.map(lock => `
          <article class="job-card">
            <span class="source-pill">Hirer lock</span>
            <h3>${escapeHtml(lock.title)}</h3>
            <p>${escapeHtml(lock.company)}</p>
            <p>${escapeHtml(lock.description)}</p>
          </article>
        `).join("") || "<p>No locks posted yet.</p>"}
      </div>
    </section>
  `;
}

function renderTagged() {
  return `
    <section class="tagged-page">
      <header class="section-head">
        <p class="eyebrow">Learning shelf</p>
        <h1>Tagged Gyaan</h1>
        <p>Tagged AI-search answers stay organized by topic so the user can learn later.</p>
      </header>
      <div class="tagged-grid">
        ${state.tagged.length ? state.tagged.map(item => `
          <article class="tagged-card">
            <span class="source-pill">${escapeHtml(item.tag)}</span>
            <h3>${escapeHtml(item.query)}</h3>
            <p>${item.answer}</p>
          </article>
        `).join("") : "<p>No tagged gyaan yet. Tag an AI answer to collect it here.</p>"}
      </div>
    </section>
  `;
}

function bindGlobalEvents() {
  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      render();
    });
  });

  document.querySelectorAll("[data-role]").forEach(button => {
    button.addEventListener("click", () => {
      state.roleMode = button.dataset.role;
      render();
    });
  });

  document.querySelector("#profileButton")?.addEventListener("click", () => {
    state.profileOpen = true;
    render();
  });

  document.querySelector("#closeProfile")?.addEventListener("click", closeProfile);
  document.querySelector("#drawerBackdrop")?.addEventListener("click", closeProfile);
  document.querySelectorAll(".auth-login").forEach(button => {
    button.addEventListener("click", () => beginLogin(button.dataset.provider));
  });
}

function bindViewEvents() {
  const searchForm = document.querySelector("#searchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", event => {
      event.preventDefault();
      const input = document.querySelector("#queryInput");
      runAiSearch(input.value.trim());
      input.value = "";
    });
  }

  document.querySelector("#newChat")?.addEventListener("click", () => {
    state.messages = [];
    render();
  });

  document.querySelectorAll(".save-answer").forEach(button => {
    button.addEventListener("click", () => saveChat(button.dataset.id));
  });

  document.querySelectorAll(".tag-answer").forEach(button => {
    button.addEventListener("click", () => tagAnswer(button.dataset.id, button.dataset.tag));
  });

  bindApplyButtons();

  document.querySelector("#resumeFile")?.addEventListener("change", handleResumeFile);

  document.querySelector("#findLocksForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const role = document.querySelector("#roleInput").value.trim();
    const location = document.querySelector("#locationInput").value || "India";
    const resume = document.querySelector("#resumeInput").value.trim();
    document.querySelector("#jobResults").innerHTML = renderJobResults(buildJobSearchLinks(role, location, resume));
    bindApplyButtons();
  });

  document.querySelector("#startFocus")?.addEventListener("click", startFocus);
  document.querySelector("#resetFocus")?.addEventListener("click", resetFocus);
  document.querySelector("#failFocus")?.addEventListener("click", failFocus);
  document.querySelector("#completeFocus")?.addEventListener("click", completeFocus);
  document.querySelector("#mindBacklogForm")?.addEventListener("submit", addThought);
  document.querySelectorAll(".delete-thought").forEach(button => {
    button.addEventListener("click", () => deleteThought(button.dataset.id));
  });

  document.querySelector("#rbFile")?.addEventListener("change", handleBuilderFile);
  document.querySelector("#resumeIntakeForm")?.addEventListener("submit", extractResumeInformation);
  document.querySelectorAll("[data-resume-field]").forEach(input => {
    input.addEventListener("input", updateResumeField);
  });
  document.querySelector("#rbConfirm")?.addEventListener("change", event => {
    state.resumeBuilder.confirmed = event.target.checked;
    persistResumeBuilder();
  });
  document.querySelector("#generateResume")?.addEventListener("click", generateResumeOutput);
  document.querySelector("#downloadTex")?.addEventListener("click", () => downloadResumeFile("resume.tex", buildLatexResume(state.resumeBuilder), "application/x-tex"));
  document.querySelector("#downloadText")?.addEventListener("click", () => downloadResumeFile("resume.txt", buildPlainResume(state.resumeBuilder), "text/plain"));
  document.querySelector("#printResume")?.addEventListener("click", () => window.print());

  document.querySelector("#createLockForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const lock = {
      title: document.querySelector("#lockTitle").value || "Untitled Lock",
      company: document.querySelector("#lockCompany").value || "Stealth Team",
      description: document.querySelector("#lockDescription").value || "Hiring details will be added soon."
    };
    state.locks.unshift(lock);
    localStorage.setItem("aigyaan-locks", JSON.stringify(state.locks));
    render();
  });
}

function bindApplyButtons() {
  document.querySelectorAll(".apply-job").forEach(button => {
    button.addEventListener("click", event => applyToJob(event.currentTarget));
  });
}

function runAiSearch(query) {
  if (!query) return;

  state.messages.push({ role: "user", text: query });
  const isCareerQuestion = isRecruitmentQuery(query);
  const references = isCareerQuestion ? rerankSources(query).slice(0, 3) : [buildOutsideReference(query)];
  state.messages.push({
    id: crypto.randomUUID(),
    role: "assistant",
    query,
    answer: isCareerQuestion ? synthesizeAnswer(query, references) : synthesizeBoundaryAnswer(query),
    references
  });
  render();
  document.querySelector("#chatStream")?.scrollTo({ top: 100000, behavior: "smooth" });
}

function rerankSources(query) {
  const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  return sourceBank
    .map(source => {
      const haystack = `${source.title} ${source.domain} ${source.summary}`.toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { ...source, score };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function synthesizeAnswer(query, references) {
  const domains = references.map(ref => ref.domain).join(", ");
  return `For "${escapeHtml(query)}", treat this as a career decision first: define the target role, compare your current proof with the job requirement, close the missing skill gap, and apply only where the match is credible. Use ${domains} as starting references, then save the useful insight as Tagged Gyaan. Next action: write one role target, one resume gap, and one application step you can complete today.`;
}

function synthesizeBoundaryAnswer(query) {
  return `I can share a reference for "${escapeHtml(query)}", but AI Gyaan is purely for job search, recruitment preparation, resumes, interviews, hiring, and professional growth. Please do not wander in thoughts here. Bring this back to your next career action: role, skill, resume, interview, or application.`;
}

function buildOutsideReference(query) {
  return {
    title: "Reference Search",
    url: `https://www.google.com/search?q=${encodeQuery(query)}`,
    domain: "google.com",
    summary: "A general reference link because this question is outside AI Gyaan's job-search focus."
  };
}

function isRecruitmentQuery(query) {
  const allowedTerms = [
    "job", "jobs", "career", "careers", "resume", "cv", "ats", "interview", "recruiter",
    "hiring", "hire", "salary", "linkedin", "naukri", "foundit", "instahyre", "apply",
    "application", "role", "roles", "company", "companies", "skill", "skills", "learning",
    "preparation", "prep", "offer", "screening", "portfolio", "cover letter", "referral",
    "internship", "placement", "candidate", "hirer", "lock", "key"
  ];
  const lowerQuery = query.toLowerCase();
  return allowedTerms.some(term => lowerQuery.includes(term));
}

function buildJobSearchLinks(role, location, resume) {
  const suggestions = suggestRoles(role, resume, location);
  const roleText = role.split(",")[0].trim() || suggestions[0].title;
  const skills = extractSkills(resume);
  return {
    suggestedRoles: suggestions,
    explanation: role.trim()
      ? "Your requested role is prioritised, followed by adjacent roles supported by your resume keywords."
      : "These roles are ranked from the skills and experience signals found in your resume notes.",
    boardLinks: jobBoards.map(board => ({
      board: board.name,
      domain: board.domain,
      title: `${roleText} jobs in ${location}`,
      url: board.buildUrl(roleText, location),
      skills,
      reason: `${board.note} Use the opened board to verify each posting date and apply only to roles posted within 7 days.`
    })),
    brandLinks: brandCareerPages.map(brand => ({
      ...brand,
      url: addBrandQuery(brand, roleText, location)
    }))
  };
}

function suggestRoles(requestedRole, resume, location) {
  const text = `${requestedRole} ${resume}`.toLowerCase();
  const requested = requestedRole.split(",").map(value => value.trim()).filter(Boolean);
  const ranked = roleProfiles.map(profile => {
    const matches = profile.terms.filter(term => text.includes(term));
    const explicitlyRequested = requested.some(role => profile.title.toLowerCase().includes(role.toLowerCase()) || role.toLowerCase().includes(profile.title.toLowerCase()));
    return { ...profile, matches, points: matches.length + (explicitlyRequested ? 8 : 0) };
  }).sort((a, b) => b.points - a.points || a.title.localeCompare(b.title));

  const custom = requested
    .filter(title => !ranked.some(profile => profile.title.toLowerCase() === title.toLowerCase()))
    .map(title => ({ title, matches: ["your selected target"], points: 8 }));

  return [...custom, ...ranked].slice(0, 3).map((profile, index) => ({
    title: profile.title,
    matches: profile.matches.slice(0, 4),
    score: Math.min(96, Math.max(58, 88 - index * 9 + Math.min(profile.matches.length, 3) * 2)),
    links: jobBoards.map(board => ({ board: board.name, url: board.buildUrl(profile.title, location) }))
  }));
}

async function handleResumeFile(event) {
  const file = event.target.files[0];
  const status = document.querySelector("#resumeStatus");
  if (!file) return;
  if (file.name.toLowerCase().endsWith(".txt")) {
    document.querySelector("#resumeInput").value = await file.text();
    status.textContent = `${file.name} loaded. Review the extracted text, then search.`;
  } else {
    status.textContent = `${file.name} attached. PDF/DOC text extraction needs a document-processing backend; paste the key text below for accurate suggestions.`;
  }
}

function extractSkills(text) {
  const known = ["Python", "LLM", "React", "SQL", "AWS", "Analytics", "NLP", "FastAPI", "Product"];
  const found = known.filter(skill => text.toLowerCase().includes(skill.toLowerCase()));
  return (found.length ? found : ["LLM", "Python", "Communication"]).slice(0, 4);
}

function saveChat(id) {
  const message = state.messages.find(item => item.id === id);
  if (!message) return;
  state.savedChats.unshift({
    id,
    query: message.query,
    answer: message.answer,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });
  persistSavedChats();
  render();
}

function tagAnswer(id, tag) {
  const message = state.messages.find(item => item.id === id);
  if (!message) return;
  state.tagged.unshift({ id: crypto.randomUUID(), tag, query: message.query, answer: message.answer });
  localStorage.setItem("aigyaan-tagged", JSON.stringify(state.tagged));
  state.activeView = "tagged";
  render();
}

function applyToJob(button) {
  if (state.dailyKeys.remaining <= 0) {
    button.textContent = "No keys left today";
    button.disabled = true;
    return;
  }

  const lock = button.closest(".job-card")?.querySelector(".lock-visual");
  lock?.classList.add("unlocking");
  state.dailyKeys.remaining -= 1;
  persistDailyKeys();

  button.innerHTML = `${icon("lock")} Key inserted`;
  button.disabled = true;

  setTimeout(() => {
    window.open(button.dataset.url, "_blank", "noopener,noreferrer");
    render();
  }, 820);
}

function closeProfile() {
  state.profileOpen = false;
  render();
}

function loadSavedChats() {
  const saved = JSON.parse(localStorage.getItem("aigyaan-saved-chats") || "[]");
  return saved.filter(chat => chat.expiresAt > Date.now());
}

function loadTagged() {
  return JSON.parse(localStorage.getItem("aigyaan-tagged") || "[]");
}

function loadLocks() {
  return JSON.parse(localStorage.getItem("aigyaan-locks") || "[]");
}

function loadMindBacklog() {
  return JSON.parse(localStorage.getItem("aigyaan-mind-backlog") || "[]");
}

function loadResumeBuilder() {
  const defaults = {
    step: 1, targetRole: "", profession: "", industry: "", company: "", country: "", level: "",
    purpose: "Role-specific", length: "One page", language: "English", style: "Professional and restrained",
    sourceText: "", jobDescription: "", confirmed: false, missing: [], data: {}
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("aigyaan-resume-builder") || "{}") };
  } catch {
    return defaults;
  }
}

function persistResumeBuilder() {
  localStorage.setItem("aigyaan-resume-builder", JSON.stringify(state.resumeBuilder));
}

async function handleBuilderFile(event) {
  const file = event.target.files[0];
  const status = document.querySelector("#rbFileStatus");
  if (!file) return;
  if (file.name.toLowerCase().endsWith(".txt")) {
    const text = await file.text();
    document.querySelector("#rbSource").value = text;
    status.textContent = `${file.name} extracted locally. Review the text before continuing.`;
  } else {
    status.textContent = `${file.name} selected. PDF/DOC extraction requires a document backend; paste its text above to continue accurately.`;
  }
}

function extractResumeInformation(event) {
  event.preventDefault();
  const builder = state.resumeBuilder;
  builder.targetRole = document.querySelector("#rbTargetRole").value.trim();
  builder.profession = document.querySelector("#rbProfession").value.trim();
  builder.industry = document.querySelector("#rbIndustry").value.trim();
  builder.company = document.querySelector("#rbCompany").value.trim();
  builder.country = document.querySelector("#rbCountry").value.trim();
  builder.level = document.querySelector("#rbLevel").value;
  builder.purpose = document.querySelector("#rbPurpose").value;
  builder.length = document.querySelector("#rbLength").value;
  builder.language = document.querySelector("#rbLanguage").value.trim();
  builder.style = document.querySelector("#rbStyle").value;
  builder.sourceText = document.querySelector("#rbSource").value.trim();
  builder.jobDescription = document.querySelector("#rbJobDescription").value.trim();
  builder.data = extractResumeData(builder.sourceText, builder.targetRole, builder.jobDescription);
  builder.missing = findMissingResumeInformation(builder);
  builder.confirmed = false;
  builder.step = 2;
  persistResumeBuilder();
  render();
  document.querySelector("#resumeReview")?.scrollIntoView({ behavior: "smooth" });
}

function extractResumeData(text, targetRole, jobDescription = "") {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = (text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []).find(value => value.replace(/\D/g, "").length >= 10) || "";
  const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] || "";
  const portfolio = text.match(/https?:\/\/(?!.*linkedin\.com)[^\s]+/i)?.[0] || "";
  const years = text.match(/(\d+(?:\.\d+)?)\+?\s+years?/i)?.[1] || "";
  const section = heading => extractTextSection(lines, heading);
  const explicitSkills = section(/^(key |core |professional |technical )?skills|capabilities|competencies|expertise/i);
  const skills = extractRoleRelevantSkills(text, jobDescription, explicitSkills);
  return {
    fullName: lines.find(line => !line.includes("@") && line.length < 60 && /^[A-Za-z][A-Za-z .'-]+$/.test(line) && !/^(resume|summary|profile|skills?|education|experience|projects?|certifications?|achievements?)$/i.test(line)) || "",
    professionalTitle: "",
    email, phone, location: "", linkedin, portfolio, years, skills,
    experience: section(/^(work |professional )?experience/i),
    projects: section(/^projects?/i),
    education: section(/^education|academic/i),
    certifications: section(/^certifications?|licen[cs]es?|training|courses?|achievements?|awards?/i),
    additional: section(/^publications?|research|presentations?|volunteering|leadership|memberships?|languages?|additional information/i)
  };
}

function extractRoleRelevantSkills(sourceText, jobDescription, explicitSkills) {
  if (explicitSkills) return explicitSkills.replaceAll("\n", ", ");
  const source = sourceText.toLowerCase();
  if (!jobDescription) return "";
  const roleTerms = extractMeaningfulPhrases(jobDescription).filter(term => source.includes(term.toLowerCase()));
  return [...new Set(roleTerms)].slice(0, 20).map(toTitleCase).join(", ");
}

function extractMeaningfulPhrases(value) {
  const words = value.toLowerCase().match(/[a-z][a-z+#.'-]{2,}/g) || [];
  const singleTerms = words.filter(word => !resumeStopWords().has(word));
  const phrases = [];
  for (let index = 0; index < words.length - 1; index += 1) {
    if (!resumeStopWords().has(words[index]) && !resumeStopWords().has(words[index + 1])) phrases.push(`${words[index]} ${words[index + 1]}`);
  }
  return [...phrases, ...singleTerms];
}

function resumeStopWords() {
  return new Set(["and", "the", "with", "for", "that", "from", "this", "will", "your", "have", "years", "experience", "skills", "role", "work", "job", "team", "using", "required", "preferred"]);
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, letter => letter.toUpperCase());
}

function extractTextSection(lines, headingPattern) {
  const start = lines.findIndex(line => headingPattern.test(line));
  if (start < 0) return "";
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^(skills?|capabilities|competencies|expertise|education|experience|employment|projects?|selected work|portfolio|certifications?|licen[cs]es?|training|achievements?|awards?|publications?|research|presentations?|volunteering|leadership|memberships?|languages?|summary|profile|additional information)$/i.test(lines[index])) break;
    collected.push(lines[index]);
  }
  return collected.join("\n");
}

function updateResumeField(event) {
  state.resumeBuilder.data[event.target.dataset.resumeField] = event.target.value;
  state.resumeBuilder.missing = findMissingResumeInformation(state.resumeBuilder);
  state.resumeBuilder.step = 2;
  persistResumeBuilder();
}

function findMissingResumeInformation(builder) {
  const data = builder.data || {};
  const missing = [];
  if (!builder.targetRole) missing.push("Add the target role before tailoring the resume.");
  if (!data.fullName) missing.push("Provide and verify your full name.");
  if (!data.email || !data.phone) missing.push("Complete professional email and phone number with country code.");
  if (!data.location) missing.push("Add city and country; a full residential address is unnecessary.");
  if (!data.experience && builder.level !== "Student / fresher") missing.push("Add professional history with role, organisation, dates, personal contribution, approach, and factual impact.");
  if (!data.education) missing.push("Add degree, institution, location, and complete dates.");
  if (!data.skills) missing.push("Add only skills supported by experience, projects, education, or certifications.");
  if (["Student / fresher", "Creative professional", "Research / academic", "Freelancer / consultant"].includes(builder.level) && !data.projects) missing.push(`Add ${getResumeLabels(builder).projects.toLowerCase()} relevant to ${builder.targetRole || "the intended role"}.`);
  if (builder.level === "Creative professional" && !data.portfolio) missing.push("Add the profession-relevant portfolio or published-work link, if available.");
  if (builder.level === "Skilled trade / vocational" && !data.certifications) missing.push("Add applicable licences, safety credentials, apprenticeships, or vocational training and verify their status.");
  if (data.experience && !/\b(achieved|advised|analysed|built|coordinated|created|delivered|designed|developed|directed|educated|facilitated|improved|implemented|led|managed|mentored|negotiated|organised|planned|prepared|presented|produced|reduced|researched|resolved|reviewed|sold|streamlined|supported|trained|transformed)\b/i.test(data.experience)) missing.push("Strengthen professional history with role-appropriate action, context, and factual impact; do not invent metrics.");
  return missing;
}

function generateResumeOutput() {
  const builder = state.resumeBuilder;
  document.querySelectorAll("[data-resume-field]").forEach(input => {
    builder.data[input.dataset.resumeField] = input.value.trim();
  });
  builder.confirmed = document.querySelector("#rbConfirm")?.checked || false;
  builder.missing = findMissingResumeInformation(builder);
  if (!builder.targetRole) {
    window.alert("Add the role presented by the user before tailoring and generating the final resume.");
    return;
  }
  if (!builder.confirmed) {
    window.alert("Please review the extracted facts and confirm them before generating the resume.");
    return;
  }
  builder.step = 3;
  persistResumeBuilder();
  render();
  document.querySelector("#resumeOutput")?.scrollIntoView({ behavior: "smooth" });
}

function addThought(event) {
  event.preventDefault();
  const input = document.querySelector("#mindThought");
  const text = input.value.trim();
  if (!text) return;
  state.mindBacklog.unshift({ id: crypto.randomUUID(), text, createdAt: Date.now() });
  persistMindBacklog();
  render();
}

function deleteThought(id) {
  state.mindBacklog = state.mindBacklog.filter(item => item.id !== id);
  persistMindBacklog();
  render();
}

function persistMindBacklog() {
  localStorage.setItem("aigyaan-mind-backlog", JSON.stringify(state.mindBacklog));
}

function formatThoughtDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function beginLogin(provider) {
  const meta = document.querySelector(`meta[name="aigyaan-${provider}-auth-url"]`);
  const authUrl = meta?.content?.trim();
  if (!authUrl) {
    state.authMessage = `${provider === "google" ? "Google" : "LinkedIn"} login needs an OAuth callback URL. Add it to the matching auth meta tag in index.html.`;
    const status = document.querySelector("#authStatus");
    if (status) status.textContent = state.authMessage;
    return;
  }
  const target = new URL(authUrl, window.location.href);
  target.searchParams.set("returnTo", window.location.href);
  window.location.assign(target.toString());
}

function buildResumeMatchReport(builder) {
  if (!builder.jobDescription) return { strong: [], missing: [] };
  const candidate = `${builder.sourceText} ${Object.values(builder.data || {}).join(" ")}`.toLowerCase();
  const keywords = [...new Set(extractMeaningfulPhrases(builder.jobDescription))];
  return {
    strong: keywords.filter(word => candidate.includes(word)).slice(0, 12),
    missing: keywords.filter(word => !candidate.includes(word)).slice(0, 12)
  };
}

function buildProfessionalSummary(builder) {
  const data = builder.data;
  const parts = [];
  if (data.professionalTitle || builder.targetRole) parts.push(`${data.professionalTitle || builder.targetRole}${data.years ? ` with ${data.years} years of experience` : ""}`);
  if (data.skills) parts.push(`Experience supported by ${data.skills.split(",").slice(0, 6).join(", ")}`);
  if (builder.profession) parts.push(`Background relevant to ${builder.profession}`);
  if (builder.industry) parts.push(`Targeting opportunities in ${builder.industry}`);
  if (builder.company) parts.push(`Tailored for ${builder.company}`);
  return parts.length ? `${parts.join(". ")}.` : "Professional summary requires confirmed role, experience, and supported skills.";
}

function getOrderedResumeSections(builder) {
  const data = builder.data;
  const labels = getResumeLabels(builder);
  const all = {
    summary: { title: builder.level === "Manager / senior leader" ? "Executive Profile" : builder.level === "Research / academic" ? "Research Profile" : "Professional Summary", value: buildProfessionalSummary(builder) },
    skills: { title: builder.level === "Career changer" ? "Transferable Skills" : builder.level === "Creative professional" ? "Core Capabilities" : builder.level === "Manager / senior leader" ? "Leadership Capabilities" : "Key Skills", value: data.skills },
    experience: { title: labels.experience, value: data.experience },
    projects: { title: labels.projects, value: data.projects },
    education: { title: "Education", value: data.education },
    certifications: { title: builder.level === "Skilled trade / vocational" ? "Licences, Certifications & Training" : "Certifications, Licences & Training", value: data.certifications },
    additional: { title: labels.additional, value: data.additional }
  };
  const orders = {
    "Student / fresher": ["summary", "education", "skills", "projects", "experience", "certifications", "additional"],
    "Manager / senior leader": ["summary", "skills", "projects", "experience", "education", "certifications", "additional"],
    "Career changer": ["summary", "skills", "projects", "experience", "education", "certifications", "additional"],
    "Creative professional": ["summary", "skills", "projects", "experience", "education", "additional", "certifications"],
    "Research / academic": ["summary", "education", "experience", "projects", "additional", "certifications", "skills"],
    "Freelancer / consultant": ["summary", "skills", "projects", "experience", "education", "certifications", "additional"]
  };
  return (orders[builder.level] || ["summary", "skills", "experience", "projects", "education", "certifications", "additional"])
    .map(key => all[key]).filter(section => section.value?.trim());
}

function buildResumePreview(builder) {
  const data = builder.data;
  const section = (title, value) => value?.trim() ? `<section><h3>${title}</h3><p>${escapeHtml(value).replaceAll("\n", "<br>")}</p></section>` : "";
  return `<header><h2>${escapeHtml(data.fullName || "Name required")}</h2><strong>${escapeHtml(data.professionalTitle || builder.targetRole)}</strong><p>${[data.email, data.phone, data.location, data.linkedin, data.portfolio].filter(Boolean).map(escapeHtml).join(" · ")}</p></header>
    ${getOrderedResumeSections(builder).map(item => section(item.title, item.value)).join("")}`;
}

function buildPlainResume(builder) {
  const data = builder.data;
  return [data.fullName || "NAME REQUIRED", data.professionalTitle || builder.targetRole,
    [data.email, data.phone, data.location, data.linkedin, data.portfolio].filter(Boolean).join(" | "),
    ...getOrderedResumeSections(builder).map(item => `\n${item.title.toUpperCase()}\n${item.value}`)].filter(Boolean).join("\n");
}

function escapeLatex(value) {
  const replacements = { "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#", "_": "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" };
  return String(value || "").replace(/[\\&%$#_{}~^]/g, character => replacements[character]);
}

function buildLatexResume(builder) {
  const data = builder.data;
  const section = (title, value) => value?.trim() ? `\\section*{${title}}\n${escapeLatex(value).replaceAll("\n", "\\\\\n")}\n` : "";
  return `\\documentclass[10pt,a4paper]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\setlength{\\parindent}{0pt}
\\pagenumbering{gobble}
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\begin{document}
% Header
{\\LARGE\\textbf{${escapeLatex(data.fullName || "Name required")}}}\\\\
${escapeLatex(data.professionalTitle || builder.targetRole)}\\\\
${escapeLatex([data.email, data.phone, data.location, data.linkedin, data.portfolio].filter(Boolean).join(" | "))}

% Sections are ordered for the candidate type selected by the user.
${getOrderedResumeSections(builder).map(item => section(escapeLatex(item.title), item.value)).join("")}\\end{document}
`;
}

function downloadResumeFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function loadDailyKeys() {
  const today = new Date().toISOString().slice(0, 10);
  const stored = JSON.parse(localStorage.getItem("aigyaan-daily-keys") || "null");
  if (!stored || stored.date !== today) {
    return { date: today, total: 20, remaining: 20 };
  }
  return stored;
}

function persistDailyKeys() {
  localStorage.setItem("aigyaan-daily-keys", JSON.stringify(state.dailyKeys));
}

function persistSavedChats() {
  state.savedChats = state.savedChats.filter(chat => chat.expiresAt > Date.now());
  localStorage.setItem("aigyaan-saved-chats", JSON.stringify(state.savedChats));
}

function tickTimers() {
  document.querySelectorAll(".timer").forEach(timer => {
    timer.textContent = formatRemaining(Number(timer.dataset.expires));
  });
}

function formatRemaining(expiresAt) {
  const remaining = Math.max(0, expiresAt - Date.now());
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `${hours}h ${minutes}m left`;
}

function startFocus() {
  if (state.focusRunning) return;
  state.focusRunning = true;
  state.focusCompleted = false;
  render();
}

function resetFocus() {
  state.focusRunning = false;
  state.focusCompleted = false;
  state.focusRemaining = state.focusDuration;
  render();
}

function failFocus() {
  state.focusRunning = false;
  state.focusCompleted = false;
  state.focusRemaining = state.focusDuration;
  render();
}

function completeFocus() {
  state.focusDuration += 5;
  state.focusRemaining = state.focusDuration;
  state.focusCompleted = false;
  state.focusRunning = false;
  localStorage.setItem("aigyaan-focus-duration", String(state.focusDuration));
  render();
}

function tickFocus() {
  if (!state.focusRunning) return;
  state.focusRemaining = Math.max(0, state.focusRemaining - 1);
  document.querySelector("#focusClock").textContent = formatFocusTime(state.focusRemaining);
  if (state.focusRemaining === 0) {
    state.focusRunning = false;
    state.focusCompleted = true;
    render();
  }
}

function formatFocusTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function encodeQuery(value) {
  return encodeURIComponent(String(value).trim());
}

function slugify(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jobs";
}

function addBrandQuery(brand, role, location) {
  const query = encodeQuery(role);
  const loc = encodeQuery(location);
  if (brand.name === "Google") return `${brand.url}?q=${query}&location=${loc}`;
  if (brand.name === "Microsoft") return `${brand.url}?q=${query}&lc=${loc}`;
  if (brand.name === "Amazon") return `${brand.url}?base_query=${query}&loc_query=${loc}`;
  return brand.url;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

setInterval(() => {
  persistSavedChats();
  tickTimers();
}, 30000);

setInterval(tickFocus, 1000);

render();
