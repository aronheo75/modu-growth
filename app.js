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
    const {data,error}=await sb.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();if(error){console.error(error);return toast("회원 프로필을 불러오지 못했습니다. 기존 데이터베이스 정책을 확인해 주세요.");}profile=data;if(!profile)return toast("회원 프로필이 아직 생성되지 않았습니다. 관리자에게 문의해 주세요.");
    $("#authArea")?.classList.add("hidden");$("#dashboard")?.classList.remove("hidden");$("#welcome").textContent=`${profile.display_name||"회원"}님, 환영합니다!`;const roles={company:"기업회원",partner:"비즈니스파트너",admin:"운영 관리자"};$("#roleText").textContent=roles[profile.role]||"회원";$("#memberRole").textContent=roles[profile.role]||"회원";$("#adminMenu").hidden=profile.role!=="admin";$("#addOfferButton").hidden=profile.role!=="company"&&profile.role!=="admin";$("#companyLibraryMenu").hidden=profile.role!=="company"&&profile.role!=="admin";$("#companyDocsStat").hidden=profile.role!=="company"&&profile.role!=="admin";showTab("overview");renderProfile();await refreshOffers();if(profile.role==="company"||profile.role==="admin")await refreshCompanyDocuments();$("#dashboard").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showTab(name){$$(".tab-panel").forEach(x=>x.classList.add("hidden"));$("#tab-"+name)?.classList.remove("hidden");$$(".workspace-tab").forEach(b=>b.classList.toggle("active",b.getAttribute("onclick")?.includes(`'${name}'`)));}
  function renderProfile(){
    if(!profile)return;
    const company=profile.role==="company"||profile.role==="admin";
    const typeLabel=profile.business_type==="corporation"?"법인사업자":profile.business_type==="sole_proprietor"?"개인사업자":"미선택";
    const website=profile.website_url?`<a href="${escapeHtml(profile.website_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(profile.website_url)}</a>`:"미등록";
    const rows=company?[
      ["사업자 유형",typeLabel],["상호·법인명",profile.company_name],["사업자등록번호",profile.business_registration_number],["법인등록번호",profile.corporation_registration_number],["대표자명",profile.representative_name],["개업연월일",profile.opening_date],["업태",profile.business_type_detail],["종목",profile.business_item],["사업장 주소",profile.business_address],["회사 홈페이지",website],["공식 이메일",profile.official_email],["회사 전화번호",profile.company_phone],["담당자명",profile.display_name],["담당자 연락처",profile.phone],["회사 소개",profile.bio]
    ]:[ ["이름",profile.display_name],["연락처",profile.phone],["소개",profile.bio] ];
    const html=rows.map(([label,value])=>`<div class="profile-field"><small>${label}</small><div>${value&&String(value).trim()? (label==="회사 홈페이지"?value:escapeHtml(value)):"미등록"}</div></div>`).join("");
    $("#profileSummary").innerHTML=`<div class="profile-summary-grid">${html}<div class="profile-field"><small>로그인 이메일</small><div>${escapeHtml(currentUser?.email||"")}</div></div></div><p class="profile-note">사업자등록번호 등 주요 사업자 정보는 플랫폼 협약 및 기업 확인을 위해 사용됩니다. 사업자등록증 확인 절차는 관리자 기능과 연동할 예정입니다.</p>`;
  }
  async function refreshOffers(){
    if(!sb||!profile)return;
    let q=sb.from("offers").select("id,title,description,category,status,revenue_model,price_type,price_amount,target_customers,supply_regions,key_strength,created_at").order("created_at",{ascending:false}).limit(30);
    if(profile.role==="company")q=q.eq("owner_id",currentUser.id);
    else if(profile.role!=="admin"){
      $("#offersList").innerHTML='<p class="data-panel">비즈니스파트너의 상품 탐색 권한은 운영 정책 설정 후 연결됩니다.</p>';
      $("#offerCount").textContent="—";
      $("#recentActivity").textContent="회원 프로필이 정상적으로 연결되었습니다.";
      return;
    }
    const {data,error}=await q;
    if(error){
      console.warn(error);
      $("#offersList").innerHTML='<p class="data-panel">상품 정보를 불러오지 못했습니다. 상품 등록 추가 SQL 적용 여부를 확인해 주세요.</p>';
      $("#offerCount").textContent="—";
      return;
    }
    const items=data||[];
    const revenueLabels={one_time:"일회성 판매",recurring:"정기·반복 매출",mixed:"최초 계약 + 유지관리"};
    const statusLabels={pending:"관리자 검토 대기",active:"승인 완료",paused:"판매 보류",rejected:"승인 반려"};
    $("#offerCount").textContent=items.length;
    $("#offersList").innerHTML=items.map(x=>{
      const price=x.price_type==="fixed"&&x.price_amount!==null?`${Number(x.price_amount).toLocaleString("ko-KR")}원`:(x.price_type==="quote"?"별도 견적":"가격 미입력");
      return `<article class="data-card"><div class="offer-card-top"><h4>${escapeHtml(x.title)}</h4><span class="offer-status">${escapeHtml(statusLabels[x.status]||x.status||"검토 대기")}</span></div><p>${escapeHtml(x.description||"")}</p><p>${escapeHtml(x.category||"기타")} · ${escapeHtml(revenueLabels[x.revenue_model]||"수익모델 미선택")} · ${escapeHtml(price)}</p>${x.target_customers?`<p>주요 고객: ${escapeHtml(x.target_customers)}</p>`:""}${x.supply_regions?`<p>공급 지역: ${escapeHtml(x.supply_regions)}</p>`:""}${x.key_strength?`<p>핵심 경쟁력: ${escapeHtml(x.key_strength)}</p>`:""}</article>`;
    }).join("")||'<p class="data-panel">등록된 상품·서비스가 없습니다. 첫 상품을 등록해 보세요.</p>';
    $("#recentActivity").textContent=`내 계정으로 등록된 상품·서비스 ${items.length}건을 확인했습니다.`;
  }
  function openProfileForm(){
    if(!currentUser||!profile)return openAuth("login");
    const company=profile.role==="company"||profile.role==="admin";
    $("#modalTitle").textContent=company?"기업 기본정보 관리":"내 정보 수정";
    const val=(key)=>escapeHtml(profile[key]||"");
    const companyFields=company?`
      <div class="form-section-title">사업자 기본정보</div>
      <label class="modal-field">사업자 유형 <select id="editBusinessType" required><option value="">선택해 주세요</option><option value="corporation" ${profile.business_type==="corporation"?"selected":""}>법인사업자</option><option value="sole_proprietor" ${profile.business_type==="sole_proprietor"?"selected":""}>개인사업자</option></select></label>
      <input id="editCompany" placeholder="상호 또는 법인명" value="${val("company_name")}" required>
      <label class="modal-field">사업자등록번호 <input id="editBusinessNo" inputmode="numeric" maxlength="12" placeholder="예: 123-45-67890" value="${val("business_registration_number")}" required><small>숫자 10자리로 입력해 주세요.</small></label>
      <label class="modal-field" id="corporationNoField">법인등록번호 <input id="editCorporationNo" inputmode="numeric" maxlength="14" placeholder="법인사업자만 입력" value="${val("corporation_registration_number")}"></label>
      <input id="editRepresentative" placeholder="대표자명" value="${val("representative_name")}" required>
      <label class="modal-field">개업연월일 <input id="editOpeningDate" type="date" value="${val("opening_date")}"></label>
      <input id="editBusinessTypeDetail" placeholder="업태 (예: 제조업, 도소매업)" value="${val("business_type_detail")}">
      <input id="editBusinessItem" placeholder="종목 (예: 산업용 장비 제조)" value="${val("business_item")}">
      <input id="editBusinessAddress" placeholder="사업장 주소" value="${val("business_address")}">
      <div class="form-section-title">회사 및 담당자 정보</div>
      <input id="editName" placeholder="담당자명" value="${val("display_name")}" required>
      <input id="editCompanyPhone" type="tel" placeholder="회사 대표 전화번호" value="${val("company_phone")}">
      <input id="editPhone" type="tel" placeholder="담당자 휴대전화" value="${val("phone")}">
      <input id="editWebsite" type="url" placeholder="회사 홈페이지 URL (https:// 포함)" value="${val("website_url")}">
      <input id="editOfficialEmail" type="email" placeholder="회사 공식 이메일" value="${val("official_email")}">
      <textarea id="editBio" rows="4" placeholder="회사 소개">${val("bio")}</textarea>
    `:`<input id="editName" placeholder="이름" value="${val("display_name")}" required><input id="editPhone" placeholder="연락처" value="${val("phone")}"><textarea id="editBio" rows="4" placeholder="소개">${val("bio")}</textarea>`;
    $("#authForm").innerHTML=`${companyFields}<button type="submit">저장하기</button>`;
    const businessTypeSelect=$("#editBusinessType");
    const corporationNoField=$("#corporationNoField");
    const syncBusinessType=()=>{if(corporationNoField)corporationNoField.hidden=businessTypeSelect.value!=="corporation";};
    businessTypeSelect?.addEventListener("change",syncBusinessType);syncBusinessType();
    $("#authForm").onsubmit=async e=>{
      e.preventDefault();
      const patch={display_name:$("#editName").value.trim(),phone:$("#editPhone").value.trim(),bio:$("#editBio").value.trim()};
      if(company){
        const businessNo=$("#editBusinessNo").value.replace(/\D/g,"");
        const corporationNo=$("#editCorporationNo").value.replace(/\D/g,"");
        if(![10].includes(businessNo.length))return toast("사업자등록번호는 숫자 10자리로 입력해 주세요.");
        if($("#editBusinessType").value==="corporation"&&corporationNo.length!==13)return toast("법인사업자는 법인등록번호 13자리를 입력해 주세요.");
        const website=$("#editWebsite").value.trim();
        if(website&&!/^https?:\/\//i.test(website))return toast("홈페이지 주소는 https:// 또는 http://로 시작해야 합니다.");
        Object.assign(patch,{business_type:$("#editBusinessType").value,company_name:$("#editCompany").value.trim(),business_registration_number:businessNo,corporation_registration_number:$("#editBusinessType").value==="corporation"?corporationNo:null,representative_name:$("#editRepresentative").value.trim(),opening_date:$("#editOpeningDate").value||null,business_type_detail:$("#editBusinessTypeDetail").value.trim(),business_item:$("#editBusinessItem").value.trim(),business_address:$("#editBusinessAddress").value.trim(),company_phone:$("#editCompanyPhone").value.trim(),website_url:website||null,official_email:$("#editOfficialEmail").value.trim()||null});
      }
      const {data,error}=await sb.from("profiles").update(patch).eq("id",currentUser.id).select("*").maybeSingle();
      if(error){console.error(error);return toast(error.message.includes("column")?"사업자 정보용 데이터베이스 항목이 아직 준비되지 않았습니다. 안내된 추가 SQL을 먼저 실행해 주세요.":error.message);}
      profile=data||{...profile,...patch};renderProfile();$("#welcome").textContent=`${profile.display_name||"회원"}님, 환영합니다!`;closeModal();toast("회원 정보가 저장되었습니다.");
    };
    $("#modal").classList.remove("hidden");
  }
  function openOfferForm(){
    if(!currentUser)return openAuth("login");
    if(!["company","admin"].includes(profile?.role))return toast("기업회원만 상품·서비스를 등록할 수 있습니다.");
    $("#modalTitle").textContent="상품·서비스 등록";
    $("#authForm").innerHTML=`
      <div class="form-section-title">기본 정보</div>
      <label class="modal-field">상품 또는 서비스명 <input id="offerTitle" maxlength="140" placeholder="예: 공기열 히트펌프" required></label>
      <label class="modal-field">카테고리 <input id="category" maxlength="80" placeholder="예: 에너지·환경 설비"></label>
      <label class="modal-field">상품·서비스 소개 <textarea id="description" rows="3" maxlength="2000" placeholder="주요 기능과 고객에게 제공하는 가치를 간단히 소개해 주세요." required></textarea></label>
      <div class="form-section-title">판매 정보</div>
      <label class="modal-field">수익 모델 <select id="revenueModel"><option value="one_time">일회성 판매</option><option value="recurring">정기·반복 매출</option><option value="mixed">최초 계약 + 유지관리 반복 매출</option></select></label>
      <label class="modal-field">가격 방식 <select id="priceType"><option value="quote">별도 견적</option><option value="fixed">판매가격 입력</option></select></label>
      <label class="modal-field" id="offerPriceField" hidden>판매가격(원) <input id="priceAmount" type="number" min="0" step="1" inputmode="numeric" placeholder="예: 1500000"></label>
      <label class="modal-field">주요 고객층 <input id="targetCustomers" maxlength="300" placeholder="예: 공공기관, 학교, 제조기업"></label>
      <label class="modal-field">공급 가능 지역 <input id="supplyRegions" maxlength="300" placeholder="예: 전국 / 충청권"></label>
      <label class="modal-field">핵심 경쟁력 <textarea id="keyStrength" rows="2" maxlength="1000" placeholder="제품의 차별점이나 주요 장점을 입력해 주세요."></textarea></label>
      <p class="form-help-note">등록한 상품은 바로 공개되지 않습니다. 플랫폼 관리자가 상품과 협약조건을 검토한 뒤 승인하면 비즈니스파트너에게 공개됩니다. 수수료와 협약조건은 별도 메뉴에서 신청합니다.</p>
      <button type="submit">상품 등록 신청</button>`;
    const priceType=$("#priceType"),priceField=$("#offerPriceField");
    const syncPrice=()=>{priceField.hidden=priceType.value!=="fixed";$("#priceAmount").required=priceType.value==="fixed";};
    priceType.addEventListener("change",syncPrice);syncPrice();
    $("#authForm").onsubmit=async e=>{
      e.preventDefault();
      const priceAmount=$("#priceAmount").value.trim();
      if(priceType.value==="fixed"&&(!priceAmount||Number(priceAmount)<0))return toast("판매가격을 0 이상의 숫자로 입력해 주세요.");
      const payload={
        owner_id:currentUser.id,
        title:$("#offerTitle").value.trim(),
        category:$("#category").value.trim()||null,
        description:$("#description").value.trim(),
        revenue_model:$("#revenueModel").value,
        price_type:priceType.value,
        price_amount:priceType.value==="fixed"?Number(priceAmount):null,
        target_customers:$("#targetCustomers").value.trim()||null,
        supply_regions:$("#supplyRegions").value.trim()||null,
        key_strength:$("#keyStrength").value.trim()||null
      };
      const submit=$("#authForm button[type=submit]");submit.disabled=true;submit.textContent="등록 중...";
      const {error}=await sb.from("offers").insert(payload);
      if(error){console.error(error);submit.disabled=false;submit.textContent="상품 등록 신청";return toast(error.message.includes("column")?"상품 등록용 추가 SQL을 먼저 적용해 주세요.":error.message);}
      closeModal();toast("상품 등록 신청이 완료되었습니다. 관리자 검토 후 공개됩니다.");await refreshOffers();
    };
    $("#modal").classList.remove("hidden");
  }
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
