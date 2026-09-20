/* =========================================================
   QUESTION ARCHIVE
   STUDENT DIRECT ACCESS + ADMIN LOGIN
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://ezzvciyzqpgbbokopvzx.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_8LtNCb9mSVJutvGk7mBJRA_nfG3gd4f";


const TABLES = {
  profiles: "profiles",
  chapters: "chapters",
  questions: "questions",
  categories: "categories",
  settings: "site_settings"
};


let supabase = null;

let currentUser = null;
let currentProfile = null;

let chapters = [];
let questions = [];
let categories = [];
let siteSettings = {};

let selectedChapter = null;

let editorType = null;
let editingId = null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  Array.from(
    document.querySelectorAll(selector)
  );


/* =========================================================
   DOM
   ========================================================= */

const authScreen =
  $("#authScreen");

const appShell =
  $("#appShell");

const adminLoginButton =
  $("#adminLoginButton");

const adminNavButton =
  $("#adminNavButton");

const userRoleBadge =
  $("#userRoleBadge");

const footerYear =
  $("#footerYear");

const chaptersGrid =
  $("#chaptersGrid");

const chaptersEmpty =
  $("#chaptersEmpty");

const questionsSection =
  $("#questionsSection");

const selectedChapterTitle =
  $("#selectedChapterTitle");

const selectedChapterDescription =
  $("#selectedChapterDescription");

const questionsList =
  $("#questionsList");

const questionsEmpty =
  $("#questionsEmpty");

const searchInput =
  $("#searchInput");

const categoryFilter =
  $("#categoryFilter");

const searchResults =
  $("#searchResults");

const searchEmpty =
  $("#searchEmpty");

const generalWhatsApp =
  $("#generalWhatsApp");

const contactNumberLabel =
  $("#contactNumberLabel");

const adminOverlay =
  $("#adminOverlay");

const closeAdmin =
  $("#closeAdmin");

const adminTabs =
  $$(".admin-tab");

const adminPanels =
  $$(".admin-panel");

const statChapters =
  $("#statChapters");

const statQuestions =
  $("#statQuestions");

const statCategories =
  $("#statCategories");

const adminChaptersList =
  $("#adminChaptersList");

const adminQuestionsList =
  $("#adminQuestionsList");

const adminCategoriesList =
  $("#adminCategoriesList");

const addChapterButton =
  $("#addChapterButton");

const addQuestionButton =
  $("#addQuestionButton");

const addCategoryButton =
  $("#addCategoryButton");

const contactSettingsForm =
  $("#contactSettingsForm");

const whatsappNumber =
  $("#whatsappNumber");

const whatsappTemplate =
  $("#whatsappTemplate");

const editorModal =
  $("#editorModal");

const editorTitle =
  $("#editorTitle");

const editorKicker =
  $("#editorKicker");

const editorForm =
  $("#editorForm");

const closeEditor =
  $("#closeEditor");

const toastRegion =
  $("#toastRegion");


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  boot
);


async function boot() {

  console.log(
    "Question Archive starting..."
  );


  if (footerYear) {

    footerYear.textContent =
      new Date().getFullYear();

  }


  /*
   * مهم جدًا:
   * الموقع يبدأ كـ STUDENT
   */

  appShell.classList.remove(
    "hidden"
  );

  authScreen.classList.add(
    "hidden"
  );

  authScreen.setAttribute(
    "aria-hidden",
    "true"
  );


  userRoleBadge.textContent =
    "STUDENT";


  adminLoginButton.classList.remove(
    "hidden"
  );


  adminNavButton.classList.add(
    "hidden"
  );


  bindEvents();


  /*
   * إنشاء Supabase
   */

  if (
    !window.supabase ||
    !window.supabase.createClient
  ) {

    console.error(
      "Supabase library not loaded."
    );

    showToast(
      "تعذر تحميل Supabase.",
      "error"
    );

    return;

  }


  try {

    supabase =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );

  } catch (error) {

    console.error(error);

    showToast(
      "تعذر الاتصال بـ Supabase.",
      "error"
    );

    return;

  }


  /*
   * تحميل المحتوى العام
   */

  await refreshPublicContent();


  /*
   * فحص جلسة Admin موجودة بالفعل
   */

  try {

    const {
      data
    } =
      await supabase.auth.getSession();


    const session =
      data?.session;


    if (session?.user) {

      await checkAdminSession(
        session.user
      );

    }

  } catch (error) {

    console.error(
      "Session error:",
      error
    );

  }


  /*
   * مراقبة تسجيل الدخول
   */

  supabase.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      console.log(
        "Auth event:",
        event
      );


      if (
        event === "SIGNED_IN" &&
        session?.user
      ) {

        await checkAdminSession(
          session.user
        );

      }


      if (
        event === "SIGNED_OUT"
      ) {

        currentUser = null;
        currentProfile = null;

        userRoleBadge.textContent =
          "STUDENT";

        adminLoginButton.classList.remove(
          "hidden"
        );

        adminNavButton.classList.add(
          "hidden"
        );

      }

    }
  );

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {


  /*
   * Admin login
   *
   * عندنا أيضًا onclick داخل HTML
   * كحماية إضافية.
   */

  adminLoginButton?.addEventListener(
    "click",
    showAdminLogin
  );


  /*
   * Admin dashboard
   */

  adminNavButton?.addEventListener(
    "click",
    openAdminDashboard
  );


  closeAdmin?.addEventListener(
    "click",
    closeAdminDashboard
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
   * Add
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
   * Editor close
   */

  closeEditor?.addEventListener(
    "click",
    closeEditorModal
  );


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
    renderSearchResults
  );


  categoryFilter?.addEventListener(
    "change",
    renderSearchResults
  );


  /*
   * Contact
   */

  generalWhatsApp?.addEventListener(
    "click",
    openGeneralWhatsApp
  );


  contactSettingsForm?.addEventListener(
    "submit",
    saveContactSettings
  );


  /*
   * ESC
   */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape"
      ) {

        closeAdminDashboard();

        closeEditorModal();

      }

    }
  );

}


/* =========================================================
   ADMIN LOGIN SCREEN
   ========================================================= */

/*
 * مهم:
 * window.showAdminLogin
 * حتى يعمل onclick الموجود في HTML.
 */

window.showAdminLogin =
  function showAdminLogin() {

    console.log(
      "Opening admin login..."
    );


    if (!authScreen) {

      alert(
        "authScreen غير موجود في index.html"
      );

      return;

    }


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
            class="auth-form">

            <label for="adminEmail">
              EMAIL
            </label>


            <input
              id="adminEmail"
              type="email"
              placeholder="admin@example.com"
              autocomplete="username"
              required>


            <label for="adminPassword">
              PASSWORD
            </label>


            <div class="password-wrap">

              <input
                id="adminPassword"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
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
              class="archive-button primary">

              LOGIN AS ADMIN

              <span class="button-mark">
                →
              </span>

            </button>


            <button
              id="cancelAdminLogin"
              type="button"
              class="text-button">

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


    appShell.classList.add(
      "hidden"
    );


    authScreen.classList.remove(
      "hidden"
    );


    authScreen.setAttribute(
      "aria-hidden",
      "false"
    );


    bindAdminLogin();

  };


/* =========================================================
   ADMIN LOGIN FORM
   ========================================================= */

function bindAdminLogin() {

  const form =
    $("#adminLoginForm");

  const email =
    $("#adminEmail");

  const password =
    $("#adminPassword");

  const toggle =
    $("#toggleAdminPassword");

  const cancel =
    $("#cancelAdminLogin");

  const status =
    $("#authStatus");


  if (!form) {

    console.error(
      "Admin login form not found."
    );

    return;

  }


  /*
   * Show password
   */

  toggle?.addEventListener(
    "click",
    () => {

      if (
        password.type ===
        "password"
      ) {

        password.type =
          "text";

        toggle.textContent =
          "HIDE";

      } else {

        password.type =
          "password";

        toggle.textContent =
          "SHOW";

      }

    }
  );


  /*
   * Back
   */

  cancel?.addEventListener(
    "click",
    closeAdminLogin
  );


  /*
   * Submit
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

        setStatus(
          status,
          "اكتب البريد الإلكتروني وكلمة المرور.",
          "error"
        );

        return;

      }


      setStatus(
        status,
        "جاري تسجيل الدخول...",
        "loading"
      );


      try {

        if (!supabase) {

          setStatus(
            status,
            "Supabase غير متصل.",
            "error"
          );

          return;

        }


        /*
         * تسجيل الدخول
         */

        const {
          data,
          error
        } =
          await supabase.auth.signInWithPassword({
            email:
              emailValue,

            password:
              passwordValue
          });


        if (error) {

          console.error(
            error
          );

          setStatus(
            status,
            getAuthError(error),
            "error"
          );

          return;

        }


        if (
          !data?.user
        ) {

          setStatus(
            status,
            "تعذر الحصول على حساب المستخدم.",
            "error"
          );

          return;

        }


        /*
         * فحص profile
         */

        const {
          data: profile,
          error: profileError
        } =
          await supabase
            .from(TABLES.profiles)
            .select("*")
            .eq(
              "id",
              data.user.id
            )
            .maybeSingle();


        if (
          profileError
        ) {

          console.error(
            profileError
          );

          await supabase.auth.signOut();

          setStatus(
            status,
            "تعذر التحقق من صلاحيات الحساب.",
            "error"
          );

          return;

        }


        /*
         * ليس Admin
         */

        if (
          !profile ||
          profile.role !==
            "admin"
        ) {

          await supabase.auth.signOut();


          setStatus(
            status,
            "هذا الحساب ليس حساب Admin.",
            "error"
          );

          return;

        }


        /*
         * Admin confirmed
         */

        currentUser =
          data.user;

        currentProfile =
          profile;


        userRoleBadge.textContent =
          "ADMIN";


        adminLoginButton.classList.add(
          "hidden"
        );


        adminNavButton.classList.remove(
          "hidden"
        );


        closeAdminLogin();


        await renderAdminLists();


        showToast(
          "تم تسجيل دخول الأدمن بنجاح.",
          "success"
        );

      } catch (error) {

        console.error(
          error
        );

        setStatus(
          status,
          "حدث خطأ أثناء تسجيل الدخول.",
          "error"
        );

      }

    }
  );

}


/* =========================================================
   CLOSE ADMIN LOGIN
   ========================================================= */

function closeAdminLogin() {

  authScreen.classList.add(
    "hidden"
  );

  authScreen.setAttribute(
    "aria-hidden",
    "true"
  );

  authScreen.innerHTML =
    "";

  appShell.classList.remove(
    "hidden"
  );

}


/* =========================================================
   CHECK ADMIN SESSION
   ========================================================= */

async function checkAdminSession(
  user
) {

  if (
    !supabase ||
    !user
  ) return;


  try {

    const {
      data: profile,
      error
    } =
      await supabase
        .from(TABLES.profiles)
        .select("*")
        .eq(
          "id",
          user.id
        )
        .maybeSingle();


    if (
      error ||
      !profile ||
      profile.role !== "admin"
    ) {

      currentUser =
        null;

      currentProfile =
        null;

      userRoleBadge.textContent =
        "STUDENT";

      adminLoginButton.classList.remove(
        "hidden"
      );

      adminNavButton.classList.add(
        "hidden"
      );

      return;

    }


    currentUser =
      user;

    currentProfile =
      profile;


    userRoleBadge.textContent =
      "ADMIN";


    adminLoginButton.classList.add(
      "hidden"
    );


    adminNavButton.classList.remove(
      "hidden"
    );


    await renderAdminLists();

  } catch (error) {

    console.error(
      error
    );

  }

}


/* =========================================================
   ADMIN CHECK
   ========================================================= */

function isAdmin() {

  return (
    currentProfile &&
    currentProfile.role ===
      "admin"
  );

}


/* =========================================================
   PUBLIC CONTENT
   ========================================================= */

async function refreshPublicContent() {

  if (!supabase)
    return;


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

    updateContact();


    if (
      selectedChapter
    ) {

      const exists =
        chapters.find(
          (item) =>
            item.id ===
            selectedChapter.id
        );


      if (exists) {

        openChapter(
          exists.id,
          false
        );

      }

    }

  } catch (error) {

    console.error(
      "Content error:",
      error
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
      .order(
        "sort_order",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Chapters:",
      error
    );

    chapters = [];

    return;

  }


  chapters =
    data || [];

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
      .order(
        "sort_order",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Questions:",
      error
    );

    questions = [];

    return;

  }


  questions =
    data || [];

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
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Categories:",
      error
    );

    categories = [];

    return;

  }


  categories =
    data || [];

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

    console.warn(
      "Settings:",
      error
    );

    siteSettings = {};

    return;

  }


  siteSettings = {};


  (data || []).forEach(
    (item) => {

      if (
        item.key
      ) {

        siteSettings[
          item.key
        ] =
          item.value;

      }

    }
  );

}


/* =========================================================
   CHAPTERS
   ========================================================= */

function renderChapters() {

  if (!chaptersGrid)
    return;


  chaptersGrid.innerHTML =
    "";


  if (
    !chapters.length
  ) {

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

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "chapter-card";


      const count =
        questions.filter(
          (question) =>
            question.chapter_id ===
            chapter.id
        ).length;


      card.innerHTML = `

        <div class="chapter-card-number">
          ${String(
            index + 1
          ).padStart(2, "0")}
        </div>


        <div class="chapter-card-content">

          <span class="section-label">
            CHAPTER ${index + 1}
          </span>


          <h3>
            ${escapeHTML(
              chapter.name ||
              "Chapter"
            )}
          </h3>


          <p>
            ${escapeHTML(
              chapter.description ||
              ""
            )}
          </p>


          <span>
            ${count} سؤال
          </span>

        </div>

      `;


      card.addEventListener(
        "click",
        () => {

          openChapter(
            chapter.id
          );

        }
      );


      chaptersGrid.appendChild(
        card
      );

    }
  );

}


/* =========================================================
   OPEN CHAPTER
   ========================================================= */

function openChapter(
  id,
  scroll = true
) {

  const chapter =
    chapters.find(
      (item) =>
        item.id === id
    );


  if (!chapter)
    return;


  selectedChapter =
    chapter;


  selectedChapterTitle.textContent =
    chapter.name ||
    "Chapter";


  selectedChapterDescription.textContent =
    chapter.description ||
    "";


  const list =
    questions.filter(
      (question) =>
        question.chapter_id ===
        chapter.id
    );


  renderQuestions(
    list
  );


  questionsSection.classList.remove(
    "hidden"
  );


  if (scroll) {

    questionsSection.scrollIntoView({
      behavior: "smooth"
    });

  }

}


/* =========================================================
   QUESTIONS
   ========================================================= */

function renderQuestions(
  list
) {

  questionsList.innerHTML =
    "";


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

      const article =
        document.createElement(
          "article"
        );


      article.className =
        "question-card";


      article.innerHTML = `

        <div class="question-number">
          ${String(
            index + 1
          ).padStart(2, "0")}
        </div>


        <div class="question-body">

          <div class="question-meta">

            ${
              question.categories?.name
                ? `
                  <span>
                    ${escapeHTML(
                      question.categories.name
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
              question.question ||
              ""
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
              ? buildVideo(
                  question.video_url
                )
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


      copyButton.addEventListener(
        "click",
        async () => {

          const text =
            [
              question.title,
              "",
              question.question,
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


          try {

            await navigator.clipboard.writeText(
              text
            );

            copyButton.textContent =
              "COPIED";

            setTimeout(
              () => {

                copyButton.textContent =
                  "COPY QUESTION";

              },
              1500
            );

          } catch {

            showToast(
              "تعذر نسخ السؤال.",
              "error"
            );

          }

        }
      );


      questionsList.appendChild(
        article
      );

    }
  );

}


/* =========================================================
   SEARCH
   ========================================================= */

function renderSearchResults() {

  if (
    !searchResults
  )
    return;


  const query =
    (
      searchInput?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const category =
    categoryFilter?.value ||
    "";


  if (
    !query &&
    !category
  ) {

    searchResults.innerHTML =
      "";

    searchEmpty.classList.add(
      "hidden"
    );

    return;

  }


  const results =
    questions.filter(
      (question) => {

        const text =
          [
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


        return (
          (
            !query ||
            text.includes(query)
          ) &&
          (
            !category ||
            String(
              question.category_id
            ) ===
            String(category)
          )
        );

      }
    );


  searchResults.innerHTML =
    "";


  if (!results.length) {

    searchEmpty.classList.remove(
      "hidden"
    );

    return;

  }


  searchEmpty.classList.add(
    "hidden"
  );


  results.forEach(
    (question) => {

      const item =
        document.createElement(
          "article"
        );


      item.className =
        "search-result-card";


      item.innerHTML = `

        <span class="section-label">
          ${escapeHTML(
            question.chapters?.name ||
            "ARCHIVE"
          )}
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
              question.question ||
              "",
              220
            )
          )}
        </p>

      `;


      item.addEventListener(
        "click",
        () => {

          if (
            question.chapter_id
          ) {

            openChapter(
              question.chapter_id
            );

          }

        }
      );


      searchResults.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   CATEGORIES
   ========================================================= */

function renderCategories() {

  if (
    !categoryFilter
  )
    return;


  categoryFilter.innerHTML = `
    <option value="">
      كل التصنيفات
    </option>
  `;


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


/* =========================================================
   CONTACT
   ========================================================= */

function updateContact() {

  const number =
    getSetting(
      "whatsapp_number",
      "+201213707524"
    );


  const message =
    getSetting(
      "whatsapp_template",
      "مرحبًا، أحتاج إلى المساعدة في Question Archive."
    );


  if (
    contactNumberLabel
  ) {

    contactNumberLabel.textContent =
      number;

  }


  if (
    generalWhatsApp
  ) {

    generalWhatsApp.dataset.number =
      number;

    generalWhatsApp.dataset.message =
      message;

  }


  if (
    whatsappNumber
  ) {

    whatsappNumber.value =
      number;

  }


  if (
    whatsappTemplate
  ) {

    whatsappTemplate.value =
      message;

  }

}


function openGeneralWhatsApp() {

  const number =
    generalWhatsApp.dataset.number ||
    "+201213707524";


  const message =
    generalWhatsApp.dataset.message ||
    "مرحبًا، أحتاج إلى المساعدة.";


  const clean =
    String(number)
      .replace(
        /\D/g,
        ""
      );


  if (!clean)
    return;


  window.open(
    `https://wa.me/${clean}?text=${encodeURIComponent(
      message
    )}`,
    "_blank"
  );

}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function openAdminDashboard() {

  if (!isAdmin()) {

    showToast(
      "هذه المنطقة للأدمن فقط.",
      "error"
    );

    return;

  }


  adminOverlay.classList.remove(
    "hidden"
  );


  adminOverlay.setAttribute(
    "aria-hidden",
    "false"
  );


  renderAdminLists();

}


function closeAdminDashboard() {

  adminOverlay.classList.add(
    "hidden"
  );


  adminOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

}


/* =========================================================
   ADMIN TABS
   ========================================================= */

function switchAdminTab(
  name
) {

  adminTabs.forEach(
    (button) => {

      button.classList.toggle(
        "active",
        button.dataset.adminTab ===
          name
      );

    }
  );


  adminPanels.forEach(
    (panel) => {

      panel.classList.toggle(
        "active",
        panel.dataset.adminPanel ===
          name
      );

    }
  );

}


/* =========================================================
   ADMIN LISTS
   ========================================================= */

async function renderAdminLists() {

  if (!isAdmin())
    return;


  statChapters.textContent =
    chapters.length;


  statQuestions.textContent =
    questions.length;


  statCategories.textContent =
    categories.length;


  renderAdminChapters();

  renderAdminQuestions();

  renderAdminCategories();

  updateContact();

}


/* =========================================================
   ADMIN CHAPTERS
   ========================================================= */

function renderAdminChapters() {

  adminChaptersList.innerHTML =
    "";


  if (!chapters.length) {

    adminChaptersList.innerHTML =
      "<p>لا توجد Chapters.</p>";

    return;

  }


  chapters.forEach(
    (chapter) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div class="admin-list-info">

          <h4>
            ${escapeHTML(
              chapter.name
            )}
          </h4>

          <p>
            ${escapeHTML(
              chapter.description ||
              ""
            )}
          </p>

        </div>


        <div class="admin-list-actions">

          <button
            class="small-button edit"
            type="button">
            EDIT
          </button>

          <button
            class="small-button danger delete"
            type="button">
            DELETE
          </button>

        </div>

      `;


      row.querySelector(
        ".edit"
      ).addEventListener(
        "click",
        () => {

          openEditor(
            "chapter",
            chapter.id
          );

        }
      );


      row.querySelector(
        ".delete"
      ).addEventListener(
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

  adminQuestionsList.innerHTML =
    "";


  if (!questions.length) {

    adminQuestionsList.innerHTML =
      "<p>لا توجد Questions.</p>";

    return;

  }


  questions.forEach(
    (question) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div class="admin-list-info">

          <h4>
            ${escapeHTML(
              question.title ||
              "Question"
            )}
          </h4>

          <p>
            ${escapeHTML(
              truncate(
                question.question ||
                "",
                150
              )
            )}
          </p>

        </div>


        <div class="admin-list-actions">

          <button
            class="small-button edit"
            type="button">
            EDIT
          </button>

          <button
            class="small-button danger delete"
            type="button">
            DELETE
          </button>

        </div>

      `;


      row.querySelector(
        ".edit"
      ).addEventListener(
        "click",
        () => {

          openEditor(
            "question",
            question.id
          );

        }
      );


      row.querySelector(
        ".delete"
      ).addEventListener(
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

  adminCategoriesList.innerHTML =
    "";


  if (!categories.length) {

    adminCategoriesList.innerHTML =
      "<p>لا توجد Categories.</p>";

    return;

  }


  categories.forEach(
    (category) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div class="admin-list-info">

          <h4>
            ${escapeHTML(
              category.name
            )}
          </h4>

          <p>
            ${escapeHTML(
              category.description ||
              ""
            )}
          </p>

        </div>


        <div class="admin-list-actions">

          <button
            class="small-button edit"
            type="button">
            EDIT
          </button>

          <button
            class="small-button danger delete"
            type="button">
            DELETE
          </button>

        </div>

      `;


      row.querySelector(
        ".edit"
      ).addEventListener(
        "click",
        () => {

          openEditor(
            "category",
            category.id
          );

        }
      );


      row.querySelector(
        ".delete"
      ).addEventListener(
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
   EDITOR
   ========================================================= */

function openEditor(
  type,
  id = null
) {

  if (!isAdmin())
    return;


  editorType =
    type;

  editingId =
    id;


  let item =
    null;


  if (
    type === "chapter"
  ) {

    item =
      chapters.find(
        (x) =>
          x.id === id
      );


    editorKicker.textContent =
      "CHAPTER";


    editorTitle.textContent =
      id
        ? "EDIT CHAPTER"
        : "ADD CHAPTER";


    editorForm.innerHTML = `

      <label>
        CHAPTER NAME
      </label>

      <input
        id="editorName"
        type="text"
        value="${escapeAttribute(
          item?.name || ""
        )}"
        required>


      <label>
        DESCRIPTION
      </label>

      <textarea
        id="editorDescription"
        rows="5">${escapeHTML(
          item?.description ||
          ""
        )}</textarea>


      <label>
        COVER IMAGE URL
      </label>

      <input
        id="editorCover"
        type="url"
        value="${escapeAttribute(
          item?.cover_image_url ||
          ""
        )}">


      <label>
        SORT ORDER
      </label>

      <input
        id="editorSort"
        type="number"
        value="${Number(
          item?.sort_order ||
          0
        )}">


      <button
        type="submit"
        class="archive-button primary">

        SAVE CHAPTER

      </button>

    `;

  }


  if (
    type === "category"
  ) {

    item =
      categories.find(
        (x) =>
          x.id === id
      );


    editorKicker.textContent =
      "CATEGORY";


    editorTitle.textContent =
      id
        ? "EDIT CATEGORY"
        : "ADD CATEGORY";


    editorForm.innerHTML = `

      <label>
        CATEGORY NAME
      </label>

      <input
        id="editorName"
        type="text"
        value="${escapeAttribute(
          item?.name || ""
        )}"
        required>


      <label>
        DESCRIPTION
      </label>

      <textarea
        id="editorDescription"
        rows="5">${escapeHTML(
          item?.description ||
          ""
        )}</textarea>


      <button
        type="submit"
        class="archive-button primary">

        SAVE CATEGORY

      </button>

    `;

  }


  if (
    type === "question"
  ) {

    item =
      questions.find(
        (x) =>
          x.id === id
      );


    editorKicker.textContent =
      "QUESTION";


    editorTitle.textContent =
      id
        ? "EDIT QUESTION"
        : "ADD QUESTION";


    editorForm.innerHTML = `

      <label>
        QUESTION TITLE
      </label>

      <input
        id="editorTitleInput"
        type="text"
        value="${escapeAttribute(
          item?.title || ""
        )}"
        required>


      <label>
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
                    item?.chapter_id ||
                    ""
                  ) ===
                  String(
                    chapter.id
                  )
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


      <label>
        CATEGORY
      </label>

      <select
        id="editorCategory">

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
                    item?.category_id ||
                    ""
                  ) ===
                  String(
                    category.id
                  )
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


      <label>
        QUESTION
      </label>

      <textarea
        id="editorQuestion"
        rows="7"
        required>${escapeHTML(
          item?.question ||
          ""
        )}</textarea>


      <label>
        ANSWER
      </label>

      <textarea
        id="editorAnswer"
        rows="5">${escapeHTML(
          item?.answer ||
          ""
        )}</textarea>


      <label>
        EXPLANATION
      </label>

      <textarea
        id="editorExplanation"
        rows="7">${escapeHTML(
          item?.explanation ||
          ""
        )}</textarea>


      <label>
        IMAGE URL
      </label>

      <input
        id="editorImage"
        type="url"
        value="${escapeAttribute(
          item?.image_url ||
          ""
        )}">


      <label>
        VIDEO URL
      </label>

      <input
        id="editorVideo"
        type="url"
        value="${escapeAttribute(
          item?.video_url ||
          ""
        )}">


      <label>
        SORT ORDER
      </label>

      <input
        id="editorSort"
        type="number"
        value="${Number(
          item?.sort_order ||
          0
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

  try {

    if (
      editorType ===
      "chapter"
    ) {

      await saveChapter();

    }


    if (
      editorType ===
      "category"
    ) {

      await saveCategory();

    }


    if (
      editorType ===
      "question"
    ) {

      await saveQuestion();

    }


    closeEditorModal();


    await refreshPublicContent();


    await renderAdminLists();


    showToast(
      "تم الحفظ بنجاح.",
      "success"
    );

  } catch (error) {

    console.error(
      error
    );

    showToast(
      error.message ||
      "حدث خطأ أثناء الحفظ.",
      "error"
    );

  }

}


/* =========================================================
   SAVE CHAPTER
   ========================================================= */

async function saveChapter() {

  const name =
    $("#editorName")
      .value
      .trim();


  const description =
    $("#editorDescription")
      .value
      .trim();


  const cover =
    $("#editorCover")
      .value
      .trim();


  const sort =
    Number(
      $("#editorSort")
        .value ||
      0
    );


  if (!name) {

    throw new Error(
      "اكتب اسم الـChapter."
    );

  }


  const payload = {

    name,

    description:
      description ||
      null,

    cover_image_url:
      cover ||
      null,

    sort_order:
      sort

  };


  if (editingId) {

    const {
      error
    } =
      await supabase
        .from(
          TABLES.chapters
        )
        .update(
          payload
        )
        .eq(
          "id",
          editingId
        );


    if (error)
      throw error;

  } else {

    payload.created_by =
      currentUser.id;


    const {
      error
    } =
      await supabase
        .from(
          TABLES.chapters
        )
        .insert(
          payload
        );


    if (error)
      throw error;

  }

}


/* =========================================================
   SAVE CATEGORY
   ========================================================= */

async function saveCategory() {

  const name =
    $("#editorName")
      .value
      .trim();


  const description =
    $("#editorDescription")
      .value
      .trim();


  if (!name) {

    throw new Error(
      "اكتب اسم الـCategory."
    );

  }


  const payload = {

    name,

    description:
      description ||
      null

  };


  if (editingId) {

    const {
      error
    } =
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


    if (error)
      throw error;

  } else {

    payload.created_by =
      currentUser.id;


    const {
      error
    } =
      await supabase
        .from(
          TABLES.categories
        )
        .insert(
          payload
        );


    if (error)
      throw error;

  }

}


/* =========================================================
   SAVE QUESTION
   ========================================================= */

async function saveQuestion() {

  const title =
    $("#editorTitleInput")
      .value
      .trim();


  const chapter =
    $("#editorChapter")
      .value;


  const category =
    $("#editorCategory")
      .value ||
      null;


  const question =
    $("#editorQuestion")
      .value
      .trim();


  const answer =
    $("#editorAnswer")
      .value
      .trim();


  const explanation =
    $("#editorExplanation")
      .value
      .trim();


  const image =
    $("#editorImage")
      .value
      .trim();


  const video =
    $("#editorVideo")
      .value
      .trim();


  const sort =
    Number(
      $("#editorSort")
        .value ||
      0
    );


  if (!title)
    throw new Error(
      "اكتب عنوان السؤال."
    );


  if (!chapter)
    throw new Error(
      "اختر Chapter."
    );


  if (!question)
    throw new Error(
      "اكتب السؤال."
    );


  const payload = {

    title,

    chapter_id:
      chapter,

    category_id:
      category,

    question,

    answer:
      answer ||
      null,

    explanation:
      explanation ||
      null,

    image_url:
      image ||
      null,

    video_url:
      video ||
      null,

    sort_order:
      sort

  };


  if (editingId) {

    const {
      error
    } =
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


    if (error)
      throw error;

  } else {

    payload.created_by =
      currentUser.id;


    const {
      error
    } =
      await supabase
        .from(
          TABLES.questions
        )
        .insert(
          payload
        );


    if (error)
      throw error;

  }

}


/* =========================================================
   DELETE CHAPTER
   ========================================================= */

async function deleteChapter(
  id
) {

  if (!isAdmin())
    return;


  const hasQuestions =
    questions.some(
      (question) =>
        question.chapter_id ===
        id
    );


  if (hasQuestions) {

    showToast(
      "احذف أسئلة الـChapter أولًا.",
      "error"
    );

    return;

  }


  if (
    !confirm(
      "هل تريد حذف هذا Chapter؟"
    )
  )
    return;


  const {
    error
  } =
    await supabase
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
      getDbError(error),
      "error"
    );

    return;

  }


  await refreshPublicContent();

  await renderAdminLists();


  showToast(
    "تم حذف Chapter.",
    "success"
  );

}


/* =========================================================
   DELETE QUESTION
   ========================================================= */

async function deleteQuestion(
  id
) {

  if (!isAdmin())
    return;


  if (
    !confirm(
      "هل تريد حذف هذا السؤال؟"
    )
  )
    return;


  const {
    error
  } =
    await supabase
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
      getDbError(error),
      "error"
    );

    return;

  }


  await refreshPublicContent();

  await renderAdminLists();


  showToast(
    "تم حذف السؤال.",
    "success"
  );

}


/* =========================================================
   DELETE CATEGORY
   ========================================================= */

async function deleteCategory(
  id
) {

  if (!isAdmin())
    return;


  const used =
    questions.some(
      (question) =>
        String(
          question.category_id
        ) ===
        String(id)
    );


  if (used) {

    showToast(
      "هذا التصنيف مستخدم في سؤال.",
      "error"
    );

    return;

  }


  if (
    !confirm(
      "هل تريد حذف هذا التصنيف؟"
    )
  )
    return;


  const {
    error
  } =
    await supabase
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
      getDbError(error),
      "error"
    );

    return;

  }


  await refreshPublicContent();

  await renderAdminLists();


  showToast(
    "تم حذف التصنيف.",
    "success"
  );

}


/* =========================================================
   CONTACT SETTINGS
   ========================================================= */

async function saveContactSettings(
  event
) {

  event.preventDefault();


  if (!isAdmin())
    return;


  const number =
    whatsappNumber.value.trim();


  const message =
    whatsappTemplate.value.trim();


  try {

    await upsertSetting(
      "whatsapp_number",
      number
    );


    await upsertSetting(
      "whatsapp_template",
      message
    );


    await loadSettings();

    updateContact();


    showToast(
      "تم حفظ الإعدادات.",
      "success"
    );

  } catch (error) {

    console.error(
      error
    );

    showToast(
      getDbError(error),
      "error"
    );

  }

}


async function upsertSetting(
  key,
  value
) {

  const {
    data: existing,
    error: findError
  } =
    await supabase
      .from(
        TABLES.settings
      )
      .select("key")
      .eq(
        "key",
        key
      )
      .maybeSingle();


  if (findError)
    throw findError;


  if (existing) {

    const {
      error
    } =
      await supabase
        .from(
          TABLES.settings
        )
        .update({
          value,
          updated_by:
            currentUser.id,
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "key",
          key
        );


    if (error)
      throw error;

  } else {

    const {
      error
    } =
      await supabase
        .from(
          TABLES.settings
        )
        .insert({

          key,

          value,

          updated_by:
            currentUser.id,

          updated_at:
            new Date().toISOString()

        });


    if (error)
      throw error;

  }

}


/* =========================================================
   VIDEO
   ========================================================= */

function buildVideo(
  url
) {

  const id =
    getYouTubeId(url);


  if (id) {

    return `

      <div class="question-video">

        <iframe
          src="https://www.youtube.com/embed/${escapeAttribute(
            id
          )}"
          title="Question video"
          loading="lazy"
          allowfullscreen>
        </iframe>

      </div>

    `;

  }


  return `

    <div class="video-link-box">

      <a
        href="${escapeAttribute(
          url
        )}"
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
        .replace(
          "/",
          ""
        )
        .split(
          "/"
        )[0];

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
          .split(
            "/embed/"
          )[1]
          ?.split(
            "/"
          )[0];

      }


      if (
        parsed.pathname.startsWith(
          "/shorts/"
        )
      ) {

        return parsed.pathname
          .split(
            "/shorts/"
          )[1]
          ?.split(
            "/"
          )[0];

      }

    }

  } catch {

    return null;

  }


  return null;

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


  if (editorForm) {

    editorForm.innerHTML =
      "";

    editorForm.onsubmit =
      null;

  }


  editorType =
    null;

  editingId =
    null;

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
  element,
  message,
  type
) {

  if (!element)
    return;


  element.textContent =
    message;


  element.className =
    `auth-status ${type || ""}`;

}


function getAuthError(
  error
) {

  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "invalid login credentials"
    )
  ) {

    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

  }


  if (
    message.includes(
      "email not confirmed"
    )
  ) {

    return "يجب تأكيد البريد الإلكتروني أولًا.";

  }


  return (
    error?.message ||
    "تعذر تسجيل الدخول."
  );

}


/* =========================================================
   SETTINGS
   ========================================================= */

function getSetting(
  key,
  fallback
) {

  if (
    siteSettings[key] ===
    undefined ||
    siteSettings[key] ===
    null ||
    siteSettings[key] ===
    ""
  ) {

    return fallback;

  }


  return siteSettings[key];

}


/* =========================================================
   TEXT
   ========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ??
    ""
  )
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

  return escapeHTML(
    value
  );

}


function formatText(
  text
) {

  return escapeHTML(
    text
  ).replace(
    /\n/g,
    "<br>"
  );

}


function truncate(
  text,
  length
) {

  const value =
    String(
      text ||
      ""
    );


  if (
    value.length <=
    length
  ) {

    return value;

  }


  return (
    value.substring(
      0,
      length
    ) +
    "..."
  );

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = "info"
) {

  if (!toastRegion)
    return;


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


  setTimeout(
    () => {

      toast.classList.add(
        "show"
      );

    },
    20
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
        300
      );

    },
    3000
  );

}


/* =========================================================
   DATABASE ERROR
   ========================================================= */

function getDbError(
  error
) {

  if (
    error?.code ===
    "42501"
  ) {

    return "لا توجد صلاحية لتنفيذ العملية. تحقق من RLS في Supabase.";

  }


  if (
    error?.code ===
    "23505"
  ) {

    return "العنصر موجود بالفعل.";

  }


  if (
    error?.code ===
    "23503"
  ) {

    return "لا يمكن تنفيذ العملية لأن هناك بيانات مرتبطة بهذا العنصر.";

  }


  return (
    error?.message ||
    "حدث خطأ في قاعدة البيانات."
  );

}


/* =========================================================
   END
   ========================================================= */
