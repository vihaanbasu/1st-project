const STORAGE_KEY = "moneyquest-db-v1";

const catalog = {
  courses: [
    { id: "budgeting", title: "Budgeting Basics", lessons: [
      makeLesson("Track Every Dollar", "A budget gives each dollar a job so spending matches your priorities.", "Sam earns $2,500 and allocates 50% needs, 30% wants, 20% savings.", "What is the key goal of a budget?", ["Spend everything quickly", "Assign money to priorities", "Ignore fixed expenses"], 1),
      makeLesson("Needs vs Wants", "Needs are essentials; wants are lifestyle choices.", "Rent is a need, premium streaming is a want.", "Which is usually a want?", ["Utilities", "Groceries", "Upgraded phone yearly"], 2)
    ]},
    { id: "saving", title: "Saving Money", lessons: [
      makeLesson("Emergency Funds", "Aim for 3-6 months of essential expenses.", "Jordan saves $100/month to build a safety net.", "Why keep an emergency fund?", ["To buy luxury items", "To cover unexpected costs", "To avoid earning interest"], 1),
      makeLesson("Pay Yourself First", "Save before discretionary spending.", "Auto-transfer 10% of paycheck to savings.", "What does pay yourself first mean?", ["Invest after all spending", "Save first, then spend", "Only save leftovers"], 1)
    ]},
    { id: "credit", title: "Credit & Debt", lessons: [
      makeLesson("Credit Score Basics", "Payment history and utilization heavily affect scores.", "Ava pays on time and keeps balances low.", "What most helps credit score?", ["Late payments", "On-time payments", "Maxing cards"], 1),
      makeLesson("Good vs Bad Debt", "Some debt can create value; high-interest debt often drains wealth.", "Student loan for degree vs payday loan for consumption.", "Which debt is often harmful?", ["Low-rate mortgage", "High-interest payday loan", "Business startup loan"], 1)
    ]},
    { id: "investing", title: "Investing 101", lessons: [
      makeLesson("Risk and Return", "Higher expected returns often require accepting more volatility.", "Stocks fluctuate more than savings accounts.", "What generally has higher long-term return potential?", ["Cash savings", "Diversified stock index", "Checking account"], 1),
      makeLesson("Diversification", "Spread investments to reduce single-asset risk.", "Mixing stocks, bonds, and funds smooths outcomes.", "Diversification helps by...", ["Guaranteeing profits", "Reducing concentration risk", "Eliminating all risk"], 1)
    ]},
    { id: "taxes", title: "Taxes", lessons: [
      makeLesson("Tax Brackets", "Only the income in each bracket is taxed at that bracket's rate.", "A raise doesn't make all income taxed at higher bracket.", "How do tax brackets work?", ["All income taxed at top rate", "Marginal portions taxed progressively", "No tax on raises"], 1)
    ]},
    { id: "entrepreneurship", title: "Entrepreneurship", lessons: [
      makeLesson("Validate Ideas", "Test demand quickly before scaling.", "Mina pre-sells a small batch before full launch.", "Best first step for a startup idea?", ["Spend all savings immediately", "Validate demand with small test", "Hire a large team"], 1)
    ]},
    { id: "sidehustles", title: "Side Hustles", lessons: [
      makeLesson("Start Lean", "Use existing skills and low upfront costs.", "Chris tutors online using free tools.", "Good side hustle principle?", ["High debt to start", "Small, low-cost launch", "No customer research"], 1)
    ]}
  ]
};

function makeLesson(title, explanation, scenario, question, options, answerIndex) {
  return { title, explanation, scenario, quiz: { question, options, answerIndex } };
}

function defaultDB() {
  return {
    users: [],
    leaderboardSeed: [
      { name: "FinWizard", xp: 980, level: 8 },
      { name: "BudgetNinja", xp: 840, level: 7 },
      { name: "DebtCrusher", xp: 720, level: 6 }
    ]
  };
}

let db = loadDB();
let currentUser = null;
let currentLessonContext = null;

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultDB();
  } catch {
    return defaultDB();
  }
}

function saveDB() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

function newUser(profile) {
  return {
    ...profile,
    xp: 0,
    level: 1,
    streak: 0,
    lastLessonDate: null,
    completedLessons: {},
    quizScores: [],
    badges: [],
    dailyLessonsDone: 0
  };
}

const screens = Array.from(document.querySelectorAll(".screen"));
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));

function showScreen(id) {
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.screen === id));
}

function setLoggedInUI(loggedIn) {
  document.getElementById("auth-screen").classList.toggle("active", !loggedIn);
  if (loggedIn) showScreen("dashboard-screen");
}

function upsertUser(user) {
  const idx = db.users.findIndex((u) => u.email === user.email);
  if (idx >= 0) db.users[idx] = user;
  else db.users.push(user);
  saveDB();
}

function computeCourseProgress(course, user) {
  const done = course.lessons.filter((_, idx) => user.completedLessons[`${course.id}:${idx}`]).length;
  const percent = Math.round((done / course.lessons.length) * 100);
  return { done, total: course.lessons.length, percent };
}

function renderAll() {
  if (!currentUser) return;
  updateHeader();
  renderDashboard();
  renderCourses();
  renderProgress();
  renderLeaderboard();
}

function updateHeader() {
  document.getElementById("header-level").textContent = `Level ${currentUser.level}`;
  document.getElementById("header-xp").textContent = `${currentUser.xp} XP`;
  document.getElementById("header-streak").textContent = `🔥 ${currentUser.streak}-day streak`;
}

function renderDashboard() {
  const dailyGoal = 1;
  const percent = Math.min(100, Math.round((currentUser.dailyLessonsDone / dailyGoal) * 100));
  document.getElementById("daily-progress-label").textContent = `${currentUser.dailyLessonsDone} / ${dailyGoal} lesson today`;
  document.getElementById("daily-progress-percent").textContent = `${percent}%`;
  document.getElementById("daily-progress-bar").style.width = `${percent}%`;
  document.getElementById("daily-challenge").textContent = "Daily challenge: Complete 2 lessons for +25 bonus XP.";

  const next = findNextLesson();
  document.getElementById("recommended-lesson").textContent = next
    ? `${next.course.title} · ${next.lesson.title}`
    : "All available lessons complete. Great work!";

  const stats = [
    { title: "Completed Lessons", value: Object.keys(currentUser.completedLessons).length },
    { title: "Courses Started", value: catalog.courses.filter((c) => computeCourseProgress(c, currentUser).done > 0).length },
    { title: "Badges Earned", value: currentUser.badges.length }
  ];
  const wrap = document.getElementById("stats-cards");
  wrap.innerHTML = "";
  stats.forEach((s) => {
    const card = document.createElement("article");
    card.className = "card glass";
    card.innerHTML = `<h3>${s.title}</h3><strong>${s.value}</strong>`;
    wrap.appendChild(card);
  });
}

function renderCourses() {
  const library = document.getElementById("course-library");
  const template = document.getElementById("course-card-template");
  library.innerHTML = "";
  catalog.courses.forEach((course, cIdx) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const progress = computeCourseProgress(course, currentUser);
    node.querySelector(".course-title").textContent = course.title;
    node.querySelector(".course-lessons").textContent = `${progress.total} micro-lessons`;
    node.querySelector(".course-progress").style.width = `${progress.percent}%`;
    node.querySelector(".course-status").textContent = `${progress.done}/${progress.total} completed`;
    const button = node.querySelector(".start-course");
    const locked = cIdx > 0 && computeCourseProgress(catalog.courses[cIdx - 1], currentUser).percent < 100;
    button.disabled = locked;
    button.textContent = locked ? "Locked" : progress.percent === 100 ? "Review" : "Continue";
    button.addEventListener("click", () => openLesson(course.id, progress.done >= progress.total ? progress.total - 1 : progress.done));
    library.appendChild(node);
  });
}

function openLesson(courseId, lessonIndex) {
  const course = catalog.courses.find((c) => c.id === courseId);
  const lesson = course.lessons[lessonIndex];
  currentLessonContext = { courseId, lessonIndex };

  document.getElementById("lesson-title").textContent = lesson.title;
  document.getElementById("lesson-meta").textContent = `${course.title} · Level ${lessonIndex + 1}`;
  document.getElementById("lesson-explanation").textContent = lesson.explanation;
  document.getElementById("lesson-scenario").textContent = lesson.scenario;
  document.getElementById("lesson-question").textContent = lesson.quiz.question;
  document.getElementById("quiz-feedback").textContent = "";
  document.getElementById("next-lesson-btn").disabled = true;

  const optionsWrap = document.getElementById("quiz-options");
  optionsWrap.innerHTML = "";

  lesson.quiz.options.forEach((option, idx) => {
    const btn = document.createElement("button");
    btn.className = "btn quiz-option";
    btn.textContent = option;
    btn.addEventListener("click", () => answerQuestion(idx));
    optionsWrap.appendChild(btn);
  });

  showScreen("lesson-screen");
}

function answerQuestion(selected) {
  const { courseId, lessonIndex } = currentLessonContext;
  const course = catalog.courses.find((c) => c.id === courseId);
  const lesson = course.lessons[lessonIndex];
  const correct = selected === lesson.quiz.answerIndex;

  const optionButtons = Array.from(document.querySelectorAll(".quiz-option"));
  optionButtons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === lesson.quiz.answerIndex) b.classList.add("correct");
    if (idx === selected && !correct) b.classList.add("wrong");
  });

  const feedback = document.getElementById("quiz-feedback");
  feedback.textContent = correct ? "✅ Great! +30 XP" : "❌ Not quite. Review and try the next one.";
  feedback.style.color = correct ? "#0f8c61" : "#b8203f";

  const key = `${courseId}:${lessonIndex}`;
  if (correct && !currentUser.completedLessons[key]) {
    awardXP(30);
    currentUser.completedLessons[key] = true;
    currentUser.quizScores.push({ key, score: 100, at: Date.now() });
    trackStreak();
    evaluateBadges();
    upsertUser(currentUser);
    bounceHeader();
  }

  document.getElementById("next-lesson-btn").disabled = false;
  renderAll();
}

function awardXP(amount) {
  currentUser.xp += amount;
  currentUser.level = Math.floor(currentUser.xp / 120) + 1;
}

function trackStreak() {
  const today = new Date().toDateString();
  if (currentUser.lastLessonDate === today) {
    currentUser.dailyLessonsDone += 1;
    return;
  }
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  currentUser.streak = currentUser.lastLessonDate === yesterday ? currentUser.streak + 1 : 1;
  currentUser.lastLessonDate = today;
  currentUser.dailyLessonsDone = 1;
}

function evaluateBadges() {
  const badgeSet = new Set(currentUser.badges);
  const completedCount = Object.keys(currentUser.completedLessons).length;
  if (completedCount >= 1) badgeSet.add("🚀 First Lesson");
  if (completedCount >= 5) badgeSet.add("📘 Learning Momentum");
  if (currentUser.streak >= 7) badgeSet.add("🔥 7-Day Streak");
  if (currentUser.quizScores.length >= 3) badgeSet.add("🎯 Quiz Sharpshooter");
  const coursesCompleted = catalog.courses.filter((c) => computeCourseProgress(c, currentUser).percent === 100).length;
  if (coursesCompleted >= 1) badgeSet.add("🏆 Course Finisher");
  currentUser.badges = Array.from(badgeSet);
}

function renderProgress() {
  const summary = document.getElementById("progress-summary");
  const completed = Object.keys(currentUser.completedLessons).length;
  const doneCourses = catalog.courses.filter((c) => computeCourseProgress(c, currentUser).percent === 100).length;
  summary.innerHTML = `
    <li>Total XP: <strong>${currentUser.xp}</strong></li>
    <li>Current Level: <strong>${currentUser.level}</strong></li>
    <li>Daily Streak: <strong>${currentUser.streak}</strong></li>
    <li>Lessons Completed: <strong>${completed}</strong></li>
    <li>Courses Completed: <strong>${doneCourses}</strong></li>
  `;

  const badgeGrid = document.getElementById("badge-grid");
  badgeGrid.innerHTML = currentUser.badges.length
    ? currentUser.badges.map((b) => `<span class="badge">${b}</span>`).join("")
    : '<span class="muted">No badges yet — complete a lesson to start earning achievements.</span>';
}

function renderLeaderboard() {
  const users = [...db.leaderboardSeed, ...db.users.map((u) => ({ name: u.name, xp: u.xp, level: u.level }))]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  const body = document.getElementById("leaderboard-body");
  body.innerHTML = users.map((u, i) => `<tr><td>${i + 1}</td><td>${u.name}</td><td>${u.xp}</td><td>${u.level}</td></tr>`).join("");
}

function findNextLesson() {
  for (const course of catalog.courses) {
    for (let i = 0; i < course.lessons.length; i += 1) {
      if (!currentUser.completedLessons[`${course.id}:${i}`]) return { course, lesson: course.lessons[i], index: i };
    }
  }
  return null;
}

function bounceHeader() {
  ["header-level", "header-xp", "header-streak"].forEach((id) => {
    const el = document.getElementById(id);
    el.classList.remove("bounce");
    void el.offsetWidth;
    el.classList.add("bounce");
  });
}

// Auth handlers
const authForm = document.getElementById("auth-form");
authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("auth-name").value.trim();
  const email = document.getElementById("auth-email").value.trim().toLowerCase();
  const password = document.getElementById("auth-password").value;

  const user = db.users.find((u) => u.email === email);
  if (user) {
    alert("Account exists. Use Log In.");
    return;
  }
  currentUser = newUser({ name, email, password });
  upsertUser(currentUser);
  setLoggedInUI(true);
  renderAll();
});

document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("auth-email").value.trim().toLowerCase();
  const password = document.getElementById("auth-password").value;
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) {
    alert("Invalid credentials.");
    return;
  }
  currentUser = user;
  setLoggedInUI(true);
  renderAll();
});

// Navigation and lesson actions
navButtons.forEach((btn) => btn.addEventListener("click", () => showScreen(btn.dataset.screen)));
document.getElementById("back-courses-btn").addEventListener("click", () => showScreen("courses-screen"));
document.getElementById("next-lesson-btn").addEventListener("click", () => {
  if (!currentLessonContext) return;
  const { courseId, lessonIndex } = currentLessonContext;
  const course = catalog.courses.find((c) => c.id === courseId);
  const nextIndex = Math.min(lessonIndex + 1, course.lessons.length - 1);
  openLesson(courseId, nextIndex);
});
document.getElementById("start-recommended").addEventListener("click", () => {
  const next = findNextLesson();
  if (next) openLesson(next.course.id, next.index);
  else showScreen("courses-screen");
});

// Financial tools

document.getElementById("calc-budget").addEventListener("click", () => {
  const income = Number(document.getElementById("income").value);
  const expenses = Number(document.getElementById("expenses").value);
  if (!income || expenses < 0) return;
  const remaining = income - expenses;
  document.getElementById("budget-result").textContent = remaining >= 0
    ? `You can save $${remaining.toFixed(2)} this month.`
    : `You're over budget by $${Math.abs(remaining).toFixed(2)}.`;
});

document.getElementById("calc-interest").addEventListener("click", () => {
  const principal = Number(document.getElementById("principal").value);
  const rate = Number(document.getElementById("rate").value) / 100;
  const years = Number(document.getElementById("years").value);
  if (!principal || !rate || !years) return;
  const future = principal * (1 + rate) ** years;
  document.getElementById("interest-result").textContent = `Estimated future value: $${future.toFixed(2)}`;
});

document.getElementById("calc-goal").addEventListener("click", () => {
  const goal = Number(document.getElementById("goal").value);
  const monthly = Number(document.getElementById("monthly-save").value);
  if (!goal || !monthly) return;
  const months = Math.ceil(goal / monthly);
  document.getElementById("goal-result").textContent = `At this pace: ${months} month(s) to reach your goal.`;
});

setLoggedInUI(false);
