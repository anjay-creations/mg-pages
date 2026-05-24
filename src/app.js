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
  focusCompleted: false
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
        <button class="login-btn" type="button">Continue with Google</button>
        <button class="login-btn" type="button">Continue with LinkedIn</button>
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
  const initialResults = buildJobSearchLinks("AI Product Manager", "India", "LLM apps, analytics, stakeholder communication");
  return `
    <section class="workspace-grid">
      <header class="section-head">
        <p class="eyebrow">For Keys</p>
        <h1>Find Locks</h1>
        <p>Search live job boards for roles posted within the last 7 days. Hirer-created locks appear first when available.</p>
      </header>
      <form class="tool-panel" id="findLocksForm">
        <label>Roles you are looking for<input id="roleInput" placeholder="AI Engineer, Data Analyst, Product Manager" /></label>
        <label>Preferred location<input id="locationInput" placeholder="India, Bengaluru, Remote, Mumbai" /></label>
        <label>Resume or profile notes<textarea id="resumeInput" placeholder="Paste resume text. Missing skills, locations, experience, and tools will be inferred from this."></textarea></label>
        <button class="primary-btn" type="submit">${icon("search")} Search Recent Jobs</button>
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
      <h2>Recent Board Searches</h2>
      ${results.boardLinks.map(renderJobCard).join("")}
    </div>
    <div class="result-group">
      <h2>Top Brand Career Pages</h2>
      <div class="brand-grid">${results.brandLinks.map(renderBrandLink).join("")}</div>
    </div>
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
        <div class="candle-frame">
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
    </section>
  `;
}

function renderResumeBuilder() {
  return `
    <section class="two-pane">
      <header class="section-head">
        <p class="eyebrow">Standalone resume workflow</p>
        <h1>Resume Builder</h1>
        <p>Create an ATS-ready resume flow directly inside AI Gyaan. Future backend services can parse uploads, detect missing details, and generate tailored drafts.</p>
      </header>
      <div class="tool-panel">
        <label>Target job description<textarea placeholder="Paste the lock description to tailor your key."></textarea></label>
        <label>Existing resume<input type="file" accept=".pdf,.doc,.docx,.txt" /></label>
        <button class="primary-btn" type="button">${icon("doc")} Generate ATS Draft</button>
      </div>
      <div class="preview-panel">
        <h2>Builder Flow</h2>
        <ol>
          <li>Extract job requirements and candidate facts.</li>
          <li>Ask only for missing information.</li>
          <li>Generate ATS resume, skill gaps, and recruiter keywords.</li>
        </ol>
      </div>
    </section>
  `;
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

  document.querySelector("#findLocksForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const role = document.querySelector("#roleInput").value || "AI Engineer";
    const location = document.querySelector("#locationInput").value || "India";
    const resume = document.querySelector("#resumeInput").value || "Python, LLMs, React, product analytics";
    document.querySelector("#jobResults").innerHTML = renderJobResults(buildJobSearchLinks(role, location, resume));
    bindApplyButtons();
  });

  document.querySelector("#startFocus")?.addEventListener("click", startFocus);
  document.querySelector("#resetFocus")?.addEventListener("click", resetFocus);
  document.querySelector("#failFocus")?.addEventListener("click", failFocus);
  document.querySelector("#completeFocus")?.addEventListener("click", completeFocus);

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
  const roleText = role.split(",")[0].trim() || "AI Engineer";
  const skills = extractSkills(resume);
  return {
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
