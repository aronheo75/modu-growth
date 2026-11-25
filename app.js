/* MODOO GROWTH 2.0 - Supabase auth and member workspace
   Public browser key only. Never place service_role/secret keys here. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  let sb = null, currentUser = null, profile = null, toastTimer = null;
  const COMPANY_BUCKET = "company-library";
  const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
  const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","image/jpeg","image/png","image/webp"]);
  const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function toast(message) { const el=$("#toast"); if(!el)return; el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3500); }
  function initClient(){ const url=window.SUPABASE_URL,key=window.SUPABASE_ANON_KEY; if(!window.supabase||!url||!key||url.includes("YOUR_")||key.includes("YOUR_")){console.warn("Supabase config missing");return false;} sb=window.supabase.createClient(url,key); return true; }
  function openAuth(mode, selectedRole="") {
    const modal=$("#modal"),form=$("#authForm"); if(!modal||!form)return;
    $("#modalTitle").textContent=mode==="login"?"로그인":"회원가입";
    if(mode==="login") form.innerHTML=`<input id="email" type="email" placeholder="이메일" autocomplete="email" required><input id="password" type="password" placeholder="비밀번호" autocomplete="current-password" required><button type="submit">로그인</button><p>아직 회원이 아니신가요? <a href="#" id="switchSignup">회원가입</a></p>`;
    else form.innerHTML=`<input id="name" type="text" placeholder="이름 또는 회사 담당자명" autocomplete="name" required><input id="phone" type="tel" placeholder="연락처 (예: 010-1234-5678)" autocomplete="tel" inputmode="tel" required><input id="email" type="email" placeholder="이메일" autocomplete="email" required><input id="password" type="password" minlength="6" placeholder="비밀번호(6자 이상)" autocomplete="new-password" required><select id="role"><option value="company" ${selectedRole==="company"?"selected":""}>기업회원</option><option value="partner" ${selectedRole==="partner"?"selected":""}>비즈니스파트너</option></select><button type="submit">회원가입</button><p>이미 회원이신가요? <a href="#" id="switchLogin">로그인</a></p>`;
    $("#switchSignup")?.addEventListener("click",e=>{e.preventDefault();openAuth("signup",selectedRole)});
    $("#switchLogin")?.addEventListener("click",e=>{e.preventDefault();openAuth("login")});
    form.onsubmit=handleAuthSubmit; modal.classList.remove("hidden");
  }
  async function handleAuthSubmit(e){ e.preventDefault(); if(!sb)return toast("회원 기능 연결 설정을 확인해 주세요."); const email=$("#email")?.value.trim(),password=$("#password")?.value,submit=$("#authForm button[type=submit]"); if(submit){submit.disabled=true;submit.textContent="처리 중...";}
    try { if($("#name")){const display_name=$("#name").value.trim(),phone=$("#phone").value.trim(),role=$("#role").value;if(!/^[0-9+()\-\s]{8,20}$/.test(phone))return toast("연락처를 올바르게 입력해 주세요.");const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name,phone,role}}});if(error)throw error;closeModal();if(data.session){toast("회원가입이 완료되었습니다.");await loadSession();}else toast("가입 요청이 완료되었습니다. 이메일 인증 후 로그인해 주세요.");}
      else {const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;closeModal();toast("로그인되었습니다.");await loadSession();}
    }catch(err){toast(err.message||"요청을 처리하지 못했습니다.");}finally{if(submit){submit.disabled=false;submit.textContent=$("#name")?"회원가입":"로그인";}}
  }
  function closeModal(){$("#modal")?.classList.add("hidden");}
  async function logout(){if(sb){const {error}=await sb.auth.signOut();if(error)return toast(error.message);}currentUser=null;profile=null;$("#dashboard")?.classList.add("hidden");$("#authArea")?.classList.remove("hidden");toast("로그아웃되었습니다.");window.scrollTo({top:0,behavior:"smooth"});}
  async function loadSession(){if(!sb)return;const {data:{session},error:sessionError}=await sb.auth.getSession();if(sessionError)return toast(sessionError.message);if(!session){currentUser=null;profile=null;$("#dashboard")?.classList.add("hidden");$("#authArea")?.classList.remove("hidden");return;}currentUser=session.user;
    const {data,error}=await sb.from("profiles").select("id,display_name,role,company_name,phone,bio").eq("id",currentUser.id).maybeSingle();if(error){console.error(error);return toast("회원 프로필을 불러오지 못했습니다. 기존 데이터베이스 정책을 확인해 주세요.");}profile=data;if(!profile)return toast("회원 프로필이 아직 생성되지 않았습니다. 관리자에게 문의해 주세요.");
    $("#authArea")?.classList.add("hidden");$("#dashboard")?.classList.remove("hidden");$("#welcome").textContent=`${profile.display_name||"회원"}님, 환영합니다!`;const roles={company:"기업회원",partner:"비즈니스파트너",admin:"운영 관리자"};$("#roleText").textContent=roles[profile.role]||"회원";$("#memberRole").textContent=roles[profile.role]||"회원";$("#adminMenu").hidden=profile.role!=="admin";$("#addOfferButton").hidden=profile.role!=="company"&&profile.role!=="admin";$("#companyLibraryMenu").hidden=profile.role!=="company"&&profile.role!=="admin";$("#companyDocsStat").hidden=profile.role!=="company"&&profile.role!=="admin";showTab("overview");renderProfile();await refreshOffers();if(profile.role==="company"||profile.role==="admin")await refreshCompanyDocuments();$("#dashboard").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showTab(name){$$(".tab-panel").forEach(x=>x.classList.add("hidden"));$("#tab-"+name)?.classList.remove("hidden");$$(".workspace-tab").forEach(b=>b.classList.toggle("active",b.getAttribute("onclick")?.includes(`'${name}'`)));}
  function renderProfile(){if(!profile)return;$("#profileSummary").innerHTML=`<p><b>이름</b>　${escapeHtml(profile.display_name||"미등록")}</p><p><b>회사명</b>　${escapeHtml(profile.company_name||"미등록")}</p><p><b>연락처</b>　${escapeHtml(profile.phone||"미등록")}</p><p><b>소개</b>　${escapeHtml(profile.bio||"소개가 등록되지 않았습니다.")}</p><p><b>이메일</b>　${escapeHtml(currentUser?.email||"")}</p>`;}
  async function refreshOffers(){if(!sb||!profile)return;let q=sb.from("offers").select("id,title,description,category,status,created_at").order("created_at",{ascending:false}).limit(30);if(profile.role==="company")q=q.eq("owner_id",currentUser.id);else if(profile.role!=="admin"){ $("#offersList").innerHTML='<p class="data-panel">비즈니스파트너의 상품 탐색 권한은 운영 정책 설정 후 연결됩니다.</p>';$("#offerCount").textContent="—";$("#recentActivity").textContent="회원 프로필이 정상적으로 연결되었습니다.";return;}
    const {data,error}=await q;if(error){console.warn(error);$("#offersList").innerHTML='<p class="data-panel">상품 정보를 불러오지 못했습니다. 테이블 및 접근 정책을 확인해 주세요.</p>';$("#offerCount").textContent="—";return;}const items=data||[];$("#offerCount").textContent=items.length;$("#offersList").innerHTML=items.map(x=>`<article class="data-card"><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.description||"")}</p><p>${escapeHtml(x.category||"기타")} · ${escapeHtml(x.status||"pending")}</p></article>`).join("")||'<p class="data-panel">등록된 상품·서비스가 없습니다.</p>';$("#recentActivity").textContent=`내 계정으로 등록된 상품·서비스 ${items.length}건을 확인했습니다.`;
  }
  function openProfileForm(){if(!currentUser||!profile)return openAuth("login");$("#modalTitle").textContent="내 정보 수정";$("#authForm").innerHTML=`<input id="editName" placeholder="이름" value="${escapeHtml(profile.display_name)}" required><input id="editCompany" placeholder="회사명(기업회원)" value="${escapeHtml(profile.company_name)}"><input id="editPhone" placeholder="연락처" value="${escapeHtml(profile.phone)}"><textarea id="editBio" rows="4" placeholder="기업 또는 전문 분야 소개">${escapeHtml(profile.bio)}</textarea><button type="submit">저장하기</button>`;$("#authForm").onsubmit=async e=>{e.preventDefault();const patch={display_name:$("#editName").value.trim(),company_name:$("#editCompany").value.trim(),phone:$("#editPhone").value.trim(),bio:$("#editBio").value.trim()};const {data,error}=await sb.from("profiles").update(patch).eq("id",currentUser.id).select("id,display_name,role,company_name,phone,bio").maybeSingle();if(error)return toast(error.message);profile=data||{...profile,...patch};renderProfile();$("#welcome").textContent=`${profile.display_name||"회원"}님, 환영합니다!`;closeModal();toast("회원 정보가 저장되었습니다.");};$("#modal").classList.remove("hidden");}
  function openOfferForm(){if(!currentUser)return openAuth("login");if(!["company","admin"].includes(profile?.role))return toast("기업회원만 상품·서비스를 등록할 수 있습니다.");$("#modalTitle").textContent="상품·서비스 등록";$("#authForm").innerHTML=`<input id="offerTitle" placeholder="상품 또는 서비스명" required><input id="category" placeholder="카테고리"><textarea id="description" rows="4" placeholder="상품·서비스 소개"></textarea><button type="submit">등록하기</button>`;$("#authForm").onsubmit=async e=>{e.preventDefault();const {error}=await sb.from("offers").insert({owner_id:currentUser.id,title:$("#offerTitle").value.trim(),category:$("#category").value.trim(),description:$("#description").value.trim()});if(error)return toast(error.message);closeModal();toast("상품·서비스가 등록되었습니다.");await refreshOffers();};$("#modal").classList.remove("hidden");}
  function formatBytes(bytes){if(!Number.isFinite(Number(bytes)))return "용량 정보 없음";const units=["B","KB","MB","GB"];let n=Number(bytes),i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return `${n.toFixed(i?1:0)} ${units[i]}`;}
  function safeFileName(name){return String(name||"file").normalize("NFKC").replace(/[^\w가-힣.\-]+/g,"_").replace(/^\.+/,"").slice(-100)||"file";}
  async function refreshCompanyDocuments(){
    if(!sb||!currentUser||!profile||!(["company","admin"].includes(profile.role)))return;
    const list=$("#companyDocumentsList");if(list)list.innerHTML='<p class="data-panel">회사 자료를 불러오는 중입니다.</p>';
    const {data,error}=await sb.from("company_documents").select("id,title,category,description,file_name,storage_path,mime_type,size_bytes,visibility,status,created_at").order("created_at",{ascending:false}).limit(100);
    if(error){console.error(error);if(list)list.innerHTML='<div class="document-empty">자료실을 불러오지 못했습니다. 먼저 Supabase 자료실 설정 SQL을 적용했는지 확인해 주세요.</div>';return;}
    const docs=data||[];if($("#companyDocsCount"))$("#companyDocsCount").textContent=String(docs.length);
    if(!list)return;
    if(!docs.length){list.innerHTML='<div class="document-empty">아직 등록한 자료가 없습니다.<br>회사소개서나 제품 카탈로그를 첫 번째로 등록해 보세요.</div>';return;}
    list.innerHTML=docs.map(d=>`<article class="document-row"><div><h5>${escapeHtml(d.title)}</h5><p>${escapeHtml(d.file_name)} · ${formatBytes(d.size_bytes)} · ${new Date(d.created_at).toLocaleDateString("ko-KR")}</p><div class="document-meta"><span class="document-tag">${escapeHtml(d.category||"기타")}</span><span class="document-tag ${d.visibility==="partners"?"partners":""}">${d.visibility==="partners"?"비즈니스파트너 공개":"기업 내부용"}</span><span class="document-tag ${d.status==="published"?"published":""}">${d.status==="published"?"게시":"임시 보관"}</span></div>${d.description?`<p>${escapeHtml(d.description)}</p>`:""}</div><div class="document-actions"><button type="button" data-doc-open="${escapeHtml(d.id)}">열기</button><button type="button" class="delete" data-doc-delete="${escapeHtml(d.id)}">삭제</button></div></article>`).join("");
    list.querySelectorAll("[data-doc-open]").forEach(btn=>btn.addEventListener("click",()=>openCompanyDocument(btn.dataset.docOpen)));
    list.querySelectorAll("[data-doc-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteCompanyDocument(btn.dataset.docDelete)));
  }
  async function handleCompanyDocumentUpload(e){
    e.preventDefault();if(!sb||!currentUser||!profile||!(["company","admin"].includes(profile.role)))return toast("기업회원만 회사 자료를 등록할 수 있습니다.");
    const file=$("#documentFile")?.files?.[0];if(!file)return toast("업로드할 파일을 선택해 주세요.");
    if(file.size>MAX_DOCUMENT_BYTES)return toast("파일은 20MB 이하만 등록할 수 있습니다.");
    const ext=(file.name.split(".").pop()||"").toLowerCase();
    const allowedExt=new Set(["pdf","doc","docx","xls","xlsx","ppt","pptx","jpg","jpeg","png","webp"]);
    if(!ALLOWED_DOCUMENT_TYPES.has(file.type)&&!allowedExt.has(ext))return toast("PDF, Office 문서 또는 JPG·PNG·WEBP 파일만 등록할 수 있습니다.");
    const title=$("#documentTitle").value.trim();if(!title)return toast("자료 제목을 입력해 주세요.");
    const button=$("#uploadDocumentButton");button.disabled=true;button.textContent="업로드 중...";
    const fileToken=window.crypto?.randomUUID?window.crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path=`${currentUser.id}/${fileToken}-${safeFileName(file.name)}`;
    try{
      const {error:uploadError}=await sb.storage.from(COMPANY_BUCKET).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(uploadError)throw uploadError;
      const payload={owner_id:currentUser.id,title,category:$("#documentCategory").value,description:$("#documentDescription").value.trim(),file_name:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,visibility:$("#documentVisibility").value,status:$("#documentStatus").value};
      const {error:insertError}=await sb.from("company_documents").insert(payload);
      if(insertError){await sb.storage.from(COMPANY_BUCKET).remove([path]);throw insertError;}
      $("#companyDocumentForm").reset();toast("회사 자료가 안전하게 등록되었습니다.");await refreshCompanyDocuments();
    }catch(err){console.error(err);toast(err.message||"자료 업로드에 실패했습니다. Supabase 설정과 권한을 확인해 주세요.");}
    finally{button.disabled=false;button.textContent="자료 업로드";}
  }
  async function openCompanyDocument(id){
    const popup=window.open("about:blank","_blank");
    const {data,error}=await sb.from("company_documents").select("storage_path,file_name").eq("id",id).maybeSingle();
    if(error||!data){popup?.close();return toast("자료를 확인할 수 없습니다.");}
    const {data:signed,error:signedError}=await sb.storage.from(COMPANY_BUCKET).createSignedUrl(data.storage_path,60);
    if(signedError){popup?.close();return toast(signedError.message||"파일 열기 권한을 확인해 주세요.");}
    if(popup){popup.opener=null;popup.location=signed.signedUrl;}else window.location.assign(signed.signedUrl);
  }
  async function deleteCompanyDocument(id){
    if(!confirm("이 자료를 자료실에서 삭제할까요?"))return;
    const {data,error}=await sb.from("company_documents").select("storage_path").eq("id",id).maybeSingle();if(error||!data)return toast("삭제할 자료를 찾지 못했습니다.");
    const {error:removeError}=await sb.storage.from(COMPANY_BUCKET).remove([data.storage_path]);if(removeError)return toast(removeError.message||"파일 삭제에 실패했습니다.");
    const {error:rowError}=await sb.from("company_documents").delete().eq("id",id);if(rowError)return toast("파일은 삭제했지만 자료 목록 정리에 실패했습니다. 관리자에게 문의해 주세요.");
    toast("자료가 삭제되었습니다.");await refreshCompanyDocuments();
  }
  function bindUI(){$("#companyDocumentForm")?.addEventListener("submit",handleCompanyDocumentUpload);$("#refreshDocumentsButton")?.addEventListener("click",refreshCompanyDocuments);$$('[data-open-auth]').forEach(b=>b.addEventListener("click",()=>openAuth(b.dataset.openAuth,b.dataset.signupRole||"")));$$("[data-close-modal]").forEach(x=>x.addEventListener("click",closeModal));$("#mobileNavToggle")?.addEventListener("click",()=>{const nav=$("#mainNav"),open=nav.classList.toggle("open");$("#mobileNavToggle").setAttribute("aria-expanded",String(open));});$$("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("#mainNav")?.classList.remove("open")));document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});}
  window.openAuth=openAuth;window.closeModal=closeModal;window.logout=logout;window.showTab=showTab;window.openProfileForm=openProfileForm;window.openOfferForm=openOfferForm;
  document.addEventListener("DOMContentLoaded",()=>{bindUI();if(initClient()){sb.auth.onAuthStateChange(()=>{setTimeout(loadSession,0);});loadSession();}else console.info("공개 페이지는 사용 가능하며 회원 기능은 Supabase 설정 후 활성화됩니다.");});
})();
