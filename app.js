/* =========================================================
   QUESTION ARCHIVE — SUPABASE APP
   ========================================================= */


/* =========================================================
   PUBLIC SUPABASE SETTINGS
   ========================================================= */

const SUPABASE_URL =
  "https://ezzvciyzqpgbbokopvzx.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_8LtNCb9mSVJutvGk7mBJRA_nfG3gd4f";

const STORAGE_BUCKET = "question-media";

const TABLES = {
  profiles: "profiles",
  chapters: "chapters",
  questions: "questions",
  categories: "categories",
  settings: "site_settings"
};


/* =========================================================
   STATE
   ========================================================= */

let supabase = null;

let currentUser = null;
let currentProfile = null;

let chapters = [];
let questions = [];
let categories = [];

let siteSettings = {};

let selectedChapter = null;
let selectedQuestion = null;
let selectedCategory = null;

let editorType = null;
let editingId = null;

let searchTimer = null;


/* =========================================================
   DOM
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];


const authScreen = $("#authScreen");
const appShell = $("#appShell");

const loginForm = $("#loginForm");
const emailInput = $("#email");
const passwordInput = $("#password");
const togglePassword = $("#togglePassword");
const authStatus = $("#authStatus");

const adminLoginButton = $("#adminLoginButton");
const mainNav = $("#mainNav");

const adminNavButton = $("#adminNavButton");
const logoutButton = $("#logoutButton");

const userRoleBadge = $("#userRoleBadge");

const chaptersGrid = $("#chaptersGrid");
const chaptersEmpty = $("#chaptersEmpty");

const questionsSection = $("#questionsSection");
const selectedChapterTitle = $("#selectedChapterTitle");
const selectedChapterDescription = $("#selectedChapterDescription");

const questionsList = $("#questionsList");
const questionsEmpty = $("#questionsEmpty");

const searchInput = $("#searchInput");
const categoryFilter = $("#categoryFilter");

const searchResults = $("#searchResults");
const searchEmpty = $("#searchEmpty");

const generalWhatsApp = $("#generalWhatsApp");
const contactNumberLabel = $("#contactNumberLabel");

const footerYear = $("#footerYear");

const adminOverlay = $("#adminOverlay");
const closeAdmin = $("#closeAdmin");

const editorModal = $("#editorModal");
const closeEditor = $("#closeEditor");
const editorForm = $("#editorForm");

const editorTitle = $("#editorTitle");
const editorKicker = $("#editorKicker");

const toastRegion = $("#toastRegion");


/* =========================================================
   BOOT
   ========================================================= */

document.addEventListener("DOMContentLoaded", boot);


async function boot() {

  footerYear.textContent =
    new Date().getFullYear();


  bindStaticEvents();


  if (!isSupabaseConfigured()) {

    showConfigMessage();

    return;
  }


  supabase =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );


  /*
   * الطالب يدخل مباشرة.
   */

  authScreen.classList.add("hidden");

  appShell.classList.remove("hidden");

  userRoleBadge.textContent = "STUDENT";

  adminNavButton.classList.add("hidden");

  logoutButton.classList.add("hidden");


  /*
   * تحميل المحتوى العام.
   */

  await refreshPublicContent();


  /*
   * التحقق هل يوجد Admin مسجل بالفعل.
   */

  const {
    data: { session }
  } = await supabase.auth.getSession();


  if (session?.user) {

    await loadAdminSession(session.user);
  }


  /*
   * متابعة حالة Auth.
   */

  supabase.auth.onAuthStateChange(
    async (event, session) => {

      if (event === "SIGNED_OUT") {

        currentUser = null;
        currentProfile = null;

        adminNavButton.classList.add("hidden");

        logoutButton.classList.add("hidden");

        userRoleBadge.textContent = "STUDENT";

        return;
      }


      if (session?.user) {

        await loadAdminSession(session.user);
      }

    }
  );
}


/* =========================================================
   CONFIG
   ========================================================= */

function isSupabaseConfigured() {

  return (
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("YOUR_SUPABASE") &&
    !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE")
  );
}


function showConfigMessage() {

  if (!authStatus) return;

  authStatus.textContent =
    "أكمل إعداد SUPABASE_URL و SUPABASE_ANON_KEY في بداية app.js.";

  authStatus.className = "form-status";
}


/* =========================================================
   PUBLIC CONTENT
   ========================================================= */

async function refreshPublicContent() {

  await Promise.all([
    loadChapters(),
    loadQuestions(),
    loadCategories(),
    loadSettings()
  ]);


  renderChapters();

  renderCategories();

  renderSearchResults();

  updateStats();

  applyContactSettings();
}


/* =========================================================
   ADMIN SESSION
   ========================================================= */

async function loadAdminSession(user) {

  if (!supabase || !user) return;


  const {
    data: profile,
    error
  } = await supabase
    .from(TABLES.profiles)
    .select(
      "id, email, role, display_name"
    )
    .eq("id", user.id)
    .single();


  /*
   * إذا كان الحساب ليس Admin
   * يبقى المستخدم طالبًا.
   */

  if (
    error ||
    !profile ||
    profile.role !== "admin"
  ) {

    currentUser = null;
    currentProfile = null;

    adminNavButton.classList.add("hidden");

    logoutButton.classList.add("hidden");

    userRoleBadge.textContent = "STUDENT";

    return;
  }


  /*
   * Admin صحيح.
   */

  currentUser = user;

  currentProfile = profile;

  userRoleBadge.textContent = "ADMIN";

  adminNavButton.classList.remove("hidden");

  logoutButton.classList.remove("hidden");

  renderAdminLists();
}


/* =========================================================
   OPTIONAL ADMIN LOGIN
   =========================================================
   يمكن استدعاء هذه الدالة من أي صفحة Admin مستقبلًا.
   ========================================================= */

async function adminLogin(email, password) {

  if (!supabase) {

    showToast(
      "Supabase غير مُعد.",
      "error"
    );

    return false;
  }


  const {
    data,
    error
  } = await supabase.auth.signInWithPassword({
    email,
    password
  });


  if (error) {

    showToast(
      getAuthError(error),
      "error"
    );

    return false;
  }


  if (!data.user) {

    showToast(
      "تعذر تسجيل الدخول.",
      "error"
    );

    return false;
  }


  const {
    data: profile,
    error: profileError
  } = await supabase
    .from(TABLES.profiles)
    .select(
      "id, email, role, display_name"
    )
    .eq("id", data.user.id)
    .single();


  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {

    await supabase.auth.signOut();

    showToast(
      "هذا الحساب ليس Admin.",
      "error"
    );

    return false;
  }


  await loadAdminSession(data.user);

  return true;
}


/* =========================================================
   AUTH HELPERS
   ========================================================= */

function setAuthStatus(
  message,
  error = false
) {

  if (!authStatus) return;

  authStatus.textContent = message;

  authStatus.style.color =
    error
      ? "#c98269"
      : "#b39257";
}


function getAuthError(error) {

  const message =
    String(error?.message || "");


  if (
    message
      .toLowerCase()
      .includes("invalid login")
  ) {

    return "بيانات الدخول غير صحيحة.";
  }


  if (
    message
      .toLowerCase()
      .includes("email not confirmed")
  ) {

    return "يجب تأكيد البريد الإلكتروني أولًا.";
  }


  return (
    "تعذر تسجيل الدخول. تحقق من البيانات وإعداد Supabase."
  );
}


/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadChapters() {

  const {
    data,
    error
  } = await supabase
    .from(TABLES.chapters)
    .select("*")
    .order("sort_order", {
      ascending: true
    })
    .order("created_at", {
      ascending: true
    });


  if (error) {

    showToast(
      "تعذر تحميل Chapters.",
      "error"
    );

    return;
  }


  chapters = data || [];
}


async function loadQuestions() {

  const {
    data,
    error
  } = await supabase
    .from(TABLES.questions)
    .select(`
      *,
      chapters:chapter_id (
        id,
        name
      ),
      categories:category_id (
        id,
        name
      )
    `)
    .order("sort_order", {
      ascending: true
    })
    .order("created_at", {
      ascending: true
    });


  if (error) {

    showToast(
      "تعذر تحميل الأسئلة.",
      "error"
    );

    return;
  }


  questions = data || [];
}


async function loadCategories() {

  const {
    data,
    error
  } = await supabase
    .from(TABLES.categories)
    .select("*")
    .order("name", {
      ascending: true
    });


  if (error) {

    showToast(
      "تعذر تحميل التصنيفات.",
      "error"
    );

    return;
  }


  categories = data || [];
}


async function loadSettings() {

  const {
    data,
    error
  } = await supabase
    .from(TABLES.settings)
    .select("*");


  if (error) {

    showToast(
      "تعذر تحميل إعدادات الموقع.",
      "error"
    );

    return;
  }


  siteSettings = {};


  (data || []).forEach(
    (row) => {

      siteSettings[row.key] =
        row.value;

    }
  );
}


/* =========================================================
   CHAPTERS
   ========================================================= */

function renderChapters() {

  chaptersGrid.innerHTML = "";


  if (!chapters.length) {

    chaptersEmpty.classList.remove(
      "hidden"
    );

    return;
  }


  chaptersEmpty.classList.add(
    "hidden"
  );


  chapters.forEach(
    (chapter, index) => {

      const count =
        questions.filter(
          (q) =>
            q.chapter_id === chapter.id
        ).length;


      const article =
        document.createElement(
          "article"
        );


      article.className =
        "chapter-card reveal";


      article.innerHTML = `
        <span class="chapter-number">
          CHAPTER ${String(index + 1).padStart(2, "0")}
        </span>

        <h3>
          ${escapeHTML(chapter.name)}
        </h3>

        <p>
          ${escapeHTML(
            chapter.description ||
            "قسم من الأرشيف التعليمي."
          )}
        </p>

        <div class="chapter-meta">

          <span>
            ${count}
            QUESTION${count === 1 ? "" : "S"}
          </span>

          <button
            class="chapter-open"
            type="button">
            OPEN →
          </button>

        </div>
      `;


      article
        .querySelector(
          ".chapter-open"
        )
        .addEventListener(
          "click",
          () => {
            openChapter(chapter.id);
          }
        );


      article.addEventListener(
        "click",
        (event) => {

          if (
            !event.target.closest(
              "button"
            )
          ) {

            openChapter(chapter.id);
          }

        }
      );


      chaptersGrid.appendChild(
        article
      );

    }
  );


  observeReveals();
}


function openChapter(chapterId) {

  selectedChapter =
    chapters.find(
      (chapter) =>
        chapter.id === chapterId
    ) || null;


  if (!selectedChapter) return;


  selectedChapterTitle.textContent =
    selectedChapter.name;


  selectedChapterDescription.textContent =
    selectedChapter.description || "";


  const chapterQuestions =
    questions.filter(
      (q) =>
        q.chapter_id === chapterId
    );


  renderQuestions(
    chapterQuestions
  );


  questionsSection.classList.remove(
    "hidden"
  );


  questionsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================================================
   QUESTIONS
   ========================================================= */

function renderQuestions(list) {

  questionsList.innerHTML = "";


  if (!list.length) {

    questionsEmpty.classList.remove(
      "hidden"
    );

    return;
  }


  questionsEmpty.classList.add(
    "hidden"
  );


  list.forEach(
    (question, index) => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "question-card";


      card.id =
        `question-${question.id}`;


      const imageHtml =
        question.image_url
          ? `
            <div class="question-image">
              <img
                src="${escapeAttribute(
                  question.image_url
                )}"
                alt="${escapeAttribute(
                  question.title
                )}"
                loading="lazy">
            </div>
          `
          : "";


      const videoHtml =
        buildVideoEmbed(
          question.video_url
        );


      card.innerHTML = `
        <div class="question-top">

          <div>

            <span class="question-index">
              QUESTION ${String(index + 1).padStart(2, "0")}
            </span>

            <h3>
              ${escapeHTML(
                question.title
              )}
            </h3>

          </div>

          <span class="question-index">
            ${escapeHTML(
              question.categories?.name || ""
            )}
          </span>

        </div>


        <p class="question-text">
          ${escapeHTML(
            question.question
          )}
        </p>


        ${imageHtml}

        ${videoHtml}


        <div class="answer-block">

          <button
            class="small-action toggle-answer"
            type="button"
            aria-expanded="false">
            SHOW ANSWER
          </button>

          <div class="reveal-panel">

            <div>

              <p class="question-answer">
                ${escapeHTML(
                  question.answer ||
                  "لا توجد إجابة مضافة."
                )}
              </p>

            </div>

          </div>

        </div>


        <div class="explanation-block">

          <button
            class="small-action toggle-explanation"
            type="button"
            aria-expanded="false">
            SHOW EXPLANATION
          </button>

          <div class="reveal-panel">

            <div>

              <p class="question-explanation">
                ${formatRichText(
                  question.explanation ||
                  "لا يوجد شرح مضاف."
                )}
              </p>

            </div>

          </div>

        </div>


        <div class="question-actions">

          <button
            class="small-action copy-question"
            type="button">
            COPY QUESTION
          </button>

          <button
            class="small-action contact"
            type="button">
            REPORT / CONTACT
          </button>

        </div>
      `;


      const answerButton =
        card.querySelector(
          ".toggle-answer"
        );


      const panels =
        card.querySelectorAll(
          ".reveal-panel"
        );


      const answerPanel =
        panels[0];


      answerButton.addEventListener(
        "click",
        () => {

          const open =
            answerPanel.classList.toggle(
              "open"
            );


          answerButton.setAttribute(
            "aria-expanded",
            String(open)
          );


          answerButton.textContent =
            open
              ? "HIDE ANSWER"
              : "SHOW ANSWER";

        }
      );


      const explanationButton =
        card.querySelector(
          ".toggle-explanation"
        );


      const explanationPanel =
        panels[1];


      explanationButton.addEventListener(
        "click",
        () => {

          const open =
            explanationPanel.classList.toggle(
              "open"
            );


          explanationButton.setAttribute(
            "aria-expanded",
            String(open)
          );


          explanationButton.textContent =
            open
              ? "HIDE EXPLANATION"
              : "SHOW EXPLANATION";

        }
      );


      card
        .querySelector(
          ".copy-question"
        )
        .addEventListener(
          "click",
          async () => {

            const text =
              buildCopyText(
                question
              );


            try {

              await navigator.clipboard.writeText(
                text
              );

              showToast(
                "QUESTION COPIED",
                "success"
              );

            } catch {

              fallbackCopy(text);

            }

          }
        );


      card
        .querySelector(
          ".contact"
        )
        .addEventListener(
          "click",
          () => {
            openWhatsApp(question);
          }
        );


      questionsList.appendChild(
        card
      );

    }
  );
}


function buildCopyText(question) {

  return [
    question.chapters?.name
      ? `Chapter: ${question.chapters.name}`
      : "",

    `Question: ${question.title}`,

    "",

    question.question || "",

    question.answer
      ? `\nAnswer:\n${question.answer}`
      : ""

  ]
    .filter(Boolean)
    .join("\n");
}


function fallbackCopy(text) {

  const textarea =
    document.createElement(
      "textarea"
    );


  textarea.value = text;

  textarea.style.position =
    "fixed";

  textarea.style.opacity =
    "0";


  document.body.appendChild(
    textarea
  );


  textarea.select();


  try {

    document.execCommand(
      "copy"
    );

    showToast(
      "QUESTION COPIED",
      "success"
    );

  } catch {

    showToast(
      "تعذر النسخ تلقائيًا.",
      "error"
    );

  }


  textarea.remove();
}


/* =========================================================
   SEARCH + CATEGORIES
   ========================================================= */

function renderCategories() {

  categoryFilter.innerHTML =
    `<option value="">كل التصنيفات</option>`;


  categories.forEach(
    (category) => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        category.id;


      option.textContent =
        category.name;


      categoryFilter.appendChild(
        option
      );

    }
  );
}


function renderSearchResults() {

  const term =
    searchInput.value
      .trim()
      .toLowerCase();


  const categoryId =
    categoryFilter.value;


  if (!term && !categoryId) {

    searchResults.innerHTML = "";

    searchEmpty.classList.add(
      "hidden"
    );

    return;
  }


  const results =
    questions.filter(
      (question) => {

        const searchable = [
          question.title,
          question.question,
          question.chapters?.name,
          question.categories?.name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        const matchesTerm =
          !term ||
          searchable.includes(term);


        const matchesCategory =
          !categoryId ||
          question.category_id ===
            categoryId;


        return (
          matchesTerm &&
          matchesCategory
        );
      }
    );


  searchResults.innerHTML =
    results
      .map(
        (question) => `
          <button
            class="search-result"
            type="button"
            data-question-id="${escapeAttribute(
              question.id
            )}">

            <span>
              ${escapeHTML(
                question.chapters?.name ||
                "ARCHIVE"
              )}
            </span>

            <h3>
              ${escapeHTML(
                question.title
              )}
            </h3>

            <p>
              ${escapeHTML(
                (
                  question.question ||
                  ""
                ).slice(0, 180)
              )}
              ${
                question.question?.length > 180
                  ? "…"
                  : ""
              }
            </p>

          </button>
        `
      )
      .join("");


  searchResults
    .querySelectorAll(
      "[data-question-id]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const question =
              questions.find(
                (q) =>
                  String(q.id) ===
                  String(
                    button.dataset.questionId
                  )
              );


            if (!question) return;


            openChapter(
              question.chapter_id
            );


            requestAnimationFrame(
              () => {

                document
                  .getElementById(
                    `question-${question.id}`
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                  });

              }
            );

          }
        );

      }
    );


  searchEmpty.classList.toggle(
    "hidden",
    results.length > 0
  );
}


searchInput.addEventListener(
  "input",
  () => {

    clearTimeout(
      searchTimer
    );


    searchTimer =
      setTimeout(
        renderSearchResults,
        120
      );

  }
);


categoryFilter.addEventListener(
  "change",
  renderSearchResults
);


/* =========================================================
   WHATSAPP
   ========================================================= */

function applyContactSettings() {

  const number =
    normalizePhone(
      siteSettings.whatsapp_number ||
      ""
    );


  contactNumberLabel.textContent =
    number
      ? `WhatsApp: ${number}`
      : "رقم WhatsApp غير مُعد بعد.";
}


generalWhatsApp.addEventListener(
  "click",
  () => openWhatsApp()
);


function openWhatsApp(question = null) {

  const number =
    normalizePhone(
      siteSettings.whatsapp_number ||
      ""
    );


  if (!number) {

    showToast(
      "لم يتم إعداد رقم WhatsApp من لوحة الإدارة.",
      "error"
    );

    return;
  }


  let message =
    siteSettings.whatsapp_message ||
    "مرحبًا، أحتاج إلى المساعدة في موقع Question Archive.";


  if (question) {

    message +=
      `\n\nChapter: ${
        question.chapters?.name ||
        "غير محدد"
      }\nQuestion: ${
        question.title
      }`;
  }


  const url =
    `https://wa.me/${number}?text=${encodeURIComponent(
      message
    )}`;


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}


function normalizePhone(value) {

  return String(value)
    .replace(/[^\d]/g, "");
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

adminNavButton.addEventListener(
  "click",
  async () => {

    if (
      currentProfile?.role !==
      "admin"
    ) {

      showToast(
        "غير مصرح لك بالدخول.",
        "error"
      );

      return;
    }


    await refreshPublicContent();

    renderAdminLists();

    openAdminPanel();

  }
);


logoutButton.addEventListener(
  "click",
  async () => {

    if (!supabase) return;

    await supabase.auth.signOut();

    closeAdminPanel();

    showToast(
      "تم تسجيل الخروج.",
      "success"
    );

  }
);


closeAdmin.addEventListener(
  "click",
  closeAdminPanel
);


function openAdminPanel() {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  adminOverlay.classList.remove(
    "hidden"
  );


  adminOverlay.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "modal-open"
  );


  showAdminTab(
    "overview"
  );
}


function closeAdminPanel() {

  adminOverlay.classList.add(
    "hidden"
  );


  adminOverlay.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "modal-open"
  );


  closeEditorModal();
}


/* =========================================================
   ADMIN TABS
   ========================================================= */

$$(".admin-tab").forEach(
  (tab) => {

    tab.addEventListener(
      "click",
      () => {

        showAdminTab(
          tab.dataset.adminTab
        );

      }
    );

  }
);


function showAdminTab(tabName) {

  $$(".admin-tab").forEach(
    (tab) => {

      tab.classList.toggle(
        "active",
        tab.dataset.adminTab ===
          tabName
      );

    }
  );


  $$(".admin-panel").forEach(
    (panel) => {

      panel.classList.toggle(
        "active",
        panel.dataset.adminPanel ===
          tabName
      );

    }
  );
}


function updateStats() {

  $("#statChapters").textContent =
    chapters.length;


  $("#statQuestions").textContent =
    questions.length;


  $("#statCategories").textContent =
    categories.length;
}


/* =========================================================
   ADMIN LISTS
   ========================================================= */

function renderAdminLists() {

  renderAdminChapters();

  renderAdminQuestions();

  renderAdminCategories();

  fillContactForm();
}


function renderAdminChapters() {

  const container =
    $("#adminChaptersList");


  if (!container) return;


  if (!chapters.length) {

    container.innerHTML = `
      <div class="admin-note">
        <p>
          لا توجد Chapters. استخدم ADD CHAPTER لإنشاء أول فصل.
        </p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    chapters
      .map(
        (chapter, index) => `

          <div class="admin-row">

            <div class="admin-row-main">

              <strong>
                ${escapeHTML(
                  chapter.name
                )}
              </strong>

              <span>
                ORDER ${
                  chapter.sort_order ??
                  index + 1
                }
                •
                ${
                  questions.filter(
                    (q) =>
                      q.chapter_id ===
                      chapter.id
                  ).length
                }
                questions
              </span>

            </div>


            <div class="admin-row-actions">

              <button
                class="admin-action"
                type="button"
                data-action="edit-chapter"
                data-id="${escapeAttribute(
                  chapter.id
                )}">
                EDIT
              </button>

              <button
                class="admin-action danger"
                type="button"
                data-action="delete-chapter"
                data-id="${escapeAttribute(
                  chapter.id
                )}">
                DELETE
              </button>

            </div>

          </div>
        `
      )
      .join("");


  bindAdminActions(
    container
  );
}


function renderAdminQuestions() {

  const container =
    $("#adminQuestionsList");


  if (!container) return;


  if (!questions.length) {

    container.innerHTML = `
      <div class="admin-note">
        <p>
          لا توجد أسئلة. استخدم ADD QUESTION لإنشاء أول سؤال.
        </p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    questions
      .map(
        (question) => `

          <div class="admin-row">

            <div class="admin-row-main">

              <strong>
                ${escapeHTML(
                  question.title
                )}
              </strong>

              <span>
                ${escapeHTML(
                  question.chapters?.name ||
                  "No chapter"
                )}
                •
                ${escapeHTML(
                  question.categories?.name ||
                  "No category"
                )}
              </span>

            </div>


            <div class="admin-row-actions">

              <button
                class="admin-action"
                type="button"
                data-action="edit-question"
                data-id="${escapeAttribute(
                  question.id
                )}">
                EDIT
              </button>

              <button
                class="admin-action danger"
                type="button"
                data-action="delete-question"
                data-id="${escapeAttribute(
                  question.id
                )}">
                DELETE
              </button>

            </div>

          </div>
        `
      )
      .join("");


  bindAdminActions(
    container
  );
}


function renderAdminCategories() {

  const container =
    $("#adminCategoriesList");


  if (!container) return;


  if (!categories.length) {

    container.innerHTML = `
      <div class="admin-note">
        <p>
          لا توجد تصنيفات.
        </p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    categories
      .map(
        (category) => `

          <div class="admin-row">

            <div class="admin-row-main">

              <strong>
                ${escapeHTML(
                  category.name
                )}
              </strong>

              <span>
                ${
                  questions.filter(
                    (q) =>
                      q.category_id ===
                      category.id
                  ).length
                }
                questions
              </span>

            </div>


            <div class="admin-row-actions">

              <button
                class="admin-action"
                type="button"
                data-action="edit-category"
                data-id="${escapeAttribute(
                  category.id
                )}">
                EDIT
              </button>

              <button
                class="admin-action danger"
                type="button"
                data-action="delete-category"
                data-id="${escapeAttribute(
                  category.id
                )}">
                DELETE
              </button>

            </div>

          </div>
        `
      )
      .join("");


  bindAdminActions(
    container
  );
}


function bindAdminActions(
  container
) {

  container
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            handleAdminAction(
              button.dataset.action,
              button.dataset.id
            );

          }
        );

      }
    );
}


async function handleAdminAction(
  action,
  id
) {

  if (
    currentProfile?.role !==
    "admin"
  ) {

    showToast(
      "غير مصرح لك.",
      "error"
    );

    return;
  }


  if (
    action ===
    "edit-chapter"
  ) {

    openChapterEditor(id);
  }


  if (
    action ===
    "delete-chapter"
  ) {

    await deleteChapter(id);
  }


  if (
    action ===
    "edit-question"
  ) {

    openQuestionEditor(id);
  }


  if (
    action ===
    "delete-question"
  ) {

    await deleteQuestion(id);
  }


  if (
    action ===
    "edit-category"
  ) {

    openCategoryEditor(id);
  }


  if (
    action ===
    "delete-category"
  ) {

    await deleteCategory(id);
  }
}


/* =========================================================
   CHAPTER CRUD
   ========================================================= */

$("#addChapterButton")
  .addEventListener(
    "click",
    () => openChapterEditor()
  );


function openChapterEditor(
  id = null
) {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  editorType = "chapter";

  editingId = id;


  const item =
    id
      ? chapters.find(
          (chapter) =>
            chapter.id === id
        )
      : null;


  editorKicker.textContent =
    "CHAPTER EDITOR";


  editorTitle.textContent =
    id
      ? "EDIT CHAPTER"
      : "ADD NEW CHAPTER";


  editorForm.innerHTML = `

    <label for="editorName">
      CHAPTER NAME
    </label>

    <input
      id="editorName"
      name="name"
      required
      value="${escapeAttribute(
        item?.name || ""
      )}"
      placeholder="Chapter 01">


    <label for="editorDescription">
      DESCRIPTION
    </label>

    <textarea
      id="editorDescription"
      name="description"
      rows="4"
      placeholder="وصف مختصر للفصل..."
    >${escapeHTML(
      item?.description || ""
    )}</textarea>


    <label for="editorCover">
      COVER IMAGE URL
    </label>

    <input
      id="editorCover"
      name="cover_image_url"
      type="url"
      value="${escapeAttribute(
        item?.cover_image_url || ""
      )}"
      placeholder="https://...">


    <label for="editorOrder">
      ORDER
    </label>

    <input
      id="editorOrder"
      name="sort_order"
      type="number"
      min="0"
      step="1"
      value="${
        item?.sort_order ??
        chapters.length + 1
      }"
      required>


    <button
      class="archive-button primary"
      type="submit">

      ${
        id
          ? "SAVE CHANGES"
          : "SAVE CHAPTER"
      }

    </button>
  `;


  openEditorModal();
}


editorForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (
      currentProfile?.role !==
      "admin"
    ) {

      showToast(
        "غير مصرح لك.",
        "error"
      );

      return;
    }


    if (
      editorType ===
      "chapter"
    ) {

      await saveChapter();
    }


    if (
      editorType ===
      "question"
    ) {

      await saveQuestion();
    }


    if (
      editorType ===
      "category"
    ) {

      await saveCategory();
    }

  }
);


/* =========================================================
   SAVE CHAPTER
   ========================================================= */

async function saveChapter() {

  const form =
    new FormData(
      editorForm
    );


  const payload = {

    name:
      String(
        form.get("name")
      ).trim(),

    description:
      String(
        form.get("description") ||
        ""
      ).trim(),

    cover_image_url:
      String(
        form.get(
          "cover_image_url"
        ) || ""
      ).trim() || null,

    sort_order:
      Number(
        form.get(
          "sort_order"
        ) || 0
      )

  };


  if (!payload.name) {

    showToast(
      "اسم Chapter مطلوب.",
      "error"
    );

    return;
  }


  let response;


  if (editingId) {

    response =
      await supabase
        .from(
          TABLES.chapters
        )
        .update(payload)
        .eq(
          "id",
          editingId
        );

  } else {

    response =
      await supabase
        .from(
          TABLES.chapters
        )
        .insert({
          ...payload,
          created_by:
            currentUser.id
        });

  }


  if (response.error) {

    showToast(
      response.error.message,
      "error"
    );

    return;
  }


  closeEditorModal();

  await refreshPublicContent();

  renderAdminLists();

  showAdminTab(
    "chapters"
  );


  showToast(
    editingId
      ? "CHAPTER UPDATED"
      : "CHAPTER SAVED",
    "success"
  );
}


/* =========================================================
   DELETE CHAPTER
   ========================================================= */

async function deleteChapter(id) {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  const chapter =
    chapters.find(
      (item) =>
        item.id === id
    );


  if (!chapter) return;


  if (
    !window.confirm(
      `حذف Chapter "${chapter.name}"؟ سيتم حذف الأسئلة المرتبطة به أيضًا.`
    )
  ) {

    return;
  }


  const {
    error
  } = await supabase
    .from(
      TABLES.chapters
    )
    .delete()
    .eq(
      "id",
      id
    );


  if (error) {

    showToast(
      error.message,
      "error"
    );

    return;
  }


  if (
    selectedChapter?.id ===
    id
  ) {

    selectedChapter =
      null;

    questionsSection.classList.add(
      "hidden"
    );
  }


  await refreshPublicContent();

  renderAdminLists();


  showToast(
    "CHAPTER DELETED",
    "success"
  );
}


/* =========================================================
   QUESTION CRUD
   ========================================================= */

$("#addQuestionButton")
  .addEventListener(
    "click",
    () => openQuestionEditor()
  );


function openQuestionEditor(
  id = null
) {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  if (!chapters.length) {

    showToast(
      "أضف Chapter أولًا قبل إضافة سؤال.",
      "error"
    );

    showAdminTab(
      "chapters"
    );

    return;
  }


  editorType = "question";

  editingId = id;


  const item =
    id
      ? questions.find(
          (question) =>
            question.id === id
        )
      : null;


  editorKicker.textContent =
    "QUESTION EDITOR";


  editorTitle.textContent =
    id
      ? "EDIT QUESTION"
      : "ADD NEW QUESTION";


  editorForm.innerHTML = `

    <label for="editorChapter">
      CHAPTER
    </label>

    <select
      id="editorChapter"
      name="chapter_id"
      required>

      ${chapters
        .map(
          (chapter) => `

            <option
              value="${escapeAttribute(
                chapter.id
              )}"
              ${
                item?.chapter_id ===
                chapter.id
                  ? "selected"
                  : ""
              }>

              ${escapeHTML(
                chapter.name
              )}

            </option>
          `
        )
        .join("")}

    </select>


    <label for="editorQuestionTitle">
      QUESTION TITLE
    </label>

    <input
      id="editorQuestionTitle"
      name="title"
      required
      value="${escapeAttribute(
        item?.title || ""
      )}"
      placeholder="Question 01">


    <label for="editorQuestionText">
      QUESTION
    </label>

    <textarea
      id="editorQuestionText"
      name="question"
      rows="6"
      required
      placeholder="اكتب السؤال هنا..."
    >${escapeHTML(
      item?.question || ""
    )}</textarea>


    <label for="editorAnswer">
      ANSWER
    </label>

    <textarea
      id="editorAnswer"
      name="answer"
      rows="5"
      placeholder="اكتب الإجابة هنا..."
    >${escapeHTML(
      item?.answer || ""
    )}</textarea>


    <label for="editorExplanation">
      EXPLANATION
    </label>

    <textarea
      id="editorExplanation"
      name="explanation"
      rows="8"
      placeholder="اكتب الشرح التفصيلي هنا..."
    >${escapeHTML(
      item?.explanation || ""
    )}</textarea>


    <label for="editorCategory">
      CATEGORY
    </label>

    <select
      id="editorCategory"
      name="category_id">

      <option value="">
        بدون تصنيف
      </option>

      ${categories
        .map(
          (category) => `

            <option
              value="${escapeAttribute(
                category.id
              )}"
              ${
                item?.category_id ===
                category.id
                  ? "selected"
                  : ""
              }>

              ${escapeHTML(
                category.name
              )}

            </option>
          `
        )
        .join("")}

    </select>


    <label for="editorImageFile">
      IMAGE UPLOAD
    </label>

    <input
      id="editorImageFile"
      name="image_file"
      type="file"
      accept="image/*">


    <p class="file-note">
      الصورة ترفع إلى Supabase Storage. إذا لم تختر صورة جديدة، تبقى الصورة الحالية.
    </p>


    ${
      item?.image_url
        ? `
          <p class="file-note">
            الصورة الحالية:
            ${escapeHTML(
              item.image_url
            )}
          </p>
        `
        : ""
    }


    <label for="editorImageUrl">
      OR IMAGE URL
    </label>

    <input
      id="editorImageUrl"
      name="image_url"
      type="url"
      value="${escapeAttribute(
        item?.image_url || ""
      )}"
      placeholder="https://...">


    <label for="editorVideoUrl">
      VIDEO URL / EMBED URL
    </label>

    <input
      id="editorVideoUrl"
      name="video_url"
      type="url"
      value="${escapeAttribute(
        item?.video_url || ""
      )}"
      placeholder="https://www.youtube.com/embed/...">


    <label for="editorVideoFile">
      VIDEO UPLOAD (OPTIONAL)
    </label>

    <input
      id="editorVideoFile"
      name="video_file"
      type="file"
      accept="video/*">


    <p class="file-note">
      لملفات الفيديو الكبيرة، يفضّل استخدام رابط فيديو قابل للتضمين بدل رفع ملف ضخم.
    </p>


    <label for="editorOrder">
      ORDER
    </label>

    <input
      id="editorOrder"
      name="sort_order"
      type="number"
      min="0"
      step="1"
      value="${
        item?.sort_order ??
        questions.filter(
          (q) =>
            q.chapter_id ===
            (
              item?.chapter_id ||
              chapters[0].id
            )
        ).length + 1
      }"
      required>


    <button
      class="archive-button primary"
      type="submit">

      ${
        id
          ? "SAVE CHANGES"
          : "SAVE QUESTION"
      }

    </button>
  `;


  openEditorModal();
}


/* =========================================================
   SAVE QUESTION
   ========================================================= */

async function saveQuestion() {

  const form =
    new FormData(
      editorForm
    );


  const chapterId =
    String(
      form.get(
        "chapter_id"
      ) || ""
    );


  const title =
    String(
      form.get(
        "title"
      ) || ""
    ).trim();


  const questionText =
    String(
      form.get(
        "question"
      ) || ""
    ).trim();


  if (
    !chapterId ||
    !title ||
    !questionText
  ) {

    showToast(
      "Chapter وعنوان السؤال ونص السؤال مطلوبة.",
      "error"
    );

    return;
  }


  const current =
    editingId
      ? questions.find(
          (q) =>
            q.id === editingId
        )
      : null;


  let imageUrl =
    String(
      form.get(
        "image_url"
      ) || ""
    ).trim() ||
    current?.image_url ||
    null;


  let videoUrl =
    String(
      form.get(
        "video_url"
      ) || ""
    ).trim() ||
    current?.video_url ||
    null;


  const imageFile =
    form.get(
      "image_file"
    );


  if (
    imageFile instanceof File &&
    imageFile.size > 0
  ) {

    const result =
      await uploadMedia(
        imageFile,
        "images"
      );


    if (!result) return;


    imageUrl = result;
  }


  const videoFile =
    form.get(
      "video_file"
    );


  if (
    videoFile instanceof File &&
    videoFile.size > 0
  ) {

    const result =
      await uploadMedia(
        videoFile,
        "videos"
      );


    if (!result) return;


    videoUrl = result;
  }


  const payload = {

    chapter_id:
      chapterId,

    category_id:
      String(
        form.get(
          "category_id"
        ) || ""
      ) || null,

    title,

    question:
      questionText,

    answer:
      String(
        form.get(
          "answer"
        ) || ""
      ).trim(),

    explanation:
      String(
        form.get(
          "explanation"
        ) || ""
      ).trim(),

    image_url:
      imageUrl,

    video_url:
      videoUrl,

    sort_order:
      Number(
        form.get(
          "sort_order"
        ) || 0
      )

  };


  let response;


  if (editingId) {

    response =
      await supabase
        .from(
          TABLES.questions
        )
        .update(
          payload
        )
        .eq(
          "id",
          editingId
        );

  } else {

    response =
      await supabase
        .from(
          TABLES.questions
        )
        .insert({
          ...payload,
          created_by:
            currentUser.id
        });

  }


  if (response.error) {

    showToast(
      response.error.message,
      "error"
    );

    return;
  }


  closeEditorModal();

  await refreshPublicContent();

  renderAdminLists();


  if (
    selectedChapter?.id ===
    chapterId
  ) {

    openChapter(
      chapterId
    );
  }


  showAdminTab(
    "questions"
  );


  showToast(
    editingId
      ? "QUESTION UPDATED"
      : "QUESTION SAVED",
    "success"
  );
}


/* =========================================================
   STORAGE
   ========================================================= */

async function uploadMedia(
  file,
  folder
) {

  const safeName =
    sanitizeFileName(
      file.name
    );


  const path =
    `${folder}/${currentUser.id}/${crypto.randomUUID()}-${safeName}`;


  const {
    error
  } = await supabase.storage
    .from(
      STORAGE_BUCKET
    )
    .upload(
      path,
      file,
      {
        cacheControl: "3600",
        upsert: false
      }
    );


  if (error) {

    showToast(
      `فشل رفع الملف: ${error.message}`,
      "error"
    );

    return null;
  }


  const {
    data
  } =
    supabase.storage
      .from(
        STORAGE_BUCKET
      )
      .getPublicUrl(
        path
      );


  return data.publicUrl;
}


/* =========================================================
   DELETE QUESTION
   ========================================================= */

async function deleteQuestion(id) {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  const question =
    questions.find(
      (item) =>
        item.id === id
    );


  if (!question) return;


  if (
    !window.confirm(
      `حذف السؤال "${question.title}"؟`
    )
  ) {

    return;
  }


  const {
    error
  } = await supabase
    .from(
      TABLES.questions
    )
    .delete()
    .eq(
      "id",
      id
    );


  if (error) {

    showToast(
      error.message,
      "error"
    );

    return;
  }


  await refreshPublicContent();

  renderAdminLists();


  if (selectedChapter?.id) {

    openChapter(
      selectedChapter.id
    );
  }


  showToast(
    "QUESTION DELETED",
    "success"
  );
}


/* =========================================================
   CATEGORY CRUD
   ========================================================= */

$("#addCategoryButton")
  .addEventListener(
    "click",
    () => openCategoryEditor()
  );


function openCategoryEditor(
  id = null
) {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  editorType = "category";

  editingId = id;


  const item =
    id
      ? categories.find(
          (category) =>
            category.id === id
        )
      : null;


  editorKicker.textContent =
    "CATEGORY EDITOR";


  editorTitle.textContent =
    id
      ? "EDIT CATEGORY"
      : "ADD CATEGORY";


  editorForm.innerHTML = `

    <label for="editorCategoryName">
      CATEGORY NAME
    </label>

    <input
      id="editorCategoryName"
      name="name"
      required
      value="${escapeAttribute(
        item?.name || ""
      )}"
      placeholder="Cairo Japanese">


    <label for="editorCategoryDescription">
      DESCRIPTION
    </label>

    <textarea
      id="editorCategoryDescription"
      name="description"
      rows="4"
      placeholder="وصف التصنيف..."
    >${escapeHTML(
      item?.description || ""
    )}</textarea>


    <button
      class="archive-button primary"
      type="submit">

      ${
        id
          ? "SAVE CHANGES"
          : "SAVE CATEGORY"
      }

    </button>
  `;


  openEditorModal();
}


/* =========================================================
   SAVE CATEGORY
   ========================================================= */

async function saveCategory() {

  const form =
    new FormData(
      editorForm
    );


  const name =
    String(
      form.get(
        "name"
      ) || ""
    ).trim();


  if (!name) {

    showToast(
      "اسم التصنيف مطلوب.",
      "error"
    );

    return;
  }


  const payload = {

    name,

    description:
      String(
        form.get(
          "description"
        ) || ""
      ).trim()

  };


  let response;


  if (editingId) {

    response =
      await supabase
        .from(
          TABLES.categories
        )
        .update(
          payload
        )
        .eq(
          "id",
          editingId
        );

  } else {

    response =
      await supabase
        .from(
          TABLES.categories
        )
        .insert({
          ...payload,
          created_by:
            currentUser.id
        });

  }


  if (response.error) {

    showToast(
      response.error.message,
      "error"
    );

    return;
  }


  closeEditorModal();

  await refreshPublicContent();

  renderAdminLists();

  showAdminTab(
    "categories"
  );


  showToast(
    editingId
      ? "CATEGORY UPDATED"
      : "CATEGORY SAVED",
    "success"
  );
}


/* =========================================================
   DELETE CATEGORY
   ========================================================= */

async function deleteCategory(id) {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  const category =
    categories.find(
      (item) =>
        item.id === id
    );


  if (!category) return;


  if (
    !window.confirm(
      `حذف التصنيف "${category.name}"؟`
    )
  ) {

    return;
  }


  const {
    error
  } = await supabase
    .from(
      TABLES.categories
    )
    .delete()
    .eq(
      "id",
      id
    );


  if (error) {

    showToast(
      error.message,
      "error"
    );

    return;
  }


  await refreshPublicContent();

  renderAdminLists();


  showToast(
    "CATEGORY DELETED",
    "success"
  );
}


/* =========================================================
   CONTACT SETTINGS
   ========================================================= */

function fillContactForm() {

  const numberInput =
    $("#whatsappNumber");

  const messageInput =
    $("#whatsappTemplate");


  if (numberInput) {

    numberInput.value =
      siteSettings.whatsapp_number ||
      "";
  }


  if (messageInput) {

    messageInput.value =
      siteSettings.whatsapp_message ||
      "مرحبًا، أحتاج إلى المساعدة في موقع Question Archive.";
  }
}


$("#contactSettingsForm")
  .addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      if (
        currentProfile?.role !==
        "admin"
      ) {

        showToast(
          "غير مصرح لك.",
          "error"
        );

        return;
      }


      const number =
        $("#whatsappNumber")
          .value
          .trim();


      const message =
        $("#whatsappTemplate")
          .value
          .trim();


      const settings = [

        {
          key:
            "whatsapp_number",

          value:
            number
        },

        {
          key:
            "whatsapp_message",

          value:
            message
        }

      ];


      for (
        const setting
        of settings
      ) {

        const {
          error
        } = await supabase
          .from(
            TABLES.settings
          )
          .upsert(
            {
              key:
                setting.key,

              value:
                setting.value,

              updated_by:
                currentUser.id,

              updated_at:
                new Date()
                  .toISOString()
            },
            {
              onConflict:
                "key"
            }
          );


        if (error) {

          showToast(
            error.message,
            "error"
          );

          return;
        }

      }


      await loadSettings();

      applyContactSettings();

      showToast(
        "CONTACT SETTINGS SAVED",
        "success"
      );

    }
  );


/* =========================================================
   EDITOR MODAL
   ========================================================= */

closeEditor.addEventListener(
  "click",
  closeEditorModal
);


editorModal.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      editorModal
    ) {

      closeEditorModal();
    }

  }
);


function openEditorModal() {

  if (
    currentProfile?.role !==
    "admin"
  ) return;


  editorModal.classList.remove(
    "hidden"
  );


  editorModal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "modal-open"
  );
}


function closeEditorModal() {

  editorModal.classList.add(
    "hidden"
  );


  editorModal.setAttribute(
    "aria-hidden",
    "true"
  );


  if (
    !adminOverlay.classList.contains(
      "hidden"
    )
  ) {

    document.body.classList.add(
      "modal-open"
    );

  } else {

    document.body.classList.remove(
      "modal-open"
    );

  }


  editorType = null;

  editingId = null;
}


/* =========================================================
   STATIC EVENTS
   ========================================================= */

function bindStaticEvents() {

  if (mobileMenuButton) {

    mobileMenuButton.addEventListener(
      "click",
      () => {

        mainNav.classList.toggle(
          "open"
        );

      }
    );

  }


  if (mainNav) {

    mainNav.addEventListener(
      "click",
      (event) => {

        if (
          event.target.closest(
            "a"
          )
        ) {

          mainNav.classList.remove(
            "open"
          );
        }

      }
    );

  }


  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key ===
        "Escape"
      ) {

        if (
          !editorModal.classList.contains(
            "hidden"
          )
        ) {

          closeEditorModal();

        } else if (
          !adminOverlay.classList.contains(
            "hidden"
          )
        ) {

          closeAdminPanel();

        } else {

          mainNav.classList.remove(
            "open"
          );

        }

      }

    }
  );


  observeReveals();
}


/* =========================================================
   VIDEO
   ========================================================= */

function buildVideoEmbed(url) {

  if (!url) return "";


  const clean =
    String(url).trim();


  if (
    clean.includes(
      "youtube.com/embed/"
    )
  ) {

    return `
      <div class="question-video">

        <iframe
          src="${escapeAttribute(
            clean
          )}"
          title="Question video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>

      </div>
    `;
  }


  if (
    clean.includes(
      "youtube.com/watch"
    ) ||
    clean.includes(
      "youtu.be/"
    )
  ) {

    const id =
      extractYouTubeId(
        clean
      );


    if (id) {

      return `
        <div class="question-video">

          <iframe
            src="https://www.youtube.com/embed/${escapeAttribute(
              id
            )}"
            title="Question video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>

        </div>
      `;
    }

  }


  if (
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(
      clean
    )
  ) {

    return `
      <div class="question-video">

        <video
          src="${escapeAttribute(
            clean
          )}"
          controls
          preload="metadata">
        </video>

      </div>
    `;
  }


  return "";
}


function extractYouTubeId(url) {

  try {

    const parsed =
      new URL(url);


    if (
      parsed.hostname.includes(
        "youtu.be"
      )
    ) {

      return parsed.pathname.slice(
        1
      );
    }


    return parsed.searchParams.get(
      "v"
    );

  } catch {

    return null;
  }
}


/* =========================================================
   TEXT
   ========================================================= */

function formatRichText(value) {

  return escapeHTML(
    value
  ).replace(
    /\n/g,
    "<br>"
  );
}


function sanitizeFileName(name) {

  return String(name)

    .normalize("NFKD")

    .replace(
      /[^\w.\-]+/g,
      "-"
    )

    .replace(
      /-+/g,
      "-"
    )

    .replace(
      /^-|-$/g,
      ""
    )

    .slice(
      0,
      100
    ) ||

    "file";
}


function escapeHTML(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}


function escapeAttribute(value) {

  return escapeHTML(value);
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = "success"
) {

  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    `toast ${type}`;


  toast.textContent =
    message;


  toastRegion.appendChild(
    toast
  );


  window.setTimeout(
    () => {

      toast.style.opacity =
        "0";

      toast.style.transform =
        "translateY(8px)";


      window.setTimeout(
        () => {

          toast.remove();

        },
        260
      );

    },
    2800
  );
}


/* =========================================================
   SCROLL REVEAL
   ========================================================= */

let revealObserver = null;


function observeReveals() {

  const elements =
    $$(".reveal:not(.observed)");


  if (
    !(
      "IntersectionObserver"
      in window
    )
  ) {

    elements.forEach(
      (element) => {

        element.classList.add(
          "visible"
        );

      }
    );

    return;
  }


  if (!revealObserver) {

    revealObserver =
      new IntersectionObserver(
        (
          entries,
          observer
        ) => {

          entries.forEach(
            (entry) => {

              if (
                entry.isIntersecting
              ) {

                entry.target.classList.add(
                  "visible"
                );

                entry.target.classList.add(
                  "observed"
                );

                observer.unobserve(
                  entry.target
                );
              }

            }
          );

        },
        {
          threshold: 0.1
        }
      );

  }


  elements.forEach(
    (element) => {

      revealObserver.observe(
        element
      );

    }
  );
}
