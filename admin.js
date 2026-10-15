// 토모랑 백오피스 — 구글 시트(Apps Script)에서 신청 목록을 읽어 보여준다. 키는 세션에만 보관.
(function () {
  const CFG = window.TOMORANG_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');
  const qs = new URLSearchParams(location.search);
  const DEMO = qs.get('demo') === '1';
  const TYPE_L = { korean_student: '한국 대학생', japanese_student: '일본 학생' };
  const INT_L = { cafe: '카페', food: '음식', walk: '동네 산책', culture: '전시·문화', shopping: '쇼핑', none: '미정' };
  const INT_ORDER = ['cafe', 'food', 'walk', 'culture', 'shopping', 'none'];

  // ---- 키 ----
  let key = qs.get('key') || '';
  try { if (key) sessionStorage.setItem('tomorang.admin', key); else key = sessionStorage.getItem('tomorang.admin') || ''; } catch (e) {}
  if (qs.get('key')) { qs.delete('key'); history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '')); }

  let rows = [], log = [], sheetUrl = CFG.SHEET_URL || '', loadedAt = null;
  let filter = { q: '', type: 'all', lang: 'all' };

  const head = (extra) => `<div class="adm-head"><div class="brand"><b>TOMORANG · BACKOFFICE</b><span>토모랑 모집 알림 신청 현황</span></div>${extra || ''}</div>`;
  const win = (title, body, bar = 'ink') => `<div class="win fr4d"><div class="win-bar ${bar}">${title}</div>${body}</div>`;

  function renderGate(msg) {
    app.innerHTML = head() + `<div class="gate">${win('ADMIN KEY', `<form class="panel-body" id="gate">
      <p style="font-size:14px;line-height:1.6">백오피스 키를 입력하세요. 키는 Apps Script <code>Code.gs</code>의 <code>ADMIN_KEY</code> 값입니다.</p>
      ${msg ? `<span class="err">${esc(msg)}</span>` : ''}
      <input class="inp" id="k" type="password" autocomplete="off" placeholder="ADMIN_KEY">
      <button class="btn btn-pink fr3d" style="min-height:48px;font-size:16px">열기</button>
    </form>`)}</div>`;
    $('#gate').onsubmit = e => { e.preventDefault(); key = $('#k').value.trim(); try { sessionStorage.setItem('tomorang.admin', key); } catch (x) {} load(); };
  }
  function renderNotConnected() {
    app.innerHTML = head() + `<div class="gate" style="width:min(680px,100%)">${win('NOT CONNECTED', `<div class="panel-body guide">
      <p style="font-size:15px;font-weight:700">아직 구글 시트가 연결되지 않았어요.</p>
      <p style="font-size:14px;line-height:1.6">랜딩페이지의 신청도 저장되지 않는 상태(미리보기)입니다. 아래 3분 설정을 끝내면 이 화면에서 신청 현황을 바로 볼 수 있어요.</p>
      <ol>
        <li><a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a>에서 새 시트 → 확장 프로그램 → Apps Script</li>
        <li><code>apps-script/Code.gs</code> 붙여넣기, 맨 위 <code>ADMIN_KEY</code>를 긴 임의 문자열로 변경, 저장</li>
        <li>배포 → 새 배포 → 웹 앱 (실행: 나 / 액세스: 모든 사용자) → 웹 앱 URL 복사</li>
        <li><code>site/config.js</code>의 <code>SHEET_ENDPOINT</code>에 URL을 넣고 푸시</li>
      </ol>
      <p class="muted" style="font-size:13px">화면 구성만 미리 보려면 <a href="?demo=1">예시 데이터로 보기</a> (실제 신청이 아닌 가짜 값)</p>
    </div>`, 'purple')}</div>`;
  }

  async function load() {
    if (DEMO) { ({ rows, log } = demo()); loadedAt = new Date(); render(); return; }
    if (!CFG.SHEET_ENDPOINT) { renderNotConnected(); return; }
    if (!key) { renderGate(); return; }
    app.innerHTML = head() + `<p class="status">불러오는 중…</p>`;
    try {
      const r = await fetch(`${CFG.SHEET_ENDPOINT}?action=list&key=${encodeURIComponent(key)}&_=${Date.now()}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { if (j.error === 'key') { try { sessionStorage.removeItem('tomorang.admin'); } catch (e) {} key = ''; renderGate('키가 맞지 않아요. Code.gs의 ADMIN_KEY를 확인하세요 (CHANGE-ME 그대로면 거부됩니다).'); } else renderGate('오류: ' + j.error); return; }
      rows = j.rows || []; log = j.log || []; sheetUrl = j.sheetUrl || sheetUrl; loadedAt = new Date();
      render();
    } catch (e) {
      app.innerHTML = head() + `<div class="alert fail"><strong>불러오지 못했어요</strong><span>${esc(String(e))}. 웹앱 URL이 맞는지, 배포 액세스가 "모든 사용자"인지 확인하세요.</span></div><button class="sbtn" onclick="location.reload()">다시 시도</button>`;
    }
  }

  // ---- 유틸 ----
  const split = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
  const fmtDT = v => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return String(v); return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d); };
  const wkLabel = k => { const [y, m, d] = k.split('-').map(Number); const sun = new Date(Date.UTC(y, m - 1, d + 1)); return `${m}/${d}–${sun.getUTCMonth() + 1 !== m ? (sun.getUTCMonth() + 1) + '/' : ''}${sun.getUTCDate()}`; };
  const seoulDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  function count(list, fn) { const m = new Map(); list.forEach(r => (fn(r) || []).forEach(k => m.set(k, (m.get(k) || 0) + 1))); return m; }
  function bars(map, order, labelFn, color) {
    const keys = order || [...map.keys()].sort();
    const max = Math.max(1, ...keys.map(k => map.get(k) || 0));
    if (!keys.length) return `<p class="muted" style="font-size:13px">아직 데이터가 없어요.</p>`;
    return keys.map(k => `<div class="bar"><span>${esc(labelFn ? labelFn(k) : k)}</span><span class="track"><i class="${color || ''}" style="width:${Math.round((map.get(k) || 0) / max * 100)}%"></i></span><b>${map.get(k) || 0}</b></div>`).join('');
  }

  // ---- 메인 화면 ----
  function render() {
    const today = seoulDate(new Date());
    const ko = rows.filter(r => r.type === 'korean_student').length, ja = rows.filter(r => r.type === 'japanese_student').length;
    const todayN = rows.filter(r => String(r.createdAt || '').slice(0, 10) === today).length;
    const week = rows.filter(r => (Date.now() - new Date(r.createdAt).getTime()) < 7 * 864e5).length;
    const langJa = rows.filter(r => r.lang === 'ja').length;
    const undecided = rows.filter(r => String(r.undecided) === 'TRUE' || r.undecided === true).length;
    const intMap = count(rows, r => split(r.interests));
    const monMap = count(rows, r => split(r.months));
    const wkMap = count(rows, r => split(r.weekends));
    const topWk = [...wkMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(x => x[0]);

    const q = filter.q.toLowerCase();
    const list = rows.filter(r => (filter.type === 'all' || r.type === filter.type) && (filter.lang === 'all' || r.lang === filter.lang) && (!q || String(r.email).toLowerCase().includes(q)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    app.innerHTML = head(`<div class="toolbar">
        ${DEMO ? '<span class="pill" style="background:#FFF3C4">예시 데이터 · 실제 신청 아님</span>' : ''}
        <span class="status">${loadedAt ? '갱신 ' + fmtDT(loadedAt) : ''}</span>
        <button class="sbtn" data-reload>새로고침</button>
        ${sheetUrl ? `<a class="sbtn lime" href="${esc(sheetUrl)}" target="_blank" rel="noopener">시트 열기 ↗</a>` : ''}
        <button class="sbtn" data-csv ${rows.length ? '' : 'disabled'}>CSV 내려받기</button>
        <a class="sbtn" href="./" target="_blank" rel="noopener">랜딩페이지 ↗</a>
        ${DEMO ? '' : '<button class="sbtn" data-logout>잠그기</button>'}
      </div>`) + `
      <div class="kpis">
        <div class="kpi fr3"><b>${rows.length}</b><span>전체 신청</span></div>
        <div class="kpi fr3 pink"><b>${ko}</b><span>한국 대학생</span></div>
        <div class="kpi fr3 lime"><b>${ja}</b><span>일본 학생</span></div>
        <div class="kpi fr3"><b>${todayN}</b><span>오늘 신청</span></div>
        <div class="kpi fr3"><b>${week}</b><span>최근 7일</span></div>
        <div class="kpi fr3"><b>${langJa}</b><span>일본어 화면으로 신청</span></div>
      </div>
      <div class="panels">
        ${win('관심사', `<div class="panel-body">${bars(intMap, INT_ORDER.filter(k => intMap.has(k)), k => INT_L[k] || k)}</div>`, 'purple')}
        ${win('희망 월', `<div class="panel-body">${bars(monMap, null, k => k.replace('-', '년 ') + '월', 'pink')}${undecided ? `<p class="muted" style="font-size:13px;margin-top:4px">일정 미정 ${undecided}명</p>` : ''}</div>`, 'purple')}
        ${win('희망 주말 TOP', `<div class="panel-body">${bars(wkMap, topWk, k => k.slice(0, 7).replace('-', '.') + ' ' + wkLabel(k), 'lime')}</div>`, 'purple')}
      </div>
      ${win(`신청 목록 · ${list.length}${list.length !== rows.length ? ' / ' + rows.length : ''}`, `
        <div class="filters">
          <input class="inp" id="q" type="search" placeholder="이메일 검색" value="${esc(filter.q)}">
          <div class="seg">
            ${[['all', '전체'], ['korean_student', '한국 대학생'], ['japanese_student', '일본 학생']].map(([v, l]) => `<button class="chip" data-ftype="${v}" aria-pressed="${filter.type === v}">${l}</button>`).join('')}
          </div>
          <div class="seg">
            ${[['all', '언어 전체'], ['ko', '한국어'], ['ja', '日本語']].map(([v, l]) => `<button class="chip lime" data-flang="${v}" aria-pressed="${filter.lang === v}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>#</th><th>신청 시각</th><th>이메일</th><th>유형</th><th>관심사</th><th>희망 월</th><th>희망 주말</th><th>언어</th><th>동의</th><th></th></tr></thead>
          <tbody>${list.length ? list.map((r, i) => `<tr data-id="${esc(r.id)}">
            <td class="muted">${list.length - i}</td>
            <td>${esc(fmtDT(r.createdAt))}</td>
            <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
            <td><span class="pill ${r.type === 'korean_student' ? 'ko' : 'ja'}">${esc(TYPE_L[r.type] || r.type)}</span></td>
            <td class="wrap-cell">${split(r.interests).map(k => `<span class="pill">${esc(INT_L[k] || k)}</span>`).join('') || '<span class="muted">—</span>'}</td>
            <td class="wrap-cell">${String(r.undecided) === 'TRUE' || r.undecided === true ? '<span class="pill" style="background:#FFF3C4">미정</span>' : split(r.months).map(k => `<span class="pill">${esc(k)}</span>`).join('') || '<span class="muted">—</span>'}</td>
            <td class="wrap-cell">${split(r.weekends).map(k => `<span class="pill">${esc(wkLabel(k))}</span>`).join('') || '<span class="muted">—</span>'}</td>
            <td>${esc(r.lang)}</td>
            <td class="muted">${esc(r.consentVersion)}</td>
            <td>${DEMO ? '' : `<button class="del" data-del="${esc(r.id)}" title="이 신청 삭제">삭제</button>`}</td>
          </tr>`).join('') : `<tr><td colspan="10" class="muted" style="padding:24px;text-align:center">${rows.length ? '조건에 맞는 신청이 없어요.' : '아직 신청이 없어요. 랜딩페이지에서 신청이 들어오면 여기에 쌓여요.'}</td></tr>`}</tbody>
        </table></div>`)}
      ${log.length ? win('최근 요청 로그 (중복·거절 포함, 이메일 가림)', `<div class="panel-body log">${log.map(l => `<div><span>${esc(fmtDT(l.at))}</span><span class="${/^new$/.test(l.result) ? '' : 'muted'}">${esc(l.result)}</span><span>${esc(l.emailMasked)} · ${esc(TYPE_L[l.type] || l.type || '')} · ${esc(l.lang || '')}</span></div>`).join('')}</div>`, 'ink') : ''}
    `;
    $('#q').addEventListener('input', e => { filter.q = e.target.value; const pos = e.target.selectionStart; render(); const el = $('#q'); el.focus(); el.setSelectionRange(pos, pos); });
  }

  // ---- 이벤트 ----
  document.addEventListener('click', async e => {
    const b = e.target.closest('button,a[data-csv]'); if (!b) return;
    if (b.hasAttribute('data-reload')) { load(); return; }
    if (b.hasAttribute('data-logout')) { try { sessionStorage.removeItem('tomorang.admin'); } catch (x) {} key = ''; renderGate(); return; }
    if (b.dataset.ftype) { filter.type = b.dataset.ftype; render(); return; }
    if (b.dataset.flang) { filter.lang = b.dataset.flang; render(); return; }
    if (b.hasAttribute('data-csv')) { csv(); return; }
    if (b.dataset.del) {
      if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = '정말 삭제?'; setTimeout(() => { b.classList.remove('armed'); b.textContent = '삭제'; }, 4000); return; }
      b.disabled = true; b.textContent = '삭제 중…';
      try { const r = await fetch(`${CFG.SHEET_ENDPOINT}?action=delete&key=${encodeURIComponent(key)}&id=${encodeURIComponent(b.dataset.del)}`); const j = await r.json(); if (!j.ok) throw new Error(j.error); await load(); }
      catch (x) { alert('삭제 실패: ' + x.message); b.disabled = false; b.textContent = '삭제'; }
    }
  });
  function csv() {
    const cols = ['createdAt', 'email', 'type', 'interests', 'months', 'weekends', 'undecided', 'lang', 'consentVersion', 'consentAt', 'id'];
    const line = a => a.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    const body = [line(cols), ...rows.map(r => line(cols.map(c => r[c])))].join('\r\n');
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tomorang_signups_${seoulDate(new Date())}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  // ---- 예시 데이터 (화면 확인용) ----
  function demo() {
    const now = Date.now(), mk = (i, email, type, interests, months, weekends, undecided, lang) => ({ id: 'demo-' + i, createdAt: new Date(now - i * 5.3e6).toISOString(), email, type, interests, months, weekends, undecided, lang, consentVersion: CFG.CONSENT_VERSION || '2026-10-15' });
    return {
      rows: [
        mk(1, 'example.kim@example.com', 'korean_student', 'cafe,walk', '2026-11,2026-12', '2026-11-07,2026-11-21', 'FALSE', 'ko'),
        mk(2, 'sample.sato@example.jp', 'japanese_student', 'food,shopping', '2026-12', '2026-12-05', 'FALSE', 'ja'),
        mk(3, 'test.lee@example.com', 'korean_student', 'none', '', '', 'TRUE', 'ko'),
        mk(4, 'demo.tanaka@example.jp', 'japanese_student', 'cafe,culture,walk', '2027-01,2027-02', '2027-01-09,2027-02-13', 'FALSE', 'ja'),
        mk(5, 'preview.park@example.com', 'korean_student', 'food,walk', '2026-11', '2026-11-07', 'FALSE', 'ko')
      ],
      log: [{ at: new Date(now - 3e5).toISOString(), result: 'duplicate', emailMasked: 'ex***@example.com', type: 'korean_student', lang: 'ko' }, { at: new Date(now - 9e5).toISOString(), result: 'new', emailMasked: 'de***@example.jp', type: 'japanese_student', lang: 'ja' }]
    };
  }

  load();
})();
