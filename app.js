/* =========================================================
   QUESTION ARCHIVE — COMPLETE APP.JS
   Student enters directly
   Admin login only
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://ezzvciyzqpgbbokopvzx.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_8LtNCb9mSVJutvGk7mBJRA_nfG3gd4f";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let supabaseClient = null;

let currentUser = null;
let currentProfile = null;

let chapters = [];
let questions = [];
let categories = [];
let siteSettings = {};

let selectedChapterId = null;


/* =========================================================
   DOM HELPER
   ========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    initializeSupabase();
    initializeUI();
    bindEvents();

    await loadPublicContent();
    await checkExistingAdminSession();

  } catch (error) {
    console.error("BOOT ERROR:", error);
    showToast("حدث خطأ أثناء تشغيل الموقع.");
  }
});


/* =========================================================
   SUPABASE
   ========================================================= */

function initializeSupabase() {

  if (!window.supabase) {
    console.error("Supabase library not loaded.");

    showToast(
      "Supabase لم يتم تحميله. تأكد من وجود مكتبة Supabase في index.html."
    );

    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  console.log("Supabase initialized.");
}


/* =========================================================
   UI INITIALIZATION
   ========================================================= */

function initializeUI() {

  const appShell = $("appShell");
  const authScreen = $("authScreen");

  if (appShell) {
    appShell.classList.remove("hidden");
    appShell.style.display = "";
  }

  if (authScreen) {
    authScreen.classList.add("hidden");
    authScreen.style.display = "none";
    authScreen.setAttribute("aria-hidden", "true");
  }

  const roleBadge = $("userRoleBadge");

  if (roleBadge) {
    roleBadge.textContent = "STUDENT";
  }

  const adminLoginButton = $("adminLoginButton");

  if (adminLoginButton) {
    adminLoginButton.style.display = "";
  }

  const adminNavButton = $("adminNavButton");

  if (adminNavButton) {
    adminNavButton.classList.add("hidden");
  }

  const footerYear = $("footerYear");

  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {

  const adminLoginButton = $("adminLoginButton");

  if (adminLoginButton) {
    adminLoginButton.onclick = function () {
      showAdminLogin();
    };
  }


  const adminNavButton = $("adminNavButton");

  if (adminNavButton) {
    adminNavButton.onclick = function () {
      openAdminDashboard();
    };
  }


  const closeAdmin = $("closeAdmin");

  if (closeAdmin) {
    closeAdmin.onclick = function () {
      closeAdminDashboard();
    };
  }


  const closeEditor = $("closeEditor");

  if (closeEditor) {
    closeEditor.onclick = function () {
      closeEditorModal();
    };
  }


  const editorForm = $("editorForm");

  if (editorForm) {
    editorForm.addEventListener(
      "submit",
      saveEditor
    );
  }


  const searchInput = $("searchInput");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      renderSearchResults
    );
  }


  const categoryFilter = $("categoryFilter");

  if (categoryFilter) {
    categoryFilter.addEventListener(
      "change",
      renderSearchResults
    );
  }


  const addChapterButton = $("addChapterButton");

  if (addChapterButton) {
    addChapterButton.onclick = function () {
      openEditor("chapter");
    };
  }


  const addQuestionButton = $("addQuestionButton");

  if (addQuestionButton) {
    addQuestionButton.onclick = function () {
      openEditor("question");
    };
  }


  const addCategoryButton = $("addCategoryButton");

  if (addCategoryButton) {
    addCategoryButton.onclick = function () {
      openEditor("category");
    };
  }


  const contactSettingsForm = $("contactSettingsForm");

  if (contactSettingsForm) {
    contactSettingsForm.addEventListener(
      "submit",
      saveContactSettings
    );
  }


  document.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Escape") {

        closeAdminDashboard();
        closeEditorModal();

      }

    }
  );
}


/* =========================================================
   ADMIN LOGIN SCREEN
   ========================================================= */

window.showAdminLogin = showAdminLogin;

function showAdminLogin() {

  const authScreen = $("authScreen");
  const appShell = $("appShell");

  if (!authScreen) {
    alert(
      "ERROR: authScreen غير موجود في index.html"
    );

    return;
  }


  authScreen.classList.remove("hidden");

  authScreen.style.display = "flex";

  authScreen.setAttribute(
    "aria-hidden",
    "false"
  );


  if (appShell) {
    appShell.style.display = "none";
  }


  authScreen.innerHTML = `

    <div class="auth-frame">

      <div class="auth-content">

        <div class="auth-kicker">
          ADMIN AREA
        </div>

        <h1>
          ADMIN LOGIN
        </h1>

        <p>
          Sign in to manage the question archive.
        </p>


        <form
          id="adminLoginForm"
          class="auth-form"
        >

          <label>
            Email

            <input
              id="adminEmail"
              type="email"
              autocomplete="email"
              placeholder="admin@example.com"
              required
            >

          </label>


          <label>
            Password

            <input
              id="adminPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Password"
              required
            >

          </label>


          <button
            type="submit"
            id="adminSubmitButton"
          >
            LOGIN
          </button>


          <button
            type="button"
            id="cancelAdminLogin"
          >
            CANCEL
          </button>


          <div
            id="authStatus"
            class="auth-status"
          ></div>

        </form>

      </div>

    </div>

  `;


  const form = $("adminLoginForm");

  const cancelButton =
    $("cancelAdminLogin");


  if (form) {

    form.addEventListener(
      "submit",
      handleAdminLogin
    );

  }


  if (cancelButton) {

    cancelButton.onclick =
      closeAdminLogin;

  }
}


/* =========================================================
   CLOSE ADMIN LOGIN
   ========================================================= */

function closeAdminLogin() {

  const authScreen = $("authScreen");
  const appShell = $("appShell");

  if (authScreen) {

    authScreen.classList.add("hidden");

    authScreen.style.display = "none";

    authScreen.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  if (appShell) {

    appShell.style.display = "";

  }
}


/* =========================================================
   ADMIN LOGIN
   ========================================================= */

async function handleAdminLogin(event) {

  event.preventDefault();

  const email =
    $("adminEmail")?.value.trim();

  const password =
    $("adminPassword")?.value;

  const status =
    $("authStatus");

  const submitButton =
    $("adminSubmitButton");


  if (!status) {
    return;
  }


  if (!email || !password) {

    status.textContent =
      "اكتب البريد الإلكتروني وكلمة المرور.";

    return;
  }


  if (!supabaseClient) {

    status.textContent =
      "Supabase غير متصل.";

    return;
  }


  try {

    if (submitButton) {

      submitButton.disabled = true;

      submitButton.textContent =
        "CONNECTING...";

    }


    status.textContent =
      "Connecting to Supabase...";


    /*
      Timeout:
      يمنع الموقع من البقاء على
      Logging in إلى ما لا نهاية.
    */

    const timeoutPromise =
      new Promise(
        (_, reject) => {

          setTimeout(
            () => {

              reject(
                new Error(
                  "انتهت مهلة الاتصال بـ Supabase."
                )
              );

            },
            15000
          );

        }
      );


    const loginPromise =
      supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });


    const result =
      await Promise.race([
        loginPromise,
        timeoutPromise
      ]);


    const {
      data,
      error
    } = result;


    if (error) {

      console.error(
        "SUPABASE LOGIN ERROR:",
        error
      );

      status.textContent =
        "Login Error: " +
        error.message;

      return;
    }


    if (
      !data ||
      !data.user
    ) {

      status.textContent =
        "لم يتم العثور على المستخدم.";

      return;
    }


    status.textContent =
      "Checking admin account...";


    const profilePromise =
      supabaseClient
        .from("profiles")
        .select(
          "id, full_name, role"
        )
        .eq(
          "id",
          data.user.id
        )
        .maybeSingle();


    const profileTimeout =
      new Promise(
        (_, reject) => {

          setTimeout(
            () => {

              reject(
                new Error(
                  "انتهت مهلة قراءة profiles."
                )
              );

            },
            15000
          );

        }
      );


    const profileResult =
      await Promise.race([
        profilePromise,
        profileTimeout
      ]);


    const {
      data: profile,
      error: profileError
    } = profileResult;


    if (profileError) {

      console.error(
        "PROFILE ERROR:",
        profileError
      );

      status.textContent =
        "Profile Error: " +
        profileError.message;

      return;
    }


    if (!profile) {

      await supabaseClient.auth.signOut();

      status.textContent =
        "الحساب موجود ولكن لا يوجد له Profile.";

      return;
    }


    if (
      profile.role !== "admin"
    ) {

      await supabaseClient.auth.signOut();

      status.textContent =
        "هذا الحساب ليس Admin.";

      return;
    }


    currentUser =
      data.user;

    currentProfile =
      profile;


    status.textContent =
      "Login successful!";


    setAdminUI();


    setTimeout(
      () => {

        closeAdminLogin();

        openAdminDashboard();

      },
      500
    );


  } catch (error) {

    console.error(
      "ADMIN LOGIN ERROR:",
      error
    );


    status.textContent =
      "ERROR: " +
      (
        error?.message ||
        "Unknown error"
      );

  } finally {

    if (submitButton) {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "LOGIN";

    }

  }
}


/* =========================================================
   EXISTING SESSION
   ========================================================= */

async function checkExistingAdminSession() {

  if (!supabaseClient) {
    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "SESSION ERROR:",
        error
      );

      return;
    }


    if (
      data &&
      data.session &&
      data.session.user
    ) {

      await checkAdminUser(
        data.session.user
      );

    }

  } catch (error) {

    console.error(
      "SESSION CHECK ERROR:",
      error
    );

  }


  supabaseClient.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      console.log(
        "AUTH EVENT:",
        event
      );


      if (
        session &&
        session.user
      ) {

        await checkAdminUser(
          session.user
        );

      }

    }
  );
}


/* =========================================================
   CHECK ADMIN USER
   ========================================================= */

async function checkAdminUser(user) {

  if (!user || !supabaseClient) {
    return false;
  }


  try {

    const {
      data: profile,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id, full_name, role"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();


    if (error) {

      console.error(
        "PROFILE CHECK ERROR:",
        error
      );

      return false;
    }


    if (
      !profile ||
      profile.role !== "admin"
    ) {

      return false;
    }


    currentUser =
      user;

    currentProfile =
      profile;


    setAdminUI();

    return true;


  } catch (error) {

    console.error(
      "ADMIN CHECK ERROR:",
      error
    );

    return false;

  }
}


/* =========================================================
   ADMIN UI
   ========================================================= */

function setAdminUI() {

  const roleBadge =
    $("userRoleBadge");

  if (roleBadge) {

    roleBadge.textContent =
      "ADMIN";

  }


  const loginButton =
    $("adminLoginButton");

  if (loginButton) {

    loginButton.style.display =
      "none";

  }


  const adminButton =
    $("adminNavButton");

  if (adminButton) {

    adminButton.classList.remove(
      "hidden"
    );

    adminButton.style.display =
      "";

  }
}


/* =========================================================
   PUBLIC CONTENT
   ========================================================= */

async function loadPublicContent() {

  if (!supabaseClient) {
    return;
  }


  await Promise.all([
    loadChapters(),
    loadQuestions(),
    loadCategories(),
    loadSettings()
  ]);


  renderChapters();
  renderCategories();
  renderSearchResults();
  renderQuestions();
  renderContact();
}


/* =========================================================
   CHAPTERS
   ========================================================= */

async function loadChapters() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("chapters")
      .select("*")
      .order(
        "sort_order",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "CHAPTERS ERROR:",
      error
    );

    return;
  }


  chapters =
    data || [];
}


function renderChapters() {

  const container =
    $("chaptersGrid");

  const empty =
    $("chaptersEmpty");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!chapters.length) {

    if (empty) {
      empty.classList.remove(
        "hidden"
      );
    }

    return;
  }


  if (empty) {
    empty.classList.add(
      "hidden"
    );
  }


  chapters.forEach(
    (chapter) => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "chapter-card";


      card.innerHTML = `

        <div class="chapter-card-image">

          ${
            chapter.cover_image_url
              ? `
                <img
                  src="${escapeAttribute(
                    chapter.cover_image_url
                  )}"
                  alt="${escapeAttribute(
                    chapter.name
                  )}"
                >
              `
              : ""
          }

        </div>


        <div class="chapter-card-body">

          <h3>
            ${escapeHTML(
              chapter.name
            )}
          </h3>

          <p>
            ${escapeHTML(
              chapter.description ||
              "No description available."
            )}
          </p>

          <button
            type="button"
            class="text-button"
            data-chapter-id="${chapter.id}"
          >
            OPEN CHAPTER
          </button>

        </div>

      `;


      const button =
        card.querySelector(
          "button"
        );


      button.onclick = () => {

        openChapter(
          chapter.id
        );

      };


      container.appendChild(
        card
      );

    }
  );
}


/* =========================================================
   OPEN CHAPTER
   ========================================================= */

function openChapter(
  chapterId
) {

  selectedChapterId =
    Number(chapterId);


  const chapter =
    chapters.find(
      item =>
        Number(item.id) ===
        selectedChapterId
    );


  if (!chapter) {
    return;
  }


  const title =
    $("selectedChapterTitle");

  const description =
    $("selectedChapterDescription");


  if (title) {

    title.textContent =
      chapter.name;

  }


  if (description) {

    description.textContent =
      chapter.description ||
      "";

  }


  renderQuestions();


  const section =
    $("questionsSection");


  if (section) {

    section.scrollIntoView({
      behavior: "smooth"
    });

  }
}


/* =========================================================
   QUESTIONS
   ========================================================= */

async function loadQuestions() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("questions")
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
      "QUESTIONS ERROR:",
      error
    );

    return;
  }


  questions =
    data || [];
}


function renderQuestions() {

  const container =
    $("questionsList");

  const empty =
    $("questionsEmpty");


  if (!container) {
    return;
  }


  let list =
    questions;


  if (selectedChapterId) {

    list =
      list.filter(
        question =>
          Number(
            question.chapter_id
          ) ===
          selectedChapterId
      );

  }


  container.innerHTML = "";


  if (!list.length) {

    if (empty) {
      empty.classList.remove(
        "hidden"
      );
    }

    return;
  }


  if (empty) {
    empty.classList.add(
      "hidden"
    );
  }


  list.forEach(
    question => {

      const article =
        document.createElement(
          "article"
        );


      article.className =
        "question-card";


      article.innerHTML = `

        <div class="question-card-head">

          <span>
            ${escapeHTML(
              question.categories?.name ||
              "General"
            )}
          </span>

          <h3>
            ${escapeHTML(
              question.title
            )}
          </h3>

        </div>


        <div class="question-body">

          <div class="question-text">

            ${formatText(
              question.question
            )}

          </div>


          ${
            question.image_url
              ? `
                <img
                  class="question-image"
                  src="${escapeAttribute(
                    question.image_url
                  )}"
                  alt=""
                >
              `
              : ""
          }


          ${
            question.video_url
              ? renderVideo(
                  question.video_url
                )
              : ""
          }


          ${
            question.answer
              ? `
                <details>
                  <summary>
                    ANSWER
                  </summary>

                  <div class="answer-content">
                    ${formatText(
                      question.answer
                    )}
                  </div>

                </details>
              `
              : ""
          }


          ${
            question.explanation
              ? `
                <details>
                  <summary>
                    EXPLANATION
                  </summary>

                  <div class="answer-content">
                    ${formatText(
                      question.explanation
                    )}
                  </div>

                </details>
              `
              : ""
          }

        </div>

      `;


      container.appendChild(
        article
      );

    }
  );
}


/* =========================================================
   CATEGORIES
   ========================================================= */

async function loadCategories() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("categories")
      .select("*")
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "CATEGORIES ERROR:",
      error
    );

    return;
  }


  categories =
    data || [];
}


function renderCategories() {

  const select =
    $("categoryFilter");


  if (!select) {
    return;
  }


  select.innerHTML =
    `<option value="">
      All categories
    </option>`;


  categories.forEach(
    category => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        category.id;


      option.textContent =
        category.name;


      select.appendChild(
        option
      );

    }
  );
}


/* =========================================================
   SEARCH
   ========================================================= */

function renderSearchResults() {

  const container =
    $("searchResults");

  const empty =
    $("searchEmpty");

  const input =
    $("searchInput");

  const filter =
    $("categoryFilter");


  if (!container) {
    return;
  }


  const query =
    (
      input?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const categoryId =
    filter?.value || "";


  let results =
    questions;


  if (query) {

    results =
      results.filter(
        question => {

          const text =
            [
              question.title,
              question.question,
              question.answer,
              question.explanation
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


          return text.includes(
            query
          );

        }
      );

  }


  if (categoryId) {

    results =
      results.filter(
        question =>
          String(
            question.category_id
          ) ===
          String(categoryId)
      );

  }


  container.innerHTML = "";


  if (!results.length) {

    if (empty) {
      empty.classList.remove(
        "hidden"
      );
    }

    return;
  }


  if (empty) {
    empty.classList.add(
      "hidden"
    );
  }


  results.forEach(
    question => {

      const item =
        document.createElement(
          "article"
        );


      item.className =
        "search-result";


      item.innerHTML = `

        <h3>
          ${escapeHTML(
            question.title
          )}
        </h3>

        <p>
          ${escapeHTML(
            truncate(
              question.question,
              180
            )
          )}
        </p>

        <button
          type="button"
          class="text-button"
        >
          OPEN
        </button>

      `;


      item
        .querySelector("button")
        .onclick = () => {

          if (
            question.chapter_id
          ) {

            openChapter(
              question.chapter_id
            );

          }

        };


      container.appendChild(
        item
      );

    }
  );
}


/* =========================================================
   SETTINGS
   ========================================================= */

async function loadSettings() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("site_settings")
      .select("*");


  if (error) {

    console.error(
      "SETTINGS ERROR:",
      error
    );

    return;
  }


  siteSettings = {};


  (data || []).forEach(
    setting => {

      siteSettings[
        setting.key
      ] =
        setting.value;

    }
  );
}


function renderContact() {

  const number =
    siteSettings.whatsapp_number ||
    "+201213707524";


  const template =
    siteSettings.whatsapp_template ||
    "مرحباً، أحتاج إلى مساعدة.";


  const numberLabel =
    $("contactNumberLabel");


  if (numberLabel) {

    numberLabel.textContent =
      number;

  }


  const whatsapp =
    $("generalWhatsApp");


  if (whatsapp) {

    whatsapp.href =
      "https://wa.me/" +
      number.replace(
        /\D/g,
        ""
      ) +
      "?text=" +
      encodeURIComponent(
        template
      );

  }
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function openAdminDashboard() {

  if (!isAdmin()) {

    showToast(
      "يجب تسجيل الدخول كـ Admin."
    );

    return;
  }


  const overlay =
    $("adminOverlay");


  if (!overlay) {
    return;
  }


  overlay.classList.remove(
    "hidden"
  );


  overlay.style.display =
    "flex";


  renderAdminLists();
}


function closeAdminDashboard() {

  const overlay =
    $("adminOverlay");


  if (!overlay) {
    return;
  }


  overlay.classList.add(
    "hidden"
  );


  overlay.style.display =
    "none";
}


async function renderAdminLists() {

  renderAdminChapters();
  renderAdminQuestions();
  renderAdminCategories();

  updateStats();

  renderAdminContact();
}


function updateStats() {

  const chaptersStat =
    $("statChapters");

  const questionsStat =
    $("statQuestions");

  const categoriesStat =
    $("statCategories");


  if (chaptersStat) {

    chaptersStat.textContent =
      chapters.length;

  }


  if (questionsStat) {

    questionsStat.textContent =
      questions.length;

  }


  if (categoriesStat) {

    categoriesStat.textContent =
      categories.length;

  }
}


/* =========================================================
   ADMIN CHAPTERS
   ========================================================= */

function renderAdminChapters() {

  const container =
    $("adminChaptersList");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  chapters.forEach(
    chapter => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div>

          <strong>
            ${escapeHTML(
              chapter.name
            )}
          </strong>

          <small>
            ${escapeHTML(
              chapter.description ||
              ""
            )}
          </small>

        </div>


        <div class="admin-actions">

          <button
            type="button"
            data-edit
          >
            EDIT
          </button>

          <button
            type="button"
            data-delete
          >
            DELETE
          </button>

        </div>

      `;


      row
        .querySelector(
          "[data-edit]"
        )
        .onclick = () =>
          openEditor(
            "chapter",
            chapter.id
          );


      row
        .querySelector(
          "[data-delete]"
        )
        .onclick = () =>
          deleteChapter(
            chapter.id
          );


      container.appendChild(
        row
      );

    }
  );
}


/* =========================================================
   ADMIN QUESTIONS
   ========================================================= */

function renderAdminQuestions() {

  const container =
    $("adminQuestionsList");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  questions.forEach(
    question => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div>

          <strong>
            ${escapeHTML(
              question.title
            )}
          </strong>

          <small>
            ${escapeHTML(
              question.chapters?.name ||
              "No chapter"
            )}
          </small>

        </div>


        <div class="admin-actions">

          <button
            type="button"
            data-edit
          >
            EDIT
          </button>

          <button
            type="button"
            data-delete
          >
            DELETE
          </button>

        </div>

      `;


      row
        .querySelector(
          "[data-edit]"
        )
        .onclick = () =>
          openEditor(
            "question",
            question.id
          );


      row
        .querySelector(
          "[data-delete]"
        )
        .onclick = () =>
          deleteQuestion(
            question.id
          );


      container.appendChild(
        row
      );

    }
  );
}


/* =========================================================
   ADMIN CATEGORIES
   ========================================================= */

function renderAdminCategories() {

  const container =
    $("adminCategoriesList");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  categories.forEach(
    category => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "admin-list-item";


      row.innerHTML = `

        <div>

          <strong>
            ${escapeHTML(
              category.name
            )}
          </strong>

          <small>
            ${escapeHTML(
              category.description ||
              ""
            )}
          </small>

        </div>


        <div class="admin-actions">

          <button
            type="button"
            data-edit
          >
            EDIT
          </button>

          <button
            type="button"
            data-delete
          >
            DELETE
          </button>

        </div>

      `;


      row
        .querySelector(
          "[data-edit]"
        )
        .onclick = () =>
          openEditor(
            "category",
            category.id
          );


      row
        .querySelector(
          "[data-delete]"
        )
        .onclick = () =>
          deleteCategory(
            category.id
          );


      container.appendChild(
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

  if (!isAdmin()) {

    showToast(
      "Admin only."
    );

    return;
  }


  const modal =
    $("editorModal");


  const form =
    $("editorForm");


  const title =
    $("editorTitle");


  const kicker =
    $("editorKicker");


  if (
    !modal ||
    !form
  ) {
    return;
  }


  form.innerHTML = "";


  kicker.textContent =
    type.toUpperCase();


  title.textContent =
    id
      ? "EDIT"
      : "CREATE";


  form.dataset.type =
    type;


  form.dataset.id =
    id || "";


  if (type === "chapter") {

    const item =
      chapters.find(
        x =>
          String(x.id) ===
          String(id)
      );


    form.innerHTML = `

      <label>
        Chapter name

        <input
          name="name"
          required
          value="${escapeAttribute(
            item?.name || ""
          )}"
        >
      </label>


      <label>
        Description

        <textarea
          name="description"
        >${escapeHTML(
          item?.description || ""
        )}</textarea>
      </label>


      <label>
        Cover image URL

        <input
          name="cover_image_url"
          value="${escapeAttribute(
            item?.cover_image_url || ""
          )}"
        >
      </label>


      <label>
        Sort order

        <input
          name="sort_order"
          type="number"
          value="${item?.sort_order || 0}"
        >
      </label>


      <button type="submit">
        SAVE
      </button>

    `;

  }


  if (type === "category") {

    const item =
      categories.find(
        x =>
          String(x.id) ===
          String(id)
      );


    form.innerHTML = `

      <label>
        Category name

        <input
          name="name"
          required
          value="${escapeAttribute(
            item?.name || ""
          )}"
        >
      </label>


      <label>
        Description

        <textarea
          name="description"
        >${escapeHTML(
          item?.description || ""
        )}</textarea>
      </label>


      <button type="submit">
        SAVE
      </button>

    `;

  }


  if (type === "question") {

    const item =
      questions.find(
        x =>
          String(x.id) ===
          String(id)
      );


    form.innerHTML = `

      <label>
        Title

        <input
          name="title"
          required
          value="${escapeAttribute(
            item?.title || ""
          )}"
        >
      </label>


      <label>
        Chapter

        <select
          name="chapter_id"
        >

          <option value="">
            No chapter
          </option>

          ${chapters.map(
            chapter => `
              <option
                value="${chapter.id}"
                ${
                  String(
                    item?.chapter_id
                  ) ===
                  String(
                    chapter.id
                  )
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(
                  chapter.name
                )}
              </option>
            `
          ).join("")}

        </select>

      </label>


      <label>
        Category

        <select
          name="category_id"
        >

          <option value="">
            No category
          </option>

          ${categories.map(
            category => `
              <option
                value="${category.id}"
                ${
                  String(
                    item?.category_id
                  ) ===
                  String(
                    category.id
                  )
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(
                  category.name
                )}
              </option>
            `
          ).join("")}

        </select>

      </label>


      <label>
        Question

        <textarea
          name="question"
          required
        >${escapeHTML(
          item?.question || ""
        )}</textarea>
      </label>


      <label>
        Answer

        <textarea
          name="answer"
        >${escapeHTML(
          item?.answer || ""
        )}</textarea>
      </label>


      <label>
        Explanation

        <textarea
          name="explanation"
        >${escapeHTML(
          item?.explanation || ""
        )}</textarea>
      </label>


      <label>
        Image URL

        <input
          name="image_url"
          value="${escapeAttribute(
            item?.image_url || ""
          )}"
        >
      </label>


      <label>
        Video URL

        <input
          name="video_url"
          value="${escapeAttribute(
            item?.video_url || ""
          )}"
        >
      </label>


      <label>
        Sort order

        <input
          name="sort_order"
          type="number"
          value="${item?.sort_order || 0}"
        >
      </label>


      <button type="submit">
        SAVE
      </button>

    `;

  }


  modal.classList.remove(
    "hidden"
  );


  modal.style.display =
    "flex";
}


/* =========================================================
   CLOSE EDITOR
   ========================================================= */

function closeEditorModal() {

  const modal =
    $("editorModal");


  if (!modal) {
    return;
  }


  modal.classList.add(
    "hidden"
  );


  modal.style.display =
    "none";
}


/* =========================================================
   SAVE EDITOR
   ========================================================= */

async function saveEditor(event) {

  event.preventDefault();


  if (!isAdmin()) {

    showToast(
      "Admin only."
    );

    return;
  }


  const form =
    event.target;


  const type =
    form.dataset.type;


  const id =
    form.dataset.id;


  const data =
    Object.fromEntries(
      new FormData(form)
    );


  try {

    if (type === "chapter") {

      await saveChapter(
        id,
        data
      );

    }


    if (type === "category") {

      await saveCategory(
        id,
        data
      );

    }


    if (type === "question") {

      await saveQuestion(
        id,
        data
      );

    }


    closeEditorModal();

    await loadPublicContent();

    renderAdminLists();

    showToast(
      "Saved successfully."
    );


  } catch (error) {

    console.error(
      "SAVE ERROR:",
      error
    );

    showToast(
      error.message ||
      "Save failed."
    );

  }
}


/* =========================================================
   SAVE CHAPTER
   ========================================================= */

async function saveChapter(
  id,
  data
) {

  const payload = {

    name:
      data.name,

    description:
      data.description || null,

    cover_image_url:
      data.cover_image_url || null,

    sort_order:
      Number(
        data.sort_order || 0
      ),

    created_by:
      currentUser?.id || null

  };


  let result;


  if (id) {

    result =
      await supabaseClient
        .from("chapters")
        .update(payload)
        .eq(
          "id",
          id
        );

  } else {

    result =
      await supabaseClient
        .from("chapters")
        .insert(
          payload
        );

  }


  if (result.error) {
    throw result.error;
  }
}


/* =========================================================
   SAVE CATEGORY
   ========================================================= */

async function saveCategory(
  id,
  data
) {

  const payload = {

    name:
      data.name,

    description:
      data.description || null,

    created_by:
      currentUser?.id || null

  };


  let result;


  if (id) {

    result =
      await supabaseClient
        .from("categories")
        .update(payload)
        .eq(
          "id",
          id
        );

  } else {

    result =
      await supabaseClient
        .from("categories")
        .insert(
          payload
        );

  }


  if (result.error) {
    throw result.error;
  }
}


/* =========================================================
   SAVE QUESTION
   ========================================================= */

async function saveQuestion(
  id,
  data
) {

  const payload = {

    title:
      data.title,

    chapter_id:
      data.chapter_id
        ? Number(
            data.chapter_id
          )
        : null,

    category_id:
      data.category_id
        ? Number(
            data.category_id
          )
        : null,

    question:
      data.question,

    answer:
      data.answer || null,

    explanation:
      data.explanation || null,

    image_url:
      data.image_url || null,

    video_url:
      data.video_url || null,

    sort_order:
      Number(
        data.sort_order || 0
      ),

    created_by:
      currentUser?.id || null

  };


  let result;


  if (id) {

    result =
      await supabaseClient
        .from("questions")
        .update(payload)
        .eq(
          "id",
          id
        );

  } else {

    result =
      await supabaseClient
        .from("questions")
        .insert(
          payload
        );

  }


  if (result.error) {
    throw result.error;
  }
}


/* =========================================================
   DELETE CHAPTER
   ========================================================= */

async function deleteChapter(
  id
) {

  if (!isAdmin()) {
    return;
  }


  if (
    !confirm(
      "Delete this chapter?"
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("chapters")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    showToast(
      error.message
    );

    return;
  }


  await loadPublicContent();

  renderAdminLists();

  showToast(
    "Chapter deleted."
  );
}


/* =========================================================
   DELETE QUESTION
   ========================================================= */

async function deleteQuestion(
  id
) {

  if (!isAdmin()) {
    return;
  }


  if (
    !confirm(
      "Delete this question?"
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("questions")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    showToast(
      error.message
    );

    return;
  }


  await loadPublicContent();

  renderAdminLists();

  showToast(
    "Question deleted."
  );
}


/* =========================================================
   DELETE CATEGORY
   ========================================================= */

async function deleteCategory(
  id
) {

  if (!isAdmin()) {
    return;
  }


  if (
    !confirm(
      "Delete this category?"
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("categories")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    showToast(
      error.message
    );

    return;
  }


  await loadPublicContent();

  renderAdminLists();

  showToast(
    "Category deleted."
  );
}


/* =========================================================
   CONTACT SETTINGS
   ========================================================= */

function renderAdminContact() {

  const numberInput =
    $("whatsappNumber");

  const templateInput =
    $("whatsappTemplate");


  if (numberInput) {

    numberInput.value =
      siteSettings.whatsapp_number ||
      "";

  }


  if (templateInput) {

    templateInput.value =
      siteSettings.whatsapp_template ||
      "";

  }
}


async function saveContactSettings(
  event
) {

  event.preventDefault();


  if (!isAdmin()) {

    showToast(
      "Admin only."
    );

    return;
  }


  const number =
    $("whatsappNumber")?.value
      .trim();


  const template =
    $("whatsappTemplate")?.value
      .trim();


  try {

    await upsertSetting(
      "whatsapp_number",
      number
    );


    await upsertSetting(
      "whatsapp_template",
      template
    );


    await loadSettings();

    renderContact();

    renderAdminContact();


    showToast(
      "Contact settings saved."
    );


  } catch (error) {

    console.error(
      error
    );

    showToast(
      error.message
    );

  }
}


async function upsertSetting(
  key,
  value
) {

  const {
    error
  } =
    await supabaseClient
      .from("site_settings")
      .upsert(
        {
          key,
          value,
          updated_by:
            currentUser?.id || null,
          updated_at:
            new Date().toISOString()
        },
        {
          onConflict: "key"
        }
      );


  if (error) {
    throw error;
  }
}


/* =========================================================
   VIDEO
   ========================================================= */

function renderVideo(
  url
) {

  const youtubeId =
    getYouTubeId(url);


  if (!youtubeId) {

    return `
      <div class="video-link">
        <a
          href="${escapeAttribute(
            url
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          WATCH VIDEO
        </a>
      </div>
    `;

  }


  return `

    <div class="video-wrapper">

      <iframe
        src="https://www.youtube.com/embed/${escapeAttribute(
          youtubeId
        )}"
        title="Question video"
        loading="lazy"
        allowfullscreen
      ></iframe>

    </div>

  `;
}


function getYouTubeId(
  url
) {

  if (!url) {
    return null;
  }


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
        );

    }


    if (
      parsed.hostname.includes(
        "youtube.com"
      )
    ) {

      if (
        parsed.searchParams.has(
          "v"
        )
      ) {

        return parsed.searchParams.get(
          "v"
        );

      }


      const parts =
        parsed.pathname.split(
          "/"
        );


      const index =
        parts.indexOf(
          "embed"
        );


      if (
        index !== -1 &&
        parts[index + 1]
      ) {

        return parts[
          index + 1
        ];

      }

    }

  } catch (error) {

    return null;

  }


  return null;
}


/* =========================================================
   ADMIN CHECK
   ========================================================= */

function isAdmin() {

  return (
    currentUser &&
    currentProfile &&
    currentProfile.role ===
      "admin"
  );
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message
) {

  const region =
    $("toastRegion");


  if (!region) {

    alert(message);

    return;
  }


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    "toast";


  toast.textContent =
    message;


  region.appendChild(
    toast
  );


  setTimeout(
    () => {

      toast.remove();

    },
    4000
  );
}


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
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
  value
) {

  return escapeHTML(
    value || ""
  )
    .replace(
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
      text || ""
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
   MOBILE MENU
   ========================================================= */

const mobileMenuButton =
  $("mobileMenuButton");

const mainNav =
  $("mainNav");


if (
  mobileMenuButton &&
  mainNav
) {

  mobileMenuButton.onclick =
    function () {

      mainNav.classList.toggle(
        "open"
      );

    };

}


/* =========================================================
   DEBUG
   ========================================================= */

console.log(
  "Question Archive app.js loaded successfully."
);
console.log(
  "Supabase URL:",
  SUPABASE_URL
);
