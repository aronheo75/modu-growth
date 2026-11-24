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
    const uploadButton = $("#uploadDocumentBtn");
    if (uploadButton) uploadButton.classList.toggle("hidden", profile.role !== "company");
    const docsHeading = $("#documentsHeading");
    if (docsHeading) docsHeading.textContent = profile.role === "company" ? "우리 기업 자료실" : "파트너 영업자료실";
    await refreshData();
    await loadDocuments();
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
    $("#recentActivity").textContent = "회원 정보와 거래 데이터는 권한에 따라 표시됩니다. 기업자료실에서 공유 자료를 확인할 수 있습니다.";
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


  async function loadDocuments() {
    if (!sb || !profile || !currentUser) return;
    const list = $("#documentsList");
    if (!list) return;
    list.innerHTML = '<p class="empty-state">자료를 불러오는 중입니다.</p>';
    let query = sb.from("company_documents").select("id,company_id,company_name,title,description,file_path,file_size,visibility,created_at").order("created_at", { ascending: false }).limit(100);
    if (profile.role === "company") query = query.eq("company_id", currentUser.id);
    const { data, error } = await query;
    if (error) {
      console.warn(error);
      list.innerHTML = '<p class="empty-state">자료실 데이터베이스 설정이 필요합니다. 관리자에게 문의해 주세요.</p>';
      return;
    }
    if (!data?.length) {
      list.innerHTML = '<p class="empty-state">등록된 자료가 없습니다. 기업회원은 영업자료를 업로드할 수 있습니다.</p>';
      return;
    }
    list.innerHTML = data.map(doc => `
      <article class="data-card">
        <h4>${escapeHtml(doc.title)}</h4>
        <p>${escapeHtml(doc.description || "설명이 등록되지 않았습니다.")}</p>
        <div class="document-meta">${escapeHtml(doc.company_name || "제휴기업")} · ${doc.visibility === "partners" ? "파트너 공개" : "기업 전용"} · ${new Date(doc.created_at).toLocaleDateString("ko-KR")} · ${formatBytes(doc.file_size)}</div>
        <div class="document-actions"><button class="btn btn-outline btn-small" type="button" data-download-doc="${escapeHtml(doc.id)}">자료 다운로드</button>${profile.role === "company" ? `<button class="btn btn-outline btn-small" type="button" data-delete-doc="${escapeHtml(doc.id)}" data-file-path="${escapeHtml(doc.file_path)}">삭제</button>` : ""}</div>
      </article>`).join("");
    list.querySelectorAll("[data-download-doc]").forEach(btn => btn.addEventListener("click", () => downloadDocument(btn.dataset.downloadDoc)));
    list.querySelectorAll("[data-delete-doc]").forEach(btn => btn.addEventListener("click", () => deleteDocument(btn.dataset.deleteDoc, btn.dataset.filePath)));
  }

  function formatBytes(bytes) {
    if (!bytes) return "파일 크기 미상";
    return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function openDocumentForm() {
    if (profile?.role !== "company") return toast("기업회원만 자료를 업로드할 수 있습니다.");
    $("#modalTitle").textContent = "기업 영업자료 업로드";
    $("#authForm").innerHTML = `
      <input id="docTitle" maxlength="100" placeholder="자료 제목" required>
      <textarea id="docDescription" rows="3" maxlength="500" placeholder="자료 설명"></textarea>
      <select id="docVisibility"><option value="partners">승인된 파트너에게 공개</option><option value="private">우리 기업만 열람</option></select>
      <label class="file-label">파일 선택 (PDF, PPT, DOC, XLS, 이미지 / 최대 15MB)<input id="docFile" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" required></label>
      <button type="submit">업로드</button>`;
    $("#authForm").onsubmit = async (event) => {
      event.preventDefault();
      const file = $("#docFile").files[0];
      if (!file) return toast("업로드할 파일을 선택해 주세요.");
      if (file.size > 15 * 1024 * 1024) return toast("파일은 15MB 이하로 업로드해 주세요.");
      const allowed = /\.(pdf|ppt|pptx|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$/i;
      if (!allowed.test(file.name)) return toast("지원하지 않는 파일 형식입니다.");
      const submit = $("#authForm button[type='submit']");
      submit.disabled = true; submit.textContent = "업로드 중...";
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${currentUser.id}/${crypto.randomUUID()}_${safeName}`;
        const uploaded = await sb.storage.from("company-documents").upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
        if (uploaded.error) throw uploaded.error;
        const saved = await sb.from("company_documents").insert({
          company_id: currentUser.id,
          company_name: profile.company_name || profile.display_name || "제휴기업",
          title: $("#docTitle").value.trim(),
          description: $("#docDescription").value.trim(),
          file_path: path,
          file_size: file.size,
          visibility: $("#docVisibility").value
        });
        if (saved.error) {
          await sb.storage.from("company-documents").remove([path]);
          throw saved.error;
        }
        closeModal(); toast("기업자료가 안전하게 등록되었습니다."); await loadDocuments();
      } catch (error) {
        console.error(error); toast(error.message || "자료 업로드에 실패했습니다.");
      } finally { submit.disabled = false; submit.textContent = "업로드"; }
    };
    $("#modal").classList.remove("hidden");
  }

  async function downloadDocument(id) {
    const { data: doc, error } = await sb.from("company_documents").select("file_path,title").eq("id", id).single();
    if (error || !doc) return toast("자료에 접근할 수 없습니다.");
    const { data, error: urlError } = await sb.storage.from("company-documents").createSignedUrl(doc.file_path, 60);
    if (urlError || !data?.signedUrl) return toast("다운로드 권한을 확인해 주세요.");
    const a = document.createElement("a"); a.href = data.signedUrl; a.download = doc.title || "company-document"; a.target = "_blank"; a.rel = "noopener"; a.click();
  }

  async function deleteDocument(id, path) {
    if (!window.confirm("이 자료를 삭제할까요?")) return;
    const { error } = await sb.from("company_documents").delete().eq("id", id);
    if (error) return toast(error.message);
    const removed = await sb.storage.from("company-documents").remove([path]);
    if (removed.error) console.warn("파일 정리 필요:", removed.error);
    toast("자료가 삭제되었습니다."); await loadDocuments();
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
  window.openDocumentForm = openDocumentForm;

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
