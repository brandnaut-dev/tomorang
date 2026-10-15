// 토모랑 랜딩페이지 — vanilla JS (Claude Design 시안을 그대로 옮김 + 모바일 최적화 + 구글시트 저장)
(function () {
  const C = window.TOMORANG_CONTENT, CFG = window.TOMORANG_CONFIG || {};
  const { T, MISSIONS, INTEREST_CODES, TYPE_CODES, SPR, sprite } = C;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  // ---------- 상태 ----------
  const state = {
    lang: null, open: false, policy: false, status: 'idle', errors: {}, faq: 0, flipped: { 0: true },
    form: { email: '', type: '', interests: [], months: [], weekends: [], undecided: false, consent: false },
    openedAt: 0, lastFocus: null
  };
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'ko' || q === 'ja') return q;
    let saved = null; try { saved = localStorage.getItem('tomorang-lang'); } catch (e) {}
    if (saved === 'ko' || saved === 'ja') return saved;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'ko';
    return nav.toLowerCase().startsWith('ja') ? 'ja' : 'ko';
  }
  function setLang(l) { try { localStorage.setItem('tomorang-lang', l); } catch (e) {} state.lang = l; renderAll(); }
  const t = () => T[state.lang];

  // ---------- 달력 (Asia/Seoul 기준, 과거 주말 제외, 월 경계 포함) ----------
  function calendar(tt) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const [ty, tm, td] = today.split('-').map(Number);
    const todayUTC = Date.UTC(ty, tm - 1, td);
    const out = [];
    const N = CFG.MONTHS_AHEAD || 7;
    for (let i = 0; i < N; i++) {
      const y = ty + Math.floor((tm - 1 + i) / 12), m = ((tm - 1 + i) % 12) + 1;
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const weekends = [];
      for (let d = 1; d <= dim; d++) {
        const sat = Date.UTC(y, m - 1, d);
        if (new Date(sat).getUTCDay() !== 6) continue;
        const sun = new Date(sat + 86400000);
        if (sun.getTime() < todayUTC) continue;
        const sm = sun.getUTCMonth() + 1, sd = sun.getUTCDate();
        weekends.push({ key: `${y}-${pad(m)}-${pad(d)}`, label: `${m}/${d}(${tt.sat}) – ${sm !== m ? sm + '/' : ''}${sd}(${tt.sun})` });
      }
      if (weekends.length) out.push({ key: `${y}-${pad(m)}`, label: tt.ym(y, m), weekends });
    }
    return out;
  }

  // ---------- 장면 조각 ----------
  const cloud = (top, left, sc, dur, delay) => `<div class="cloud" style="top:${top}px;left:${left};width:${96 * sc}px;height:${32 * sc}px;--dur:${dur}s;--delay:${delay}s"><i style="left:0;bottom:0;width:${96 * sc}px;height:${16 * sc}px"></i><i style="left:${16 * sc}px;bottom:${16 * sc}px;width:${56 * sc}px;height:${8 * sc}px"></i><i style="left:${32 * sc}px;bottom:${24 * sc}px;width:${24 * sc}px;height:${8 * sc}px"></i></div>`;
  const star = (top, left, c) => `<div class="star" style="top:${top}px;left:${left}"><i style="left:4px;top:0;width:4px;height:12px;background:${c}"></i><i style="left:0;top:4px;width:12px;height:4px;background:${c}"></i></div>`;
  const heroSky = () => cloud(110, '6%', 1, 40, 0) + cloud(210, '80%', 1.5, 55, -10) + cloud(360, '14%', .75, 48, -20) + cloud(90, '64%', .75, 60, -5) + star(170, '22%', '#A47BE2') + star(300, '86%', '#F2AFE8') + star(470, '9%', '#F2AFE8');
  const bld = (left, w, h, bg, lines, lineColor, hide) => `<div class="bld" style="left:${left};width:${w}px;height:${h}px;background:${bg}${hide ? ';display:none' : ''}">${lines.map(tp => `<i style="top:${tp}px;background:repeating-linear-gradient(90deg,${lineColor} 0 8px,transparent 8px 16px)"></i>`).join('')}</div>`;
  function landscape(tt) {
    const H = (pct, minpx) => `max(${minpx}px, calc((100% - 72px) * ${pct}))`;
    return `
    <div class="hill" style="left:calc(var(--hc) - 360px);width:720px;height:${H(.21, 48)};background:#A9D8C9"></div>
    <div class="hill" style="left:calc(var(--hc) - 272px);width:544px;height:${H(.34, 76)};background:#A9D8C9"></div>
    <div class="hill" style="left:calc(var(--hc) - 192px);width:384px;height:${H(.46, 104)};background:#97CDBB"></div>
    <div class="hill" style="left:calc(var(--hc) - 112px);width:224px;height:${H(.55, 130)};background:#97CDBB"></div>
    <div class="hill" style="left:calc(var(--hc) - 52px);width:104px;height:${H(.61, 150)};background:#86C3AE"></div>
    <div style="bottom:calc(72px + ${H(.61, 150)});left:calc(var(--hc) - 8px);width:16px;height:${H(.17, 40)};background:#FFFFFF;box-shadow:-4px 0 0 #0C4D78,4px 0 0 #0C4D78"></div>
    <div style="bottom:calc(72px + ${H(.61, 150)} + ${H(.17, 40)});left:calc(var(--hc) - 24px);width:48px;height:20px;background:#F2AFE8;box-shadow:0 -4px 0 #0C4D78,0 4px 0 #0C4D78,-4px 0 0 #0C4D78,4px 0 0 #0C4D78"></div>
    <div style="bottom:calc(72px + ${H(.61, 150)} + ${H(.17, 40)} + 24px);left:calc(var(--hc) - 2px);width:4px;height:${H(.1, 16)};background:#0C4D78"></div>
    ${bld('1%', 72, 120, '#BBDDF4', [16, 40], '#FFFFFF')}
    ${bld('7%', 56, 84, '#FFFFFF', [16], '#BBDDF4')}
    ${bld('11%', 88, 148, '#F2AFE8', [16, 40, 64], '#FFFFFF')}
    ${bld('18%', 64, 104, '#BBDDF4', [16], '#FFFFFF')}
    ${bld('24%', 80, 128, '#FFFFFF', [16, 40], '#A47BE2')}
    ${bld('31%', 56, 88, '#C9B4F0', [16], '#FFFFFF')}
    ${bld('96%', 64, 72, '#C9B4F0', [16, 40], '#FFFFFF')}
    <div class="person" style="left:calc(var(--cx) - 80px);--delay:0s">${sprite(SPR.CH_A, 4)}</div>
    <div class="person" style="left:calc(var(--cx) + 16px);--delay:.4s">${sprite(SPR.CH_B, 4)}</div>
    <div class="bubble" style="bottom:180px;left:max(8px, calc(var(--cx) - 112px));--delay:0s">${esc(tt.bubbleA)}</div>
    <div class="bubble" style="bottom:150px;left:calc(var(--cx) + 92px);background:#F2AFE8;--delay:1.2s">${esc(tt.bubbleB)}</div>
    <div class="grass"></div>
    <div class="road"><i></i></div>`;
  }
  const edge = (from, to) => `<div class="edge" aria-hidden="true" style="background:linear-gradient(90deg,${from} 75%,transparent 0) 0 0/32px 8px repeat-x,linear-gradient(90deg,${from} 25%,transparent 0) 0 8px/32px 8px repeat-x,${to}"></div>`;
  const ctaBtn = (cls) => `<button type="button" class="btn ${cls}" data-open>` + `<span class="sq" aria-hidden="true"></span>${esc(t().cta)}</button>`;
  const tableScene = () => {
    const a = (st, inner) => `<div style="${st}">${inner || ''}</div>`;
    return `<div class="scene">
      ${a('left:36px;bottom:8px', sprite(SPR.CH_A, 4))}${a('right:36px;bottom:8px', sprite(SPR.CH_B, 4))}
      ${a('left:24px;right:24px;bottom:36px;height:16px;background:#FFFFFF;box-shadow:0 -4px 0 #0C4D78,0 4px 0 #0C4D78,-4px 0 0 #0C4D78,4px 0 0 #0C4D78')}
      ${a('left:44px;bottom:0;width:8px;height:32px;background:#0C4D78')}${a('right:44px;bottom:0;width:8px;height:32px;background:#0C4D78')}
      ${a('left:100px;bottom:56px;width:24px;height:8px;background:#F2AFE8;box-shadow:0 4px 0 #0C4D78')}${a('right:100px;bottom:56px;width:24px;height:8px;background:#C8EF8A;box-shadow:0 4px 0 #0C4D78')}
    </div>`;
  };

  // ---------- 페이지 ----------
  function renderPage() {
    const tt = t(), lang = state.lang;
    const html = `
<section class="hero" data-screen="01">
  <div class="hero-sky" aria-hidden="true">${heroSky()}</div>
  <header>
    <div class="brand"><b>TOMORANG</b><span>토모랑 / トモラン</span></div>
    <div class="langs fr3" role="group" aria-label="${esc(tt.langLabel)}">
      <button type="button" class="ko" data-lang="ko" aria-pressed="${lang === 'ko'}">${C.FLAGS.kr}한국어</button>
      <button type="button" class="ja" data-lang="ja" aria-pressed="${lang === 'ja'}">${C.FLAGS.jp}日本語</button>
    </div>
  </header>
  <div class="hero-copy">
    <span class="tag fr3">${esc(tt.heroTag)}</span>
    <h1 class="h1"><span>${esc(tt.h1a)}<span class="hl hl-pink">${esc(tt.h1b)}</span>${esc(tt.h1c)}</span><span><span class="hl hl-lime">${esc(tt.h2a)}</span>${esc(tt.h2b)}</span></h1>
    <p class="hero-body">${esc(tt.heroBody)}</p>
    ${ctaBtn('btn-pink btn-hero')}
    <p class="note">${esc(tt.ctaNote)}</p>
  </div>
  <div class="land" aria-hidden="true">${landscape(tt)}</div>
</section>
${edge('#5B8DB5', '#BBDDF4')}

<section class="sec" style="background:#BBDDF4" data-screen="02">
  <div class="wrap" style="gap:48px">
    <h2 class="h2" style="text-align:center">${esc(tt.empTitle)}</h2>
    <div class="cuts">
      ${tt.cuts.map((c, i) => `<div class="win cut fr4d">
        <div class="win-bar purple"><span>CUT ${pad(i + 1)}</span><span class="dots" aria-hidden="true"><i></i><i></i></span></div>
        <div class="cut-body">
          <div class="cut-scene"><div class="cut-icon" aria-hidden="true">${sprite(SPR.ICONS[lang][i], 5)}</div><span>${esc(c.scene)}</span></div>
          <div class="cut-text"><i aria-hidden="true"></i><span class="pretty">${esc(c.text)}</span></div>
        </div>
      </div>`).join('')}
    </div>
    <p class="emp-link">${esc(tt.empLink)}</p>
  </div>
</section>
${edge('#BBDDF4', '#DFF1FF')}

<section class="sec" data-screen="03">
  <div class="wrap" style="gap:48px">
    <div class="head2"><h2 class="h2">${esc(tt.solTitle)}</h2><p class="lead">${esc(tt.solBody)}</p></div>
    <div class="stage fr4">
      <div class="stage-grass" aria-hidden="true"></div>
      <div class="stage-grid">
        <div class="stage-char"><div aria-hidden="true">${sprite(SPR.CH_A, 6)}</div></div>
        <div class="stage-cards">
          <div class="win fr3d"><div class="win-bar pink">${esc(tt.solLocalT)}</div><p>${esc(tt.solLocalD)}</p></div>
          <div class="win fr3d"><div class="win-bar lime">${esc(tt.solLangT)}</div><p>${esc(tt.solLangD)}</p></div>
        </div>
        <div class="stage-char"><div aria-hidden="true">${sprite(SPR.CH_B, 6)}</div></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <span class="flow-label">${esc(tt.flowLabel)}</span>
      <ol class="flow">${tt.flow.map((f, i) => `<li class="fr3"><b>${i + 1}</b><span>${esc(f)}</span></li>`).join('')}</ol>
    </div>
  </div>
</section>
${edge('#DFF1FF', '#F2AFE8')}

<section class="cta1" data-screen="04">
  <div class="wrap">
    <div class="cta1-left">
      <div class="mailbox fr3" aria-hidden="true">${sprite(SPR.MAIL, 5)}</div>
      <div class="cta1-text"><h2>${esc(tt.c1Title)}</h2><p>${esc(tt.c1Body)}</p></div>
    </div>
    <button type="button" class="btn btn-white fr3d" data-open><span class="sq" aria-hidden="true"></span>${esc(tt.cta)}</button>
  </div>
</section>
${edge('#F2AFE8', '#DFF1FF')}

<section class="sec" data-screen="05">
  <div class="wrap" style="gap:56px">
    <div class="head2"><h2 class="h2">${esc(tt.expTitle)}</h2><p class="lead">${esc(tt.expBody)}</p></div>
    <div class="win fr4d">
      <div class="win-bar ink"><span>SEOUL LOCAL ALBUM</span><span class="dots" aria-hidden="true"><i style="background:#F2AFE8"></i><i style="background:#C8EF8A"></i><i></i></span></div>
      <div class="album-grid">
        ${tt.photos.map((p, i) => `<figure class="ph"><div class="ph-win"><img src="photos/${p.file}" alt="${esc(p.alt)}" width="1200" height="900" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async"></div><figcaption><span class="ph-cat">${esc(tt.photoCats[p.cat])}</span>${esc(p.label)}</figcaption></figure>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:20px">
      <div class="mission-head"><h3>${esc(tt.missionTitle)}</h3><p>${esc(tt.missionNote)}</p></div>
      <div class="missions">
        ${MISSIONS.map((m, i) => { const o = !!state.flipped[i], mm = m[lang]; return `<button type="button" class="mission fr4d" data-mission="${i}" aria-expanded="${o}">
          <span class="win-bar purple"><span>MISSION ${pad(i + 1)}</span><span class="mission-hint">${esc(o ? tt.fold : tt.open)}</span></span>
          <span class="mission-body">
            <span class="mission-title">${esc(mm.title)}</span>
            ${mm.desc ? `<span class="mission-desc">${esc(mm.desc)}</span>` : ''}
            <span class="mission-line">${esc(mm.line)}</span>
          </span>
        </button>`; }).join('')}
      </div>
    </div>
    <div class="follow"><i aria-hidden="true"></i><p>${esc(tt.follow)}</p></div>
  </div>
</section>
${edge('#DFF1FF', '#0C4D78')}

<section class="cta2" data-screen="06">
  <div class="wrap">
    <div class="cta2-copy">
      <h2>${esc(tt.c2Title)}</h2>
      <p>${esc(tt.c2Body)}</p>
      <button type="button" class="btn btn-lime fr3wd" data-open><span class="sq" aria-hidden="true"></span>${esc(tt.cta)}</button>
      <p class="sub">${esc(tt.c2Sub)}</p>
    </div>
    <div class="table-win fr4w">
      <div class="bubble" style="top:28px;left:24px;font-size:15px;padding:10px 14px">뭐 먹을까?</div>
      <div class="bubble" style="top:84px;right:24px;font-size:15px;padding:10px 14px;background:#F2AFE8">いつも何を食べてるの？</div>
      <div class="table-scene" aria-hidden="true">${tableScene()}</div>
      <div class="stage-grass" aria-hidden="true"></div>
    </div>
  </div>
</section>
${edge('#0C4D78', '#DFF1FF')}

<section class="sec" data-screen="07">
  <div class="wrap" style="gap:44px">
    <h2 class="h2">${esc(tt.jTitle)}</h2>
    <div class="jgrid">
      <div class="win fr4d">
        <div class="win-bar purple">PROFILE · JESSE</div>
        <div class="profile">
          <div class="profile-top">
            <div class="jesse fr3" aria-hidden="true">${sprite(SPR.JESSE, 7)}</div>
            <dl>
              <dt>${esc(tt.jSchoolK)}</dt><dd>${esc(tt.jSchool)}</dd>
              <dt>${esc(tt.jSeoulK)}</dt><dd>${esc(tt.jSeoul)}</dd>
              <dt>${esc(tt.jLangK)}</dt><dd>${esc(tt.jLang)}</dd>
            </dl>
          </div>
          <p class="intro">${esc(tt.jIntro)}</p>
          <div class="langbox">${esc(tt.jLangBody)}</div>
        </div>
      </div>
      <div class="win fr4d">
        <div class="win-bar ink">${esc(tt.jAlbum)}</div>
        <div class="jalbum">
          ${tt.jPhotos.map(p => `<figure class="ph"><div class="ph-win"><img src="photos/${p.file}" alt="${esc(p.alt)}" width="1200" height="900" loading="lazy" decoding="async"></div><figcaption>${esc(p.label)}</figcaption></figure>`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>
${edge('#DFF1FF', '#BBDDF4')}

<section class="faqsec" data-screen="08" id="faq">
  <div class="wrap">
    <h2 class="h2">${esc(tt.faqTitle)}</h2>
    <div class="win fr4d">
      <div class="win-bar ink">FAQ</div>
      ${tt.faqs.map((q, i) => { const o = state.faq === i; return `<div class="faq">
        <h3><button type="button" class="faq-q" data-faq="${i}" aria-expanded="${o}" aria-controls="faq-a-${i}"><span class="ql"><b>Q</b><span>${esc(q.q)}</span></span><span class="sign" aria-hidden="true">${o ? '−' : '+'}</span></button></h3>
        <p class="faq-a" id="faq-a-${i}" ${o ? '' : 'hidden'}>${esc(q.a)}</p>
      </div>`; }).join('')}
    </div>
    <div class="fin">
      <h2>${esc(tt.finTitle)}</h2>
      <p>${esc(tt.finBody)}</p>
      <button type="button" class="btn btn-pink fr3d" data-open><span class="sq" aria-hidden="true"></span>${esc(tt.cta)}</button>
    </div>
  </div>
  <div class="endland" aria-hidden="true">
    <div style="bottom:72px;left:calc(50% - 80px)">${sprite(SPR.CH_A, 4)}</div>
    <div style="bottom:72px;left:calc(50% + 16px)">${sprite(SPR.CH_B, 4)}</div>
    <div class="grass"></div>
    <div class="road"><i></i></div>
  </div>
</section>

<footer>
  <div class="wrap">
    <nav class="foot-links" aria-label="footer">
      <button type="button" class="lnk" data-policy>${esc(tt.policyLink)}</button>
      <a class="lnk" href="mailto:jesse0823@onpi.kr">${esc(tt.supportLink)}</a>
      <a class="lnk" href="#faq">${esc(tt.faqLink)}</a>
    </nav>
    <b class="foot-brand">TOMORANG · 토모랑 · トモラン</b>
    <p class="foot-biz">${tt.bizLine1.map(x => `<span class="bi">${esc(x)}</span>`).join('<span class="sep" aria-hidden="true">|</span>')}</p>
    <p class="foot-biz">${tt.bizLine2.map(x => `<span class="bi">${esc(x).replace('010-2735-4233', '<a href="tel:01027354233">010-2735-4233</a>').replace('+82-10-2735-4233', '<a href="tel:+821027354233">+82-10-2735-4233</a>').replace('jesse0823@onpi.kr', '<a href="mailto:jesse0823@onpi.kr">jesse0823@onpi.kr</a>')}</span>`).join('<span class="sep" aria-hidden="true">|</span>')}</p>
    <p class="foot-copy">${esc(tt.copyright)}</p>
  </div>
</footer>`;
    $('#app').innerHTML = html;
  }

  // ---------- 개인정보처리방침 / 이용약관 ----------
  function renderPolicy() {
    const tt = t(), ov = $('#policy'), kind = state.policy;
    ov.hidden = !kind;
    if (!kind) return;
    const title = tt.policyLink, items = tt.policy;
    ov.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="pol-title">
      <div class="dlg-bar"><span id="pol-title">${esc(title)}</span><button type="button" class="dlg-x" data-close-policy aria-label="${esc(tt.close)}">×</button></div>
      <div class="dlg-body"><div class="policy-list">${items.map(p => `<div><strong>${esc(p.h)}</strong><span>${esc(p.b)}</span></div>`).join('')}</div></div>
    </div>`;
    $('[data-close-policy]', ov).focus();
  }

  // ---------- 신청 모달 ----------
  function renderModal(focusSel) {
    const tt = t(), f = state.form, s = state, ov = $('#modal');
    ov.hidden = !s.open;
    document.body.classList.toggle('lock', s.open || s.policy);
    if (!s.open) return;
    const cal = calendar(tt);
    const err = k => s.errors[k] ? `<span class="err" role="alert">${esc(tt['err' + k[0].toUpperCase() + k.slice(1)])}</span>` : '';
    let body;
    if (s.status === 'success') {
      body = `<div class="ok"><h3>${esc(tt.okTitle)}</h3><p>${esc(tt.okBody)}</p><button type="button" class="btn fr3d" data-close>${esc(tt.done)}</button></div>`;
    } else {
      const selMonths = cal.filter(m => f.months.includes(m.key));
      body = `
      <p class="note">${esc(tt.ctaNote)}</p>
      <div class="field">
        <label for="tmr-email">${esc(tt.fEmail)} <span class="req">*</span></label>
        <input id="tmr-email" class="inp" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" value="${esc(f.email)}" aria-invalid="${!!s.errors.email}" maxlength="254">
        ${err('email')}
      </div>
      <div class="field" role="radiogroup" aria-labelledby="tmr-type">
        <span class="lbl" id="tmr-type">${esc(tt.fType)} <span class="req">*</span></span>
        <div class="types">${TYPE_CODES.map((code, i) => `<button type="button" class="radio" role="radio" aria-checked="${f.type === code}" data-type="${code}"><i aria-hidden="true"></i>${code === 'korean_student' ? C.FLAGS.kr : C.FLAGS.jp}${esc(tt.types[i])}</button>`).join('')}</div>
        ${err('type')}
      </div>
      <div class="field">
        <span class="lbl">${esc(tt.fInterests)}</span>
        <div class="chips">${INTEREST_CODES.map((code, i) => `<button type="button" class="chip" aria-pressed="${f.interests.includes(code)}" data-interest="${code}">${esc(tt.interests[i])}</button>`).join('')}</div>
      </div>
      <div class="field">
        <span class="lbl">${esc(tt.fWeekends)}</span>
        <span class="help">${esc(tt.fWeekendsHelp)}</span>
        <div class="chips">
          ${cal.map(m => `<button type="button" class="chip mon" aria-pressed="${f.months.includes(m.key)}" data-month="${m.key}">${esc(m.label)}</button>`).join('')}
          <button type="button" class="chip lime" aria-pressed="${f.undecided}" data-undecided>${esc(tt.undecided)}</button>
        </div>
        ${selMonths.map(m => `<div class="wk"><b>${esc(m.label)}</b><div class="chips">${m.weekends.map(w => `<button type="button" class="chip lime" aria-pressed="${f.weekends.includes(w.key)}" data-weekend="${w.key}">${esc(w.label)}</button>`).join('')}</div></div>`).join('')}
      </div>
      <div class="field">
        <label class="consent"><input type="checkbox" id="tmr-consent" ${f.consent ? 'checked' : ''}><span>${esc(tt.fConsent)}</span></label>
        <div class="consent-detail">${esc(tt.fConsentDetail)}</div>
        ${err('consent')}
      </div>
      <label class="hp" aria-hidden="true">Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      ${s.status === 'not_connected' ? `<div class="alert warn" role="status"><strong>${esc(tt.ncTitle)}</strong><span>${esc(tt.ncBody)}</span></div>` : ''}
      ${s.status === 'error' ? `<div class="alert fail" role="alert"><strong>${esc(tt.failTitle)}</strong><span>${esc(tt.failBody)}</span></div>` : ''}
      <button type="button" class="btn btn-pink fr3d submit" data-submit ${s.status === 'saving' ? 'disabled' : ''}>${esc(s.status === 'saving' ? tt.saving : (s.status === 'not_connected' || s.status === 'error') ? tt.retry : tt.submit)}</button>`;
    }
    const scrollTop = $('.dlg-body', ov) ? $('.dlg-body', ov).scrollTop : 0;
    ov.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="tmr-dlg-title">
      <div class="dlg-bar"><span id="tmr-dlg-title">${esc(tt.mTitle)}</span><button type="button" class="dlg-x" data-close aria-label="${esc(tt.close)}">×</button></div>
      <div class="dlg-body">${body}</div>
    </div>`;
    $('.dlg-body', ov).scrollTop = scrollTop;
    const foc = focusSel ? $(focusSel, ov) : null;
    (foc || $('[data-close]', ov)).focus({ preventScroll: true });
  }
  function openModal(opener) {
    state.lastFocus = opener || document.activeElement;
    state.open = true;
    if (!state.openedAt) state.openedAt = Date.now();
    if (state.status === 'not_connected' || state.status === 'error') state.status = 'idle';
    renderModal(state.status === 'success' ? null : '#tmr-email');
  }
  function closeModal() {
    state.open = false; renderModal();
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus({ preventScroll: true });
  }
  function setForm(patch) { Object.assign(state.form, patch); if (state.status === 'not_connected' || state.status === 'error') state.status = 'idle'; }

  // ---------- 제출 ----------
  async function submit() {
    const tt = t(), f = state.form, errors = {};
    const email = f.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) errors.email = true;
    if (!TYPE_CODES.includes(f.type)) errors.type = true;
    if (!f.consent) errors.consent = true;
    state.errors = errors;
    if (Object.keys(errors).length) { state.status = 'idle'; renderModal(errors.email ? '#tmr-email' : errors.type ? '[data-type]' : '#tmr-consent'); return; }
    state.status = 'saving'; renderModal('[data-submit]');
    if (!CFG.SHEET_ENDPOINT) { await new Promise(r => setTimeout(r, 500)); state.status = 'not_connected'; renderModal('[data-submit]'); return; }
    const hp = $('#modal input[name="website"]');
    const payload = {
      email, type: f.type, interests: f.interests.slice(), months: f.months.slice().sort(), weekends: f.weekends.slice().sort(),
      undecided: !!f.undecided, lang: state.lang, consentVersion: CFG.CONSENT_VERSION || '', consent: true,
      elapsedMs: Date.now() - state.openedAt, website: hp ? hp.value : '', userAgent: navigator.userAgent, referrer: location.origin + location.pathname
    };
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(CFG.SHEET_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal });
      clearTimeout(to);
      const j = await r.json();
      if (j && j.ok) { state.status = 'success'; state.errors = {}; renderModal('[data-close]'); }
      else if (j && j.error === 'email') { state.errors = { email: true }; state.status = 'idle'; renderModal('#tmr-email'); }
      else { state.status = 'error'; renderModal('[data-submit]'); }
    } catch (e) { state.status = 'error'; renderModal('[data-submit]'); }
  }

  // ---------- 이벤트 (위임) ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('button,[data-open]');
    if (e.target.matches('#modal') && state.open) { closeModal(); return; }
    if (e.target.matches('#policy') && state.policy) { state.policy = false; renderPolicy(); document.body.classList.toggle('lock', state.open); return; }
    if (!b) return;
    if (b.dataset.lang) { setLang(b.dataset.lang); return; }
    if (b.hasAttribute('data-open')) { openModal(b); return; }
    if (b.hasAttribute('data-close')) { closeModal(); return; }
    if (b.hasAttribute('data-policy')) { state.policy = 'policy'; state.lastFocus = b; renderPolicy(); document.body.classList.add('lock'); return; }
    if (b.hasAttribute('data-close-policy')) { state.policy = false; renderPolicy(); document.body.classList.toggle('lock', state.open); if (state.lastFocus) state.lastFocus.focus(); return; }
    if (b.dataset.mission != null) { const i = +b.dataset.mission; state.flipped[i] = !state.flipped[i]; b.setAttribute('aria-expanded', String(!!state.flipped[i])); $('.mission-hint', b).textContent = state.flipped[i] ? t().fold : t().open; return; }
    if (b.dataset.faq != null) {
      const i = +b.dataset.faq; state.faq = state.faq === i ? -1 : i;
      $$('.faq-q').forEach(q => { const k = +q.dataset.faq, o = state.faq === k; q.setAttribute('aria-expanded', String(o)); $('.sign', q).textContent = o ? '−' : '+'; $('#faq-a-' + k).hidden = !o; });
      return;
    }
    if (b.dataset.type) { setForm({ type: b.dataset.type }); delete state.errors.type; renderModal(`[data-type="${b.dataset.type}"]`); return; }
    if (b.dataset.interest) {
      const code = b.dataset.interest, f = state.form, has = f.interests.includes(code);
      const next = has ? f.interests.filter(x => x !== code) : code === 'none' ? ['none'] : [...f.interests.filter(x => x !== 'none'), code];
      setForm({ interests: next }); renderModal(`[data-interest="${code}"]`); return;
    }
    if (b.dataset.month) {
      const key = b.dataset.month, f = state.form, has = f.months.includes(key);
      setForm({ undecided: false, months: has ? f.months.filter(x => x !== key) : [...f.months, key], weekends: has ? f.weekends.filter(w => !w.startsWith(key)) : f.weekends });
      renderModal(`[data-month="${key}"]`); return;
    }
    if (b.hasAttribute('data-undecided')) { const f = state.form; setForm(f.undecided ? { undecided: false } : { undecided: true, months: [], weekends: [] }); renderModal('[data-undecided]'); return; }
    if (b.dataset.weekend) { const key = b.dataset.weekend, f = state.form; setForm({ weekends: f.weekends.includes(key) ? f.weekends.filter(x => x !== key) : [...f.weekends, key] }); renderModal(`[data-weekend="${key}"]`); return; }
    if (b.hasAttribute('data-submit')) { submit(); return; }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'tmr-email') { state.form.email = e.target.value; if (state.errors.email) { delete state.errors.email; e.target.setAttribute('aria-invalid', 'false'); const er = e.target.parentElement.querySelector('.err'); if (er) er.remove(); } if (state.status === 'not_connected' || state.status === 'error') state.status = 'idle'; }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'tmr-consent') { setForm({ consent: e.target.checked }); if (e.target.checked) { delete state.errors.consent; const er = e.target.closest('.field').querySelector('.err'); if (er) er.remove(); } }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (state.policy) { state.policy = false; renderPolicy(); document.body.classList.toggle('lock', state.open); if (state.lastFocus) state.lastFocus.focus(); } else if (state.open) closeModal(); return; }
    if (e.key === 'Enter' && e.target.id === 'tmr-email') { e.preventDefault(); submit(); return; }
    if (e.key === 'Tab') { // 포커스 트랩
      const ov = state.policy ? $('#policy') : state.open ? $('#modal') : null; if (!ov) return;
      const els = $$('button:not([disabled]),input:not([tabindex="-1"]),[href]', ov); if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // 화면 밖 애니메이션 중지
  function setupMotion() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.toggle('motion', !reduce);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(x => x.target.style.animationPlayState = x.isIntersecting ? 'running' : 'paused'), { rootMargin: '80px' });
      $$('.cloud,.person,.bubble').forEach(el => io.observe(el));
    }
  }

  function renderAll() {
    document.documentElement.lang = state.lang; document.body.dataset.lang = state.lang; document.title = t().title;
    renderPage(); renderModal(); renderPolicy(); setupMotion();
  }
  state.lang = detectLang();
  renderAll();
})();
