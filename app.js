/* 모두의 성장 - Supabase 연결 및 회원 기능
   공개 브라우저에는 Supabase URL과 publishable/anon key만 사용하세요.
   service_role / secret key는 절대 넣지 마세요. */
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let sb = null;
  let currentUser = null;
  let profile = null;
  let toastTimer = null;

  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function initClient() {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    if (!window.supabase || !url || !key || url.includes("YOUR_") || key.includes("YOUR_")) {
      console.warn("Supabase 설정이 필요합니다. config.js를 확인하세요.");
      return false;
    }
    sb = window.supabase.createClient(url, key);
    return true;
  }

  function openAuth(mode, selectedRole = "") {
    const modal = $("#modal");
    const form = $("#authForm");
    if (!modal || !form) return;
    $("#modalTitle").textContent = mode === "login" ? "로그인" : "회원가입";
    if (mode === "login") {
      form.innerHTML = `
        <input id="email" type="email" placeholder="아이디(이메일)를 입력하세요" autocomplete="email" required>
        <input id="password" type="password" placeholder="비밀번호를 입력하세요" autocomplete="current-password" required>
        <button type="submit">로그인</button>
        <p>아직 회원이 아니신가요? <a href="#" id="switchSignup">회원가입</a></p>`;
      $("#switchSignup").addEventListener("click", (event) => {
        event.preventDefault();
        openAuth("signup", selectedRole);
      });
    } else {
      form.innerHTML = `
        <input id="name" type="text" placeholder="이름 또는 회사 담당자명" autocomplete="name" required>
        <input id="email" type="email" placeholder="이메일" autocomplete="email" required>
        <input id="password" type="password" minlength="6" placeholder="비밀번호(6자 이상)" autocomplete="new-password" required>
        <select id="role" required>
          <option value="company" ${selectedRole === "company" ? "selected" : ""}>기업회원</option>
          <option value="partner" ${selectedRole === "partner" ? "selected" : ""}>영업파트너</option>
        </select>
        <button type="submit">회원가입</button>
        <p>이미 회원이신가요? <a href="#" id="switchLogin">로그인</a></p>`;
      $("#switchLogin").addEventListener("click", (event) => {
        event.preventDefault();
        openAuth("login");
      });
    }
    form.onsubmit = handleAuthSubmit;
    modal.classList.remove("hidden");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!sb) return toast("Supabase 연결 설정이 필요합니다. config.js를 확인해 주세요.");
    const email = $("#email")?.value.trim();
    const password = $("#password")?.value;
    const submit = $("#authForm button[type='submit']");
    if (submit) { submit.disabled = true; submit.textContent = "처리 중..."; }

    try {
      if ($("#name")) {
        const displayName = $("#name").value.trim();
        const role = $("#role").value;
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { display_name: displayName, role } }
        });
        if (error) throw error;
        closeModal();
        if (data.session) {
          toast("회원가입이 완료되었습니다.");
          await loadSession();
        } else {
          toast("가입 요청이 완료되었습니다. 이메일 인증 후 로그인해 주세요.");
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        closeModal();
        toast("로그인되었습니다.");
        await loadSession();
      }
    } catch (error) {
      toast(error.message || "요청을 처리하지 못했습니다.");
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = $("#name") ? "회원가입" : "로그인"; }
    }
  }

  function closeModal() {
    $("#modal")?.classList.add("hidden");
  }

  async function logout() {
    if (sb) {
      const { error } = await sb.auth.signOut();
      if (error) return toast(error.message);
    }
    currentUser = null;
    profile = null;
    $("#dashboard")?.classList.add("hidden");
    $("#authArea")?.classList.remove("hidden");
    toast("로그아웃되었습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadSession() {
    if (!sb) return;
    const { data: { session }, error: sessionError } = await sb.auth.getSession();
    if (sessionError) return toast(sessionError.message);
    if (!session) {
      currentUser = null;
      profile = null;
      $("#dashboard")?.classList.add("hidden");
      $("#authArea")?.classList.remove("hidden");
      return;
    }
    currentUser = session.user;
    let result = await sb.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
    if (result.error) {
      console.error(result.error);
      toast("회원 프로필을 불러오지 못했습니다. 데이터베이스 정책을 확인해 주세요.");
      return;
    }
    profile = result.data;
    if (!profile) {
      toast("회원 프로필이 아직 생성되지 않았습니다. 관리자에게 문의해 주세요.");
      return;
    }

    $("#authArea")?.classList.add("hidden");
    $("#dashboard")?.classList.remove("hidden");
    $("#welcome").textContent = `${profile.display_name || "회원"}님, 환영합니다!`;
    const roleNames = { company: "기업회원", partner: "영업파트너", admin: "운영 관리자" };
    $("#roleText").textContent = roleNames[profile.role] || "회원";
    $("#adminMenu")?.classList.toggle("hidden", profile.role !== "admin");
    showTab("overview");
    await refreshData();
    $("#dashboard").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showTab(name) {
    $$(".tab-panel").forEach((element) => element.classList.add("hidden"));
    const target = $(`#tab-${name}`);
    if (target) target.classList.remove("hidden");
    $$(".workspace-tab").forEach((button) => button.classList.toggle("active", button.getAttribute("onclick")?.includes(`'${name}'`)));
  }

  async function refreshData() {
    if (!sb || !profile) return;
    const [companiesCount, partnersCount, offersCount] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "company"),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "partner"),
      sb.from("offers").select("id", { count: "exact", head: true })
    ]);
    if (companiesCount.error || partnersCount.error || offersCount.error) {
      console.warn(companiesCount.error || partnersCount.error || offersCount.error);
    }
    $("#companyCount").textContent = companiesCount.count ?? "—";
    $("#partnerCount").textContent = partnersCount.count ?? "—";
    $("#offerCount").textContent = offersCount.count ?? "—";

    const { data: companies, error: companyError } = await sb.from("profiles").select("id,display_name,company_name,phone,bio").eq("role", "company").limit(30);
    if (companyError) console.warn(companyError);
    $("#companiesList").innerHTML = (companies || []).map((item) => `
      <article class="data-card"><h4>${escapeHtml(item.company_name || item.display_name || "기업 회원")}</h4>
      <p>${escapeHtml(item.phone || "연락처 미등록")}</p><p>${escapeHtml(item.bio || "기업 소개가 등록되지 않았습니다.")}</p></article>`).join("") || '<p class="empty-state">등록된 기업이 없습니다.</p>';

    const { data: partners, error: partnerError } = await sb.from("profiles").select("id,display_name,bio").eq("role", "partner").limit(30);
    if (partnerError) console.warn(partnerError);
    $("#partnersList").innerHTML = (partners || []).map((item) => `
      <article class="data-card"><h4>${escapeHtml(item.display_name || "영업파트너")}</h4><p>${escapeHtml(item.bio || "전문 분야가 등록되지 않았습니다.")}</p></article>`).join("") || '<p class="empty-state">등록된 파트너가 없습니다.</p>';

    const { data: offers, error: offerError } = await sb.from("offers").select("id,title,description,category,created_at").order("created_at", { ascending: false }).limit(30);
    if (offerError) console.warn(offerError);
    $("#offersList").innerHTML = (offers || []).map((item) => `
      <article class="data-card"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.description || "")}</p><p><b>${escapeHtml(item.category || "기타")}</b></p></article>`).join("") || '<p class="empty-state">등록된 상품·서비스가 없습니다.</p>';
    $("#recentActivity").textContent = `현재 ${companiesCount.count ?? 0}개 기업, ${partnersCount.count ?? 0}명의 영업파트너가 등록되어 있습니다.`;
  }

  function openCompanyForm() {
    if (!currentUser) return openAuth("login");
    if (profile?.role !== "company" && profile?.role !== "admin") return toast("기업회원만 기업 정보를 등록할 수 있습니다.");
    $("#modalTitle").textContent = "기업 정보 등록";
    $("#authForm").innerHTML = `
      <input id="companyName" placeholder="회사명" required>
      <input id="phone" placeholder="대표 전화번호">
      <textarea id="bio" rows="4" placeholder="기업 소개"></textarea>
      <button type="submit">저장</button>`;
    $("#authForm").onsubmit = async (event) => {
      event.preventDefault();
      const { error } = await sb.from("profiles").update({
        company_name: $("#companyName").value.trim(),
        phone: $("#phone").value.trim(),
        bio: $("#bio").value.trim()
      }).eq("id", currentUser.id);
      if (error) return toast(error.message);
      closeModal(); toast("기업 정보가 저장되었습니다."); await refreshData();
    };
    $("#modal").classList.remove("hidden");
  }

  function openOfferForm() {
    if (!currentUser) return openAuth("login");
    if (!["company", "admin"].includes(profile?.role)) return toast("기업회원만 상품·서비스를 등록할 수 있습니다.");
    $("#modalTitle").textContent = "상품·서비스 등록";
    $("#authForm").innerHTML = `
      <input id="offerTitle" placeholder="상품 또는 서비스명" required>
      <input id="category" placeholder="카테고리">
      <textarea id="description" rows="4" placeholder="상품·서비스 소개"></textarea>
      <button type="submit">등록</button>`;
    $("#authForm").onsubmit = async (event) => {
      event.preventDefault();
      const { error } = await sb.from("offers").insert({
        owner_id: currentUser.id,
        title: $("#offerTitle").value.trim(),
        category: $("#category").value.trim(),
        description: $("#description").value.trim()
      });
      if (error) return toast(error.message);
      closeModal(); toast("상품이 등록되었습니다."); await refreshData();
    };
    $("#modal").classList.remove("hidden");
  }

  function bindUI() {
    $$("[data-open-auth]").forEach((button) => button.addEventListener("click", () => openAuth(button.dataset.openAuth, button.dataset.signupRole || "")));
    $$("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
    $("#mobileNavToggle")?.addEventListener("click", () => {
      const nav = $("#mainNav");
      const open = nav.classList.toggle("open");
      $("#mobileNavToggle").setAttribute("aria-expanded", String(open));
    });
    $$("#mainNav a").forEach((link) => link.addEventListener("click", () => $("#mainNav")?.classList.remove("open")));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
  }

  window.openAuth = openAuth;
  window.closeModal = closeModal;
  window.logout = logout;
  window.showTab = showTab;
  window.openCompanyForm = openCompanyForm;
  window.openOfferForm = openOfferForm;

  document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    if (initClient()) {
      sb.auth.onAuthStateChange((_event, _session) => {
        setTimeout(() => loadSession(), 0);
      });
      loadSession();
    } else {
      // Supabase 설정 전에도 공개 메인 화면은 정상적으로 볼 수 있습니다.
      console.info("메인 화면은 사용 가능하며 회원 기능은 Supabase 설정 후 활성화됩니다.");
    }
  });
})();
