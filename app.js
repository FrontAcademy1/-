/* =========================================================
   QUESTION ARCHIVE — SUPABASE APP
   ========================================================= */

/* =========================================================
   SUPABASE CONFIG
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
   GLOBAL STATE
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
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [
  ...document.querySelectorAll(selector)
];


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const authScreen = $("#authScreen");
const appShell = $("#appShell");

const mobileMenuButton = $("#mobileMenuButton");
const mainNav = $("#mainNav");

const adminNavButton = $("#adminNavButton");

const adminLoginButton = $("#adminLoginButton");

const userRoleBadge = $("#userRoleBadge");

const footerYear = $("#footerYear");

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

const adminOverlay = $("#adminOverlay");
const closeAdmin = $("#closeAdmin");

const adminTabs = $$(".admin-tab");
const adminPanels = $$(".admin-panel");

const statChapters = $("#statChapters");
const statQuestions = $("#statQuestions");
const statCategories = $("#statCategories");

const adminChaptersList = $("#adminChaptersList");
const adminQuestionsList = $("#adminQuestionsList");
const adminCategoriesList = $("#adminCategoriesList");

const addChapterButton = $("#addChapterButton");
const addQuestionButton = $("#addQuestionButton");
const addCategoryButton = $("#addCategoryButton");

const contactSettingsForm = $("#contactSettingsForm");
const whatsappNumber = $("#whatsappNumber");
const whatsappTemplate = $("#whatsappTemplate");

const editorModal = $("#editorModal");
const editorTitle = $("#editorTitle");
const editorKicker = $("#editorKicker");
const editorForm = $("#editorForm");
const closeEditor = $("#closeEditor");

const toastRegion = $("#toastRegion");


/* =========================================================
   BOOT
   ========================================================= */

document.addEventListener("DOMContentLoaded", boot);


async function boot() {

  if (footerYear) {
    footerYear.textContent =
      new Date().getFullYear();
  }


  bindStaticEvents();


  if (!isSupabaseConfigured()) {
    showConfigMessage();
    return;
  }


  try {

    supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

  } catch (error) {

    console.error(error);

    showToast(
      "تعذر الاتصال بقاعدة البيانات.",
      "error"
    );

    return;
  }


  /*
   * الطالب يدخل الموقع مباشرة
   */

  authScreen?.classList.add("hidden");
  authScreen?.setAttribute("aria-hidden", "true");

  appShell?.classList.remove("hidden");

  userRoleBadge.textContent = "STUDENT";

  adminLoginButton?.classList.remove("hidden");

  adminNavButton?.classList.add("hidden");


  /*
   * تحميل المحتوى العام
   */

  await refreshPublicContent();


  /*
   * التحقق هل يوجد Admin session
   */

  try {

    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();


    if (session?.user) {

      await loadAdminSession(
        session.user
      );

    }

  } catch (error) {

    console.error(
      "Session check error:",
      error
    );

  }


  /*
   * مراقبة حالة تسجيل الدخول
   */

  supabase.auth.onAuthStateChange(
    async (event, session) => {

      if (event === "SIGNED_OUT") {

        currentUser = null;
        currentProfile = null;

        adminNavButton?.classList.add("hidden");

        adminLoginButton?.classList.remove("hidden");

        userRoleBadge.textContent = "STUDENT";

        return;
      }


      if (
        event === "SIGNED_IN" &&
        session?.user
      ) {

        await loadAdminSession(
          session.user
        );

      }

    }
  );

}


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

function isSupabaseConfigured() {

  return (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.includes("supabase.co")
  );

}


function showConfigMessage() {

  if (!appShell) return;

  appShell.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="empty-state">
          <div class="empty-mark">!</div>
          <h3>Supabase غير مضبوط</h3>
          <p>
            تأكد من وضع SUPABASE_URL و SUPABASE_ANON_KEY بشكل صحيح داخل app.js.
          </p>
        </div>
      </div>
    </section>
  `;

}


/* =========================================================
   ADMIN LOGIN
   ========================================================= */

/*
 * يفتح شاشة تسجيل دخول الأدمن فقط.
 */

function showAdminLogin() {

  if (!authScreen) return;

  authScreen.innerHTML = `
    <div class="auth-frame">

      <div class="auth-decoration">
        <span>QA</span>
      </div>

      <div class="auth-content">

        <span class="section-label">
          PRIVATE AREA
        </span>

        <h1>
          ADMIN LOGIN
        </h1>

        <p class="auth-description">
          تسجيل الدخول متاح للإدارة فقط.
        </p>

        <form
          id="adminLoginForm"
          class="auth-form"
          novalidate>

          <label for="adminEmail">
            EMAIL
          </label>

          <input
            id="adminEmail"
            name="email"
            type="email"
            autocomplete="username"
            placeholder="admin@example.com"
            required>


          <label for="adminPassword">
            PASSWORD
          </label>

          <div class="password-wrap">

            <input
              id="adminPassword"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              required>

            <button
              id="toggleAdminPassword"
              type="button"
              class="password-toggle">
              SHOW
            </button>

          </div>


          <button
            type="submit"
            class="archive-button primary auth-submit">

            LOGIN AS ADMIN

            <span class="button-mark">
              →
            </span>

          </button>


          <button
            id="cancelAdminLogin"
            type="button"
            class="text-button auth-cancel">

            BACK TO ARCHIVE

          </button>


          <div
            id="authStatus"
            class="auth-status"
            aria-live="polite">
          </div>

        </form>

      </div>

    </div>
  `;


  appShell?.classList.add("hidden");

  authScreen.classList.remove("hidden");

  authScreen.setAttribute(
    "aria-hidden",
    "false"
  );


  bindAdminLoginForm();

}


function bindAdminLoginForm() {

  const form = $("#adminLoginForm");

  const email = $("#adminEmail");

  const password = $("#adminPassword");

  const togglePassword =
    $("#toggleAdminPassword");

  const cancelButton =
    $("#cancelAdminLogin");

  const status =
    $("#authStatus");


  if (!form) return;


  /*
   * Show / Hide password
   */

  togglePassword?.addEventListener(
    "click",
    () => {

      if (
        password.type === "password"
      ) {

        password.type = "text";

        togglePassword.textContent =
          "HIDE";

      } else {

        password.type = "password";

        togglePassword.textContent =
          "SHOW";

      }

    }
  );


  /*
   * العودة للموقع
   */

  cancelButton?.addEventListener(
    "click",
    () => {

      closeAdminLogin();

    }
  );


  /*
   * Login
   */

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const emailValue =
        email.value.trim();

      const passwordValue =
        password.value;


      if (
        !emailValue ||
        !passwordValue
      ) {

        setAuthStatus(
          status,
          "اكتب البريد الإلكتروني وكلمة المرور.",
          "error"
        );

        return;
      }


      setAuthStatus(
        status,
        "جاري تسجيل الدخول...",
        "loading"
      );


      try {

        const {
          data,
          error
        } =
          await supabase.auth.signInWithPassword({
            email: emailValue,
            password: passwordValue
          });


        if (error) {

          setAuthStatus(
            status,
            getAuthError(error),
            "error"
          );

          return;
        }


        if (!data?.user) {

          setAuthStatus(
            status,
            "تعذر تسجيل الدخول.",
            "error"
          );

          return;
        }


        /*
         * التأكد أن الحساب Admin
         */

        const {
          data: profile,
          error: profileError
        } =
          await supabase
            .from(TABLES.profiles)
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();


        if (
          profileError ||
          !profile ||
          profile.role !== "admin"
        ) {

          await supabase.auth.signOut();


          setAuthStatus(
            status,
            "هذا الحساب ليس حساب Admin.",
            "error"
          );

          return;
        }


        /*
         * Admin verified
         */

        currentUser = data.user;

        currentProfile = profile;


        userRoleBadge.textContent =
          "ADMIN";


        adminLoginButton?.classList.add(
          "hidden"
        );


        adminNavButton?.classList.remove(
          "hidden"
        );


        authScreen.classList.add(
          "hidden"
        );

        authScreen.setAttribute(
          "aria-hidden",
          "true"
        );


        appShell.classList.remove(
          "hidden"
        );


        await refreshPublicContent();

        await renderAdminLists();


        showToast(
          "تم تسجيل دخول الأدمن بنجاح.",
          "success"
        );

      } catch (error) {

        console.error(error);

        setAuthStatus(
          status,
          "حدث خطأ أثناء تسجيل الدخول.",
          "error"
        );

      }

    }
  );

}


function closeAdminLogin() {

  authScreen?.classList.add("hidden");

  authScreen?.setAttribute(
    "aria-hidden",
    "true"
  );

  if (appShell) {
    appShell.classList.remove("hidden");
  }

}


/* =========================================================
   AUTH SESSION
   ========================================================= */

async function loadAdminSession(user) {

  if (!supabase || !user) return;


  try {

    const {
      data: profile,
      error
    } =
      await supabase
        .from(TABLES.profiles)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();


    if (
      error ||
      !profile ||
      profile.role !== "admin"
    ) {

      currentUser = null;

      currentProfile = null;

      adminNavButton?.classList.add(
        "hidden"
      );

      adminLoginButton?.classList.remove(
        "hidden"
      );

      userRoleBadge.textContent =
        "STUDENT";

      return;
    }


    currentUser = user;

    currentProfile = profile;


    userRoleBadge.textContent =
      "ADMIN";


    adminLoginButton?.classList.add(
      "hidden"
    );


    adminNavButton?.classList.remove(
      "hidden"
    );


    await renderAdminLists();

  } catch (error) {

    console.error(
      "Admin session error:",
      error
    );

  }

}


function isAdmin() {

  return (
    currentProfile &&
    currentProfile.role === "admin"
  );

}


/* =========================================================
   AUTH STATUS
   ========================================================= */

function setAuthStatus(
  element,
  message,
  type = ""
) {

  if (!element) return;

  element.textContent = message;

  element.className =
    `auth-status ${type}`;

}


function getAuthError(error) {

  if (!error) {
    return "حدث خطأ غير معروف.";
  }


  const message =
    String(error.message || "")
      .toLowerCase();


  if (
    message.includes("invalid login credentials")
  ) {

    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

  }


  if (
    message.includes("email not confirmed")
  ) {

    return "يجب تأكيد البريد الإلكتروني أولًا.";

  }


  if (
    message.includes("too many requests")
  ) {

    return "محاولات كثيرة. حاول مرة أخرى بعد قليل.";

  }


  return (
    error.message ||
    "تعذر تسجيل الدخول."
  );

}


/* =========================================================
   PUBLIC CONTENT
   ========================================================= */

async function refreshPublicContent() {

  if (!supabase) return;


  try {

    await Promise.all([
      loadChapters(),
      loadQuestions(),
      loadCategories(),
      loadSettings()
    ]);


    renderChapters();

    renderCategories();

    renderSearchResults();


    if (selectedChapter) {

      const updatedChapter =
        chapters.find(
          (item) =>
            item.id === selectedChapter.id
        );


      if (updatedChapter) {

        selectedChapter =
          updatedChapter;

        openChapter(
          updatedChapter.id,
          false
        );

      }

    }


    updateContactUI();

  } catch (error) {

    console.error(
      "Refresh content error:",
      error
    );

    showToast(
      "حدث خطأ أثناء تحميل المحتوى.",
      "error"
    );

  }

}


/* =========================================================
   LOAD CHAPTERS
   ========================================================= */

async function loadChapters() {

  const {
    data,
    error
  } =
    await supabase
      .from(TABLES.chapters)
      .select("*")
      .order("sort_order", {
        ascending: true
      })
      .order("created_at", {
        ascending: true
      });


  if (error) {

    console.error(
      "Load chapters:",
      error
    );

    throw error;
  }


  chapters = data || [];

}


/* =========================================================
   LOAD QUESTIONS
   ========================================================= */

async function loadQuestions() {

  const {
    data,
    error
  } =
    await supabase
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

    console.error(
      "Load questions:",
      error
    );

    throw error;
  }


  questions = data || [];

}


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

async function loadCategories() {

  const {
    data,
    error
  } =
    await supabase
      .from(TABLES.categories)
      .select("*")
      .order("name", {
        ascending: true
      });


  if (error) {

    console.error(
      "Load categories:",
      error
    );

    throw error;
  }


  categories = data || [];

}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

async function loadSettings() {

  const {
    data,
    error
  } =
    await supabase
      .from(TABLES.settings)
      .select("*");


  if (error) {

    console.error(
      "Load settings:",
      error
    );

    /*
     * لو جدول settings غير موجود
     * لا نوقف الموقع بالكامل
     */

    siteSettings = {};

    return;
  }


  siteSettings = {};


  (data || []).forEach(
    (item) => {

      if (item.key) {

        siteSettings[item.key] =
          item.value;

      }

    }
  );

}


/* =========================================================
   RENDER CHAPTERS
   ========================================================= */

function renderChapters() {

  if (!chaptersGrid) return;


  chaptersGrid.innerHTML = "";


  if (!chapters.length) {

    chaptersEmpty?.classList.remove(
      "hidden"
    );

    return;

  }


  chaptersEmpty?.classList.add(
    "hidden"
  );


  chapters.forEach(
    (chapter, index) => {

      const card =
        document.createElement("article");


      card.className =
        "chapter-card reveal";


      card.style.animationDelay =
        `${index * 0.05}s`;


      const count =
        questions.filter(
          (question) =>
            question.chapter_id === chapter.id
        ).length;


      card.innerHTML = `

        <div class="chapter-card-number">
          ${String(index + 1).padStart(2, "0")}
        </div>

        <div class="chapter-card-content">

          <span class="section-label">
            CHAPTER ${index + 1}
          </span>

          <h3>
            ${escapeHTML(
              chapter.name || "Untitled Chapter"
            )}
          </h3>

          <p>
            ${escapeHTML(
              chapter.description ||
              "اضغط لعرض الأسئلة الموجودة في هذا الفصل."
            )}
          </p>

          <span class="chapter-question-count">
            ${count} سؤال
          </span>

        </div>

        ${
          chapter.cover_image_url
            ? `
              <div class="chapter-card-image">
                <img
                  src="${escapeAttribute(
                    chapter.cover_image_url
                  )}"
                  alt="">
              </div>
            `
            : ""
        }

      `;


      card.addEventListener(
        "click",
        () => {

          openChapter(
            chapter.id
          );

        }
      );


      chaptersGrid.appendChild(card);

    }
  );

}


/* =========================================================
   OPEN CHAPTER
   ========================================================= */

function openChapter(
  chapterId,
  scroll = true
) {

  const chapter =
    chapters.find(
      (item) =>
        item.id === chapterId
    );


  if (!chapter) return;


  selectedChapter =
    chapter;


  selectedChapterTitle.textContent =
    chapter.name ||
    "Chapter";


  selectedChapterDescription.textContent =
    chapter.description ||
    "";


  const chapterQuestions =
    questions.filter(
      (question) =>
        question.chapter_id === chapter.id
    );


  renderQuestions(
    chapterQuestions
  );


  questionsSection?.classList.remove(
    "hidden"
  );


  if (scroll) {

    questionsSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


/* =========================================================
   RENDER QUESTIONS
   ========================================================= */

function renderQuestions(list) {

  if (!questionsList) return;


  questionsList.innerHTML = "";


  if (!list.length) {

    questionsEmpty?.classList.remove(
      "hidden"
    );

    return;

  }


  questionsEmpty?.classList.add(
    "hidden"
  );


  list.forEach(
    (question, index) => {

      const article =
        document.createElement("article");


      article.className =
        "question-card reveal";


      article.innerHTML = `

        <div class="question-number">
          ${String(index + 1).padStart(2, "0")}
        </div>


        <div class="question-body">

          <div class="question-meta">

            ${
              question.categories?.name
                ? `
                  <span class="question-category">
                    ${escapeHTML(
                      question.categories.name
                    )}
                  </span>
                `
                : ""
            }


            ${
              question.chapters?.name
                ? `
                  <span>
                    ${escapeHTML(
                      question.chapters.name
                    )}
                  </span>
                `
                : ""
            }

          </div>


          <h3>
            ${escapeHTML(
              question.title ||
              "Question"
            )}
          </h3>


          <div class="question-text">
            ${formatText(
              question.question || ""
            )}
          </div>


          ${
            question.image_url
              ? `
                <div class="question-media">

                  <img
                    src="${escapeAttribute(
                      question.image_url
                    )}"
                    alt="Question image"
                    loading="lazy">

                </div>
              `
              : ""
          }


          ${
            question.video_url
              ? `
                <div class="question-video">

                  ${buildVideoEmbed(
                    question.video_url
                  )}

                </div>
              `
              : ""
          }


          <details class="answer-details">

            <summary>
              SHOW ANSWER
            </summary>


            <div class="answer-content">

              ${
                question.answer
                  ? `
                    <h4>
                      الإجابة
                    </h4>

                    <div>
                      ${formatText(
                        question.answer
                      )}
                    </div>
                  `
                  : ""
              }


              ${
                question.explanation
                  ? `
                    <h4>
                      الشرح
                    </h4>

                    <div>
                      ${formatText(
                        question.explanation
                      )}
                    </div>
                  `
                  : ""
              }

            </div>

          </details>


          <button
            class="copy-question-button"
            type="button">

            COPY QUESTION

          </button>

        </div>

      `;


      const copyButton =
        article.querySelector(
          ".copy-question-button"
        );


      copyButton?.addEventListener(
        "click",
        async () => {

          const text =
            buildCopyText(question);


          await copyText(text);


          copyButton.textContent =
            "COPIED";


          setTimeout(
            () => {
              copyButton.textContent =
                "COPY QUESTION";
            },
            1500
          );

        }
      );


      questionsList.appendChild(
        article
      );

    }
  );

}


/* =========================================================
   COPY QUESTION
   ========================================================= */

function buildCopyText(question) {

  return [
    question.title || "",
    "",
    question.question || "",
    "",
    question.answer
      ? `الإجابة:\n${question.answer}`
      : "",
    "",
    question.explanation
      ? `الشرح:\n${question.explanation}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

}


async function copyText(text) {

  try {

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard.writeText(
        text
      );

      showToast(
        "تم نسخ السؤال.",
        "success"
      );

      return;

    }

    fallbackCopy(text);

  } catch (error) {

    console.error(error);

    fallbackCopy(text);

  }

}


function fallbackCopy(text) {

  const textarea =
    document.createElement("textarea");


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

    document.execCommand("copy");

    showToast(
      "تم نسخ السؤال.",
      "success"
    );

  } catch (error) {

    showToast(
      "تعذر نسخ السؤال.",
      "error"
    );

  }


  textarea.remove();

}


/* =========================================================
   SEARCH
   ========================================================= */

function renderSearchResults() {

  if (!searchResults) return;


  const query =
    (searchInput?.value || "")
      .trim()
      .toLowerCase();


  const categoryId =
    categoryFilter?.value || "";


  let results =
    questions.filter(
      (question) => {

        const searchable = [
          question.title,
          question.question,
          question.answer,
          question.explanation,
          question.chapters?.name,
          question.categories?.name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        const matchesQuery =
          !query ||
          searchable.includes(query);


        const matchesCategory =
          !categoryId ||
          String(
            question.category_id
          ) === String(categoryId);


        return (
          matchesQuery &&
          matchesCategory
        );

      }
    );


  searchResults.innerHTML = "";


  if (
    !query &&
    !categoryId
  ) {

    searchEmpty?.classList.add(
      "hidden"
    );

    return;

  }


  if (!results.length) {

    searchEmpty?.classList.remove(
      "hidden"
    );

    return;

  }


  searchEmpty?.classList.add(
    "hidden"
  );


  results.forEach(
    (question) => {

      const item =
        document.createElement("article");


      item.className =
        "search-result-card";


      item.innerHTML = `

        <span class="section-label">
          ${
            escapeHTML(
              question.chapters?.name ||
              "ARCHIVE"
            )
          }
        </span>


        <h3>
          ${escapeHTML(
            question.title ||
            "Question"
          )}
        </h3>


        <p>
          ${escapeHTML(
            truncate(
              question.question || "",
              220
            )
          )}
        </p>


        ${
          question.categories?.name
            ? `
              <span class="question-category">
                ${escapeHTML(
                  question.categories.name
                )}
              </span>
            `
            : ""
        }

      `;


      item.addEventListener(
        "click",
        () => {

          openQuestionFromSearch(
            question
          );

        }
      );


      searchResults.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   OPEN QUESTION FROM SEARCH
   ========================================================= */

function openQuestionFromSearch(
  question
) {

  if (
    question.chapter_id
  ) {

    openChapter(
      question.chapter_id,
      true
    );


    setTimeout(
      () => {

        const cards =
          $$(".question-card");


        const index =
          questions
            .filter(
              (item) =>
                item.chapter_id ===
                question.chapter_id
            )
            .findIndex(
              (item) =>
                item.id === question.id
            );


        if (
          cards[index]
        ) {

          cards[index].scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

        }

      },
      250
    );

  }

}


/* =========================================================
   CATEGORIES
   ========================================================= */

function renderCategories() {

  if (!categoryFilter) return;


  categoryFilter.innerHTML = `
    <option value="">
      كل التصنيفات
    </option>
  `;


  categories.forEach(
    (category) => {

      const option =
        document.createElement("option");


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


/* =========================================================
   CONTACT
   ========================================================= */

function updateContactUI() {

  const number =
    getSetting(
      "whatsapp_number",
      "+201213707524"
    );


  const template =
    getSetting(
      "whatsapp_template",
      "مرحبًا، أحتاج إلى المساعدة في Question Archive."
    );


  if (contactNumberLabel) {

    contactNumberLabel.textContent =
      number;

  }


  generalWhatsApp?.addEventListener(
    "click",
    () => {

      openWhatsApp(
        number,
        template
      );

    },
    {
      once: true
    }
  );


  if (whatsappNumber) {

    whatsappNumber.value =
      number;

  }


  if (whatsappTemplate) {

    whatsappTemplate.value =
      template;

  }

}


function getSetting(
  key,
  fallback = ""
) {

  const value =
    siteSettings[key];


  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return fallback;

  }


  return value;

}


function openWhatsApp(
  number,
  message
) {

  const cleanNumber =
    String(number || "")
      .replace(/\D/g, "");


  if (!cleanNumber) {

    showToast(
      "رقم WhatsApp غير مضبوط.",
      "error"
    );

    return;

  }


  const url =
    `https://wa.me/${cleanNumber}?text=${
      encodeURIComponent(message)
    }`;


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function openAdminDashboard() {

  if (!isAdmin()) {

    showToast(
      "هذه المنطقة متاحة للأدمن فقط.",
      "error"
    );

    return;

  }


  adminOverlay?.classList.remove(
    "hidden"
  );


  adminOverlay?.setAttribute(
    "aria-hidden",
    "false"
  );


  renderAdminLists();

}


function closeAdminDashboard() {

  adminOverlay?.classList.add(
    "hidden"
  );


  adminOverlay?.setAttribute(
    "aria-hidden",
    "true"
  );

}


/* =========================================================
   ADMIN TABS
   ========================================================= */

function switchAdminTab(
  tabName
) {

  adminTabs.forEach(
    (button) => {

      button.classList.toggle(
        "active",
        button.dataset.adminTab ===
          tabName
      );

    }
  );


  adminPanels.forEach(
    (panel) => {

      panel.classList.toggle(
        "active",
        panel.dataset.adminPanel ===
          tabName
      );

    }
  );

}


/* =========================================================
   ADMIN LISTS
   ========================================================= */

async function renderAdminLists() {

  if (!isAdmin()) return;


  renderAdminStats();

  renderAdminChapters();

  renderAdminQuestions();

  renderAdminCategories();

  loadContactSettingsIntoForm();

}


/* =========================================================
   ADMIN STATS
   ========================================================= */

function renderAdminStats() {

  if (statChapters) {

    statChapters.textContent =
      chapters.length;

  }


  if (statQuestions) {

    statQuestions.textContent =
      questions.length;

  }


  if (statCategories) {

    statCategories.textContent =
      categories.length;

  }

}


/* =========================================================
   ADMIN CHAPTERS
   ========================================================= */

function renderAdminChapters() {

  if (!adminChaptersList) return;


  adminChaptersList.innerHTML = "";


  if (!chapters.length) {

    adminChaptersList.innerHTML = `
      <div class="admin-empty">
        لا توجد Chapters.
      </div>
    `;

    return;

  }


  chapters.forEach(
    (chapter, index) => {

      const row =
        document.createElement("div");


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div class="admin-list-info">

          <span class="section-label">
            #${index + 1}
          </span>

          <h4>
            ${escapeHTML(
              chapter.name || ""
            )}
          </h4>

          <p>
            ${escapeHTML(
              chapter.description || ""
            )}
          </p>

        </div>


        <div class="admin-list-actions">

          <button
            class="small-button edit-chapter"
            type="button">
            EDIT
          </button>


          <button
            class="small-button danger delete-chapter"
            type="button">
            DELETE
          </button>

        </div>

      `;


      row
        .querySelector(
          ".edit-chapter"
        )
        ?.addEventListener(
          "click",
          () => {

            openEditor(
              "chapter",
              chapter.id
            );

          }
        );


      row
        .querySelector(
          ".delete-chapter"
        )
        ?.addEventListener(
          "click",
          () => {

            deleteChapter(
              chapter.id
            );

          }
        );


      adminChaptersList.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   ADMIN QUESTIONS
   ========================================================= */

function renderAdminQuestions() {

  if (!adminQuestionsList) return;


  adminQuestionsList.innerHTML = "";


  if (!questions.length) {

    adminQuestionsList.innerHTML = `
      <div class="admin-empty">
        لا توجد Questions.
      </div>
    `;

    return;

  }


  questions.forEach(
    (question) => {

      const row =
        document.createElement("div");


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div class="admin-list-info">

          <span class="section-label">
            ${
              escapeHTML(
                question.chapters?.name ||
                "NO CHAPTER"
              )
            }
          </span>

          <h4>
            ${escapeHTML(
              question.title ||
              "Question"
            )}
          </h4>

          <p>
            ${escapeHTML(
              truncate(
                question.question || "",
                180
              )
            )}
          </p>

        </div>


        <div class="admin-list-actions">

          <button
            class="small-button edit-question"
            type="button">
            EDIT
          </button>


          <button
            class="small-button danger delete-question"
            type="button">
            DELETE
          </button>

        </div>

      `;


      row
        .querySelector(
          ".edit-question"
        )
        ?.addEventListener(
          "click",
          () => {

            openEditor(
              "question",
              question.id
            );

          }
        );


      row
        .querySelector(
          ".delete-question"
        )
        ?.addEventListener(
          "click",
          () => {

            deleteQuestion(
              question.id
            );

          }
        );


      adminQuestionsList.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   ADMIN CATEGORIES
   ========================================================= */

function renderAdminCategories() {

  if (!adminCategoriesList) return;


  adminCategoriesList.innerHTML = "";


  if (!categories.length) {

    adminCategoriesList.innerHTML = `
      <div class="admin-empty">
        لا توجد Categories.
      </div>
    `;

    return;

  }


  categories.forEach(
    (category) => {

      const row =
        document.createElement("div");


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div class="admin-list-info">

          <span class="section-label">
            CATEGORY
          </span>

          <h4>
            ${escapeHTML(
              category.name || ""
            )}
          </h4>

          <p>
            ${escapeHTML(
              category.description || ""
            )}
          </p>

        </div>


        <div class="admin-list-actions">

          <button
            class="small-button edit-category"
            type="button">
            EDIT
          </button>


          <button
            class="small-button danger delete-category"
            type="button">
            DELETE
          </button>

        </div>

      `;


      row
        .querySelector(
          ".edit-category"
        )
        ?.addEventListener(
          "click",
          () => {

            openEditor(
              "category",
              category.id
            );

          }
        );


      row
        .querySelector(
          ".delete-category"
        )
        ?.addEventListener(
          "click",
          () => {

            deleteCategory(
              category.id
            );

          }
        );


      adminCategoriesList.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   ADD / EDIT CHAPTER
   ========================================================= */

function openEditor(
  type,
  id = null
) {

  if (!isAdmin()) {

    showToast(
      "Admin only.",
      "error"
    );

    return;

  }


  editorType = type;

  editingId = id;


  if (!editorModal || !editorForm) {
    return;
  }


  let item = null;


  if (type === "chapter") {

    item =
      chapters.find(
        (chapter) =>
          chapter.id === id
      );

    editorKicker.textContent =
      "CHAPTER EDITOR";

    editorTitle.textContent =
      id
        ? "EDIT CHAPTER"
        : "ADD CHAPTER";


    editorForm.innerHTML = `

      <label for="editorName">
        CHAPTER NAME
      </label>

      <input
        id="editorName"
        type="text"
        value="${escapeAttribute(
          item?.name || ""
        )}"
        required>


      <label for="editorDescription">
        DESCRIPTION
      </label>

      <textarea
        id="editorDescription"
        rows="5"
        placeholder="وصف الفصل...">${escapeHTML(
          item?.description || ""
        )}</textarea>


      <label for="editorCover">
        COVER IMAGE URL
      </label>

      <input
        id="editorCover"
        type="url"
        value="${escapeAttribute(
          item?.cover_image_url || ""
        )}"
        placeholder="https://...">


      <label for="editorSort">
        SORT ORDER
      </label>

      <input
        id="editorSort"
        type="number"
        value="${Number(
          item?.sort_order || 0
        )}">


      <button
        type="submit"
        class="archive-button primary">

        SAVE CHAPTER

      </button>

    `;

  }


  if (type === "category") {

    item =
      categories.find(
        (category) =>
          category.id === id
      );

    editorKicker.textContent =
      "CATEGORY EDITOR";

    editorTitle.textContent =
      id
        ? "EDIT CATEGORY"
        : "ADD CATEGORY";


    editorForm.innerHTML = `

      <label for="editorName">
        CATEGORY NAME
      </label>

      <input
        id="editorName"
        type="text"
        value="${escapeAttribute(
          item?.name || ""
        )}"
        required>


      <label for="editorDescription">
        DESCRIPTION
      </label>

      <textarea
        id="editorDescription"
        rows="5">${escapeHTML(
          item?.description || ""
        )}</textarea>


      <button
        type="submit"
        class="archive-button primary">

        SAVE CATEGORY

      </button>

    `;

  }


  if (type === "question") {

    item =
      questions.find(
        (question) =>
          question.id === id
      );

    editorKicker.textContent =
      "QUESTION EDITOR";

    editorTitle.textContent =
      id
        ? "EDIT QUESTION"
        : "ADD QUESTION";


    editorForm.innerHTML = `

      <label for="editorTitleInput">
        QUESTION TITLE
      </label>

      <input
        id="editorTitleInput"
        type="text"
        value="${escapeAttribute(
          item?.title || ""
        )}"
        required>


      <label for="editorChapter">
        CHAPTER
      </label>

      <select
        id="editorChapter"
        required>

        <option value="">
          اختر Chapter
        </option>

        ${chapters
          .map(
            (chapter) => `
              <option
                value="${escapeAttribute(
                  chapter.id
                )}"
                ${
                  String(
                    item?.chapter_id || ""
                  ) ===
                  String(chapter.id)
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


      <label for="editorCategory">
        CATEGORY
      </label>

      <select id="editorCategory">

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
                  String(
                    item?.category_id || ""
                  ) ===
                  String(category.id)
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


      <label for="editorQuestion">
        QUESTION
      </label>

      <textarea
        id="editorQuestion"
        rows="7"
        required>${escapeHTML(
          item?.question || ""
        )}</textarea>


      <label for="editorAnswer">
        ANSWER
      </label>

      <textarea
        id="editorAnswer"
        rows="6">${escapeHTML(
          item?.answer || ""
        )}</textarea>


      <label for="editorExplanation">
        EXPLANATION
      </label>

      <textarea
        id="editorExplanation"
        rows="7">${escapeHTML(
          item?.explanation || ""
        )}</textarea>


      <label for="editorImage">
        IMAGE URL
      </label>

      <input
        id="editorImage"
        type="url"
        value="${escapeAttribute(
          item?.image_url || ""
        )}"
        placeholder="https://...">


      <label for="editorVideo">
        VIDEO URL
      </label>

      <input
        id="editorVideo"
        type="url"
        value="${escapeAttribute(
          item?.video_url || ""
        )}"
        placeholder="YouTube URL أو رابط الفيديو">


      <label for="editorSort">
        SORT ORDER
      </label>

      <input
        id="editorSort"
        type="number"
        value="${Number(
          item?.sort_order || 0
        )}">


      <button
        type="submit"
        class="archive-button primary">

        SAVE QUESTION

      </button>

    `;

  }


  editorModal.classList.remove(
    "hidden"
  );

  editorModal.setAttribute(
    "aria-hidden",
    "false"
  );


  editorForm.onsubmit =
    async (event) => {

      event.preventDefault();

      await saveEditor();

    };

}


/* =========================================================
   SAVE EDITOR
   ========================================================= */

async function saveEditor() {

  if (!isAdmin()) {

    showToast(
      "Admin only.",
      "error"
    );

    return;

  }


  try {

    if (editorType === "chapter") {

      await saveChapter();

    }


    if (editorType === "category") {

      await saveCategory();

    }


    if (editorType === "question") {

      await saveQuestion();

    }


    closeEditorModal();

    await refreshPublicContent();

    await renderAdminLists();


    showToast(
      "تم حفظ التعديلات.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showToast(
      getDatabaseError(error),
      "error"
    );

  }

}


/* =========================================================
   SAVE CHAPTER
   ========================================================= */

async function saveChapter() {

  const name =
    $("#editorName")?.value.trim();


  const description =
    $("#editorDescription")?.value.trim();


  const cover =
    $("#editorCover")?.value.trim();


  const sortOrder =
    Number(
      $("#editorSort")?.value || 0
    );


  if (!name) {

    throw new Error(
      "اكتب اسم الـChapter."
    );

  }


  const payload = {

    name,

    description:
      description || null,

    cover_image_url:
      cover || null,

    sort_order:
      sortOrder

  };


  if (editingId) {

    const {
      error
    } =
      await supabase
        .from(TABLES.chapters)
        .update(payload)
        .eq("id", editingId);


    if (error) throw error;

  } else {

    payload.created_by =
      currentUser.id;


    const {
      error
    } =
      await supabase
        .from(TABLES.chapters)
        .insert(payload);


    if (error) throw error;

  }

}


/* =========================================================
   SAVE CATEGORY
   ========================================================= */

async function saveCategory() {

  const name =
    $("#editorName")?.value.trim();


  const description =
    $("#editorDescription")?.value.trim();


  if (!name) {

    throw new Error(
      "اكتب اسم الـCategory."
    );

  }


  const payload = {

    name,

    description:
      description || null

  };


  if (editingId) {

    const {
      error
    } =
      await supabase
        .from(TABLES.categories)
        .update(payload)
        .eq("id", editingId);


    if (error) throw error;

  } else {

    payload.created_by =
      currentUser.id;


    const {
      error
    } =
      await supabase
        .from(TABLES.categories)
        .insert(payload);


    if (error) throw error;

  }

}


/* =========================================================
   SAVE QUESTION
   ========================================================= */

async function saveQuestion() {

  const title =
    $("#editorTitleInput")
      ?.value.trim();


  const chapterId =
    $("#editorChapter")
      ?.value || null;


  const categoryId =
    $("#editorCategory")
      ?.value || null;


  const question =
    $("#editorQuestion")
      ?.value.trim();


  const answer =
    $("#editorAnswer")
      ?.value.trim();


  const explanation =
    $("#editorExplanation")
      ?.value.trim();


  const imageUrl =
    $("#editorImage")
      ?.value.trim();


  const videoUrl =
    $("#editorVideo")
      ?.value.trim();


  const sortOrder =
    Number(
      $("#editorSort")?.value || 0
    );


  if (!title) {

    throw new Error(
      "اكتب عنوان السؤال."
    );

  }


  if (!chapterId) {

    throw new Error(
      "اختر Chapter."
    );

  }


  if (!question) {

    throw new Error(
      "اكتب نص السؤال."
    );

  }


  const payload = {

    title,

    chapter_id:
      chapterId,

    category_id:
      categoryId,

    question,

    answer:
      answer || null,

    explanation:
      explanation || null,

    image_url:
      imageUrl || null,

    video_url:
      videoUrl || null,

    sort_order:
      sortOrder

  };


  if (editingId) {

    const {
      error
    } =
      await supabase
        .from(TABLES.questions)
        .update(payload)
        .eq("id", editingId);


    if (error) throw error;

  } else {

    payload.created_by =
      currentUser.id;


    const {
      error
    } =
      await supabase
        .from(TABLES.questions)
        .insert(payload);


    if (error) throw error;

  }

}


/* =========================================================
   DELETE CHAPTER
   ========================================================= */

async function deleteChapter(
  id
) {

  if (!isAdmin()) return;


  const hasQuestions =
    questions.some(
      (question) =>
        question.chapter_id === id
    );


  if (hasQuestions) {

    showToast(
      "لا يمكن حذف Chapter يحتوي على أسئلة. احذف الأسئلة أولًا.",
      "error"
    );

    return;

  }


  if (
    !window.confirm(
      "هل أنت متأكد من حذف هذا Chapter؟"
    )
  ) {

    return;

  }


  try {

    const {
      error
    } =
      await supabase
        .from(TABLES.chapters)
        .delete()
        .eq("id", id);


    if (error) throw error;


    await refreshPublicContent();

    await renderAdminLists();


    showToast(
      "تم حذف الـChapter.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showToast(
      getDatabaseError(error),
      "error"
    );

  }

}


/* =========================================================
   DELETE QUESTION
   ========================================================= */

async function deleteQuestion(
  id
) {

  if (!isAdmin()) return;


  if (
    !window.confirm(
      "هل أنت متأكد من حذف هذا السؤال؟"
    )
  ) {

    return;

  }


  try {

    const {
      error
    } =
      await supabase
        .from(TABLES.questions)
        .delete()
        .eq("id", id);


    if (error) throw error;


    await refreshPublicContent();

    await renderAdminLists();


    showToast(
      "تم حذف السؤال.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showToast(
      getDatabaseError(error),
      "error"
    );

  }

}


/* =========================================================
   DELETE CATEGORY
   ========================================================= */

async function deleteCategory(
  id
) {

  if (!isAdmin()) return;


  const used =
    questions.some(
      (question) =>
        question.category_id === id
    );


  if (used) {

    showToast(
      "هذا التصنيف مستخدم في أسئلة. غيّر التصنيف أو احذف الأسئلة أولًا.",
      "error"
    );

    return;

  }


  if (
    !window.confirm(
      "هل أنت متأكد من حذف هذا التصنيف؟"
    )
  ) {

    return;

  }


  try {

    const {
      error
    } =
      await supabase
        .from(TABLES.categories)
        .delete()
        .eq("id", id);


    if (error) throw error;


    await refreshPublicContent();

    await renderAdminLists();


    showToast(
      "تم حذف التصنيف.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showToast(
      getDatabaseError(error),
      "error"
    );

  }

}


/* =========================================================
   CONTACT SETTINGS
   ========================================================= */

function loadContactSettingsIntoForm() {

  if (whatsappNumber) {

    whatsappNumber.value =
      getSetting(
        "whatsapp_number",
        "+201213707524"
      );

  }


  if (whatsappTemplate) {

    whatsappTemplate.value =
      getSetting(
        "whatsapp_template",
        "مرحبًا، أحتاج إلى المساعدة في Question Archive."
      );

  }

}


async function saveSetting(
  key,
  value
) {

  const payload = {

    key,

    value,

    updated_by:
      currentUser.id,

    updated_at:
      new Date().toISOString()

  };


  const {
    data: existing,
    error: findError
  } =
    await supabase
      .from(TABLES.settings)
      .select("key")
      .eq("key", key)
      .maybeSingle();


  if (findError) {

    throw findError;

  }


  if (existing) {

    const {
      error
    } =
      await supabase
        .from(TABLES.settings)
        .update({
          value,
          updated_by:
            currentUser.id,
          updated_at:
            new Date().toISOString()
        })
        .eq("key", key);


    if (error) throw error;

  } else {

    const {
      error
    } =
      await supabase
        .from(TABLES.settings)
        .insert(payload);


    if (error) throw error;

  }

}


async function saveContactSettings() {

  if (!isAdmin()) {

    showToast(
      "Admin only.",
      "error"
    );

    return;

  }


  const number =
    whatsappNumber?.value.trim();


  const template =
    whatsappTemplate?.value.trim();


  try {

    await saveSetting(
      "whatsapp_number",
      number
    );


    await saveSetting(
      "whatsapp_template",
      template
    );


    await loadSettings();

    updateContactUI();


    showToast(
      "تم حفظ إعدادات التواصل.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showToast(
      getDatabaseError(error),
      "error"
    );

  }

}


/* =========================================================
   VIDEO EMBED
   ========================================================= */

function buildVideoEmbed(
  url
) {

  if (!url) return "";


  const youtubeId =
    getYouTubeId(url);


  if (youtubeId) {

    return `
      <div class="video-frame">

        <iframe
          src="https://www.youtube.com/embed/${escapeAttribute(
            youtubeId
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
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes(".ogg")
  ) {

    return `
      <video
        controls
        preload="metadata"
        class="native-video">

        <source
          src="${escapeAttribute(url)}">

        المتصفح لا يدعم تشغيل الفيديو.

      </video>
    `;

  }


  return `
    <div class="video-link-box">

      <a
        href="${escapeAttribute(url)}"
        target="_blank"
        rel="noopener noreferrer">

        OPEN VIDEO

      </a>

    </div>
  `;

}


function getYouTubeId(
  url
) {

  try {

    const parsed =
      new URL(url);


    if (
      parsed.hostname.includes(
        "youtu.be"
      )
    ) {

      return parsed.pathname
        .replace("/", "")
        .split("/")[0];

    }


    if (
      parsed.hostname.includes(
        "youtube.com"
      )
    ) {

      if (
        parsed.pathname ===
        "/watch"
      ) {

        return parsed.searchParams.get(
          "v"
        );

      }


      if (
        parsed.pathname.startsWith(
          "/embed/"
        )
      ) {

        return parsed.pathname
          .split("/embed/")[1]
          ?.split("/")[0];

      }


      if (
        parsed.pathname.startsWith(
          "/shorts/"
        )
      ) {

        return parsed.pathname
          .split("/shorts/")[1]
          ?.split("/")[0];

      }

    }

  } catch (error) {

    return null;

  }


  return null;

}


/* =========================================================
   STATIC EVENTS
   ========================================================= */

function bindStaticEvents() {


  /*
   * Admin login
   */

  adminLoginButton?.addEventListener(
    "click",
    () => {

      showAdminLogin();

    }
  );


  /*
   * Admin dashboard
   */

  adminNavButton?.addEventListener(
    "click",
    () => {

      openAdminDashboard();

    }
  );


  closeAdmin?.addEventListener(
    "click",
    () => {

      closeAdminDashboard();

    }
  );


  /*
   * Mobile menu
   */

  mobileMenuButton?.addEventListener(
    "click",
    () => {

      mainNav?.classList.toggle(
        "mobile-open"
      );

    }
  );


  /*
   * Close mobile menu after link
   */

  $$("#mainNav a").forEach(
    (link) => {

      link.addEventListener(
        "click",
        () => {

          mainNav?.classList.remove(
            "mobile-open"
          );

        }
      );

    }
  );


  /*
   * Admin tabs
   */

  adminTabs.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          switchAdminTab(
            button.dataset.adminTab
          );

        }
      );

    }
  );


  /*
   * Add buttons
   */

  addChapterButton?.addEventListener(
    "click",
    () => {

      openEditor(
        "chapter"
      );

    }
  );


  addQuestionButton?.addEventListener(
    "click",
    () => {

      openEditor(
        "question"
      );

    }
  );


  addCategoryButton?.addEventListener(
    "click",
    () => {

      openEditor(
        "category"
      );

    }
  );


  /*
   * Close editor
   */

  closeEditor?.addEventListener(
    "click",
    () => {

      closeEditorModal();

    }
  );


  /*
   * Click outside editor
   */

  editorModal?.addEventListener(
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


  /*
   * Search
   */

  searchInput?.addEventListener(
    "input",
    () => {

      clearTimeout(
        searchTimer
      );


      searchTimer =
        setTimeout(
          () => {

            renderSearchResults();

          },
          180
        );

    }
  );


  categoryFilter?.addEventListener(
    "change",
    () => {

      renderSearchResults();

    }
  );


  /*
   * Contact form
   */

  contactSettingsForm?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      await saveContactSettings();

    }
  );


  /*
   * Escape key
   */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape"
      ) {

        closeEditorModal();

        closeAdminDashboard();

      }

    }
  );

}


/* =========================================================
   CLOSE EDITOR
   ========================================================= */

function closeEditorModal() {

  editorModal?.classList.add(
    "hidden"
  );


  editorModal?.setAttribute(
    "aria-hidden",
    "true"
  );


  editorForm.onsubmit = null;

  editorType = null;

  editingId = null;

}


/* =========================================================
   DATABASE ERRORS
   ========================================================= */

function getDatabaseError(
  error
) {

  if (!error) {

    return "حدث خطأ غير معروف.";

  }


  if (
    error.code === "42501"
  ) {

    return "ليس لديك صلاحية لتنفيذ هذه العملية. تحقق من RLS في Supabase.";

  }


  if (
    error.code === "23505"
  ) {

    return "هذا العنصر موجود بالفعل.";

  }


  if (
    error.code === "23503"
  ) {

    return "لا يمكن تنفيذ العملية بسبب وجود عناصر مرتبطة بهذا العنصر.";

  }


  return (
    error.message ||
    "حدث خطأ أثناء تنفيذ العملية."
  );

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = "info"
) {

  if (!toastRegion) return;


  const toast =
    document.createElement("div");


  toast.className =
    `toast ${type}`;


  toast.innerHTML = `
    <span>
      ${escapeHTML(message)}
    </span>
  `;


  toastRegion.appendChild(
    toast
  );


  requestAnimationFrame(
    () => {

      toast.classList.add(
        "show"
      );

    }
  );


  setTimeout(
    () => {

      toast.classList.remove(
        "show"
      );


      setTimeout(
        () => {

          toast.remove();

        },
        250
      );

    },
    3200
  );

}


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function escapeHTML(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(
  value
) {

  return escapeHTML(value);

}


function formatText(
  text
) {

  return escapeHTML(text)
    .replace(
      /\n/g,
      "<br>"
    );

}


function truncate(
  text,
  length = 180
) {

  const value =
    String(text || "");


  if (
    value.length <= length
  ) {

    return value;

  }


  return (
    value.substring(
      0,
      length
    ) + "..."
  );

}


/* =========================================================
   REVEAL ANIMATION
   ========================================================= */

function setupRevealObserver() {

  if (
    !("IntersectionObserver" in window)
  ) {

    $$(".reveal").forEach(
      (element) => {

        element.classList.add(
          "visible"
        );

      }
    );

    return;

  }


  const observer =
    new IntersectionObserver(
      (entries) => {

        entries.forEach(
          (entry) => {

            if (
              entry.isIntersecting
            ) {

              entry.target.classList.add(
                "visible"
              );

              observer.unobserve(
                entry.target
              );

            }

          }
        );

      },
      {
        threshold: 0.08
      }
    );


  $$(".reveal").forEach(
    (element) => {

      observer.observe(
        element
      );

    }
  );

}


setTimeout(
  setupRevealObserver,
  500
);
