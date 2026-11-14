/* Concrete Jungle of Patience
 * 흙수저 땅바닥에서 출발해 30층 꼭대기 대리석 펜트하우스(건물주)까지 점프로만 올라가는 게임.
 * 실수하면 아래층으로, 운 나쁘면 태초의 흙바닥까지 떨어진다. 꼭대기까지 걸린 시간으로 랭킹.
 */
"use strict";

// ================================================================ 화면 · 단위
const VW = 1080, VH = 1280;         // 캔버스 크기 (가로를 처음보다 1.5배 넓힘)
const U = VH / 100;                 // 화면 높이 = 100 단위 → 1단위 = 12.8px
const WORLD_W = VW / U;             // 가로 56.25 단위
const SPIKE_W = 3;                  // 양옆 가시 벽 두께 (단위)
const LEFT = SPIKE_W, RIGHT = WORLD_W - SPIKE_W;

// ================================================================ 밸런스
const GRAVITY = 250;                // 단위/초²
const MAX_JUMP_H = 70;              // 최대 세기로 똑바로 뛰면 +70
const V0 = Math.sqrt(2 * GRAVITY * MAX_JUMP_H);
const MIN_POWER = 0.15;             // 게이지 0일 때도 이만큼은 뜀
const AIM_MAX = 60;                 // 조준 범위 ±60도
const AIM_PERIOD = 3.4;             // 메트로놈 한 번 왕복(초) — 느리게 (처음 1.7초의 절반 속도)
const CHARGE_TIME = 0.9;            // 게이지 0 → 최대까지(초), 그 뒤엔 다시 줄어듦
const TAP_IMPULSE = 10;             // 공중 연타 첫 번째 힘 (단위/초)
const TAP_DECAY = 0.72;             // 연타할수록 힘이 줄어듦
const SLIP_RATIO = 0.40;            // 미끄러운 발판: 착지 속도의 이만큼으로 미끄러짐
const SLIP_FRICTION = 14;           // 미끄러짐이 줄어드는 정도 (작을수록 오래 미끄러짐)
const VANISH_TIME = 10;             // 사라지는 발판: 착지 후 이 시간 뒤 사라짐
const RESPAWN_TIME = 6;             // 사라진 발판이 다시 생기기까지 (길이 막히지 않게)
const WALL_BOUNCE = 0.85;           // 가시 벽에 튕길 때 남는 속도
const FLOORS = 30;                  // 목표 층
const GAP = 30;                     // 발판 사이 높이
const GROUND_Y = 10;                // 흙바닥 높이 (캐릭터가 화면 아래에서 10에 섬)
const GOAL_LINE = "내가 조물주 위에 건물주!";   // 꼭대기 도착 대사
const CLEAR_DELAY = 2.6;            // 도착 후 결과 화면까지(초) — 대사를 볼 시간
const DEBUG_START_FLOOR = 0;        // 디버그용: 이 층에서 시작 (0 = 원래대로 흙바닥). 0이 아니면 랭킹 저장 안 함

// 상황별 밈 (매번 랜덤, 같은 말이 연달아 나오지 않게)
const MEMES = {
  up: ["레버리지 맛있다", "반도체가 미래다", "코스피 1만 시대 열겠습니다", "가즈아!", "익절 완료", "존버는 승리한다", "복리의 마법",
    "로또 2등 당첨!", "로또 3등… 그래도 좋아", "역세권 청약 당첨", "집값 올랐다", "재개발 확정", "GTX 들어온대",
    "금리 인하 발표", "환율 안정", "유가 하락", "수출 역대 최고", "보너스 입금", "연봉 협상 성공", "월세 받는 날",
    "길에서 5만 원 주움", "용돈 받았다", "건강검진 올 A", "적금 만기!", "건물주 꿈이 보인다", "갓생 사는 중"],
  loss: ["하이닉스 10% 하락", "코인 -30%", "고점에 풀매수", "물타기 실패", "반대매매 당함",
    "로또 꽝", "로또 5등… 5천 원", "금리 인상", "환율 1500원 돌파", "유가 급등", "물가 상승 쇼크", "집값 하락",
    "전세 만기 다가옴", "관리비 폭탄", "카드값 폭탄", "건강검진 재검", "치과 견적 200만 원", "접촉 사고 났다",
    "택시비 폭탄", "경조사 3연타", "축의금 지출 폭발", "월급 동결"],
  crash: ["내가 선물을 좀 했어", "리먼 브라더스 파산", "오일쇼크", "미사일 발사 소식", "전쟁 발발", "IMF 외환위기",
    "블랙 먼데이", "서브프라임 사태", "부동산 버블 붕괴", "하우스푸어 확정", "깡통전세", "빚투의 최후", "깡통 계좌 완성",
    "병원비 폭탄", "로또 번호 하나 차이로 낙첨", "니 인생 리셋됐다", "도르마무, 거래를 하러 왔다", "인생은 실전이야",
    "다시 흙수저", "이게 맞나…", "인생 2회차 시작"],
  wall: ["인생은 Birth와 Death 사이의 J다. 뛰도록.", "인생에서 도망칠 순 없다.", "도망친 곳에 낙원은 없다", "출구는 위쪽뿐이다",
    "옆길로 새지 마라. 위로 가라", "숨을 곳은 없다. 올라가라", "현실 도피 실패", "세상에 쉬운 길은 없다", "가시밭길이 인생이다",
    "회피는 해결이 아니다", "퇴사하면 지옥이다. 버텨라", "이 세상에 공짜 점심은 없다", "벽은 넘으라고 있는 거야. 이 벽 말고",
    "포기는 배추 셀 때나 하는 말", "피할 수 없으면 뛰어라"],
  vanish: ["가난에는 이자가 붙는다", "월세 계약 만료", "전세 사기 당했다", "보증금 날아감", "역전세", "재건축 무산",
    "갭투자 실패", "계약금 날림", "건물 경매 넘어감", "대출 이자 인상", "통장 잔고 0원", "월급은 통장을 스칠 뿐",
    "적금 깼다", "텅장 확정", "로또 용지 세탁기에 돌림", "성과급 없음", "집값은 내 편이 아니다"],
};
const lastMeme = {};
function meme(kind) {
  const list = MEMES[kind];
  let m;
  do { m = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && m === lastMeme[kind]);
  lastMeme[kind] = m;
  return m;
}

// 층마다 좋아지는 발판 (흙수저 → 건물주)
const TIERS = [
  { from: 1, name: "나무 판자", key: "wood" },
  { from: 7, name: "벽돌", key: "brick" },
  { from: 13, name: "돌", key: "stone" },
  { from: 19, name: "강철", key: "steel" },
  { from: 25, name: "대리석", key: "marble" },
];
const tierOf = (floor) => (floor <= 0 ? { name: "흙수저", key: "dirt" } : floor >= FLOORS ? { name: "건물주", key: "gold" }
  : TIERS.filter((t) => floor >= t.from).pop());

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);
const fmtTime = (ms) => {
  const s = Math.max(0, ms) / 1000, m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, "0")}`;
};

// ================================================================ 캔버스
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nameInput = document.getElementById("name");
const FONT_GAME = '"Jua", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const FONT_BODY = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const FONT_TITLE = '"Bungee", "Arial Black", Impact, sans-serif';
const INK = "#15121c";

function fit() {
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  canvas.style.width = Math.floor(VW * s) + "px";
  canvas.style.height = Math.floor(VH * s) + "px";
  placeNameInput();
}
window.addEventListener("resize", fit);

function text(str, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font || `${o.size || 32}px ${FONT_GAME}`;
  ctx.textAlign = o.align || "center";
  ctx.textBaseline = o.baseline || "middle";
  if (o.outline !== false) {
    ctx.lineJoin = "round";
    ctx.lineWidth = o.ow || 6;
    ctx.strokeStyle = o.outline || INK;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = o.color || "#fff";
  ctx.fillText(str, x, y);
  ctx.restore();
}
function rr(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function circle(x, y, r, fill, stroke, lw = 3) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

class Button {
  constructor(cx, cy, w, h, label, color, size = 40) {
    this.x = cx - w / 2; this.y = cy - h / 2; this.w = w; this.h = h;
    this.label = label; this.color = color; this.size = size;
    this.hover = false; this.pressed = null;
  }
  hit(p) { return p.x >= this.x && p.x <= this.x + this.w && p.y >= this.y && p.y <= this.y + this.h; }
  reset() { this.hover = false; this.pressed = null; }
  pointer(kind, who, p) {
    if (kind === "move") { if (who === "mouse") this.hover = this.hit(p); return false; }
    if (kind === "down" && this.hit(p)) { this.pressed = who; return false; }
    if (kind === "up" && this.pressed === who) { this.pressed = null; return this.hit(p); }
    return false;
  }
  draw() {
    const r = Math.min(22, this.h / 2);
    let y = this.y, col = this.color;
    if (this.hover && this.pressed === null) { y -= 4; col = col.map((c) => Math.min(255, c + 20)); }
    if (this.pressed !== null) y = this.y + 5;
    ctx.fillStyle = INK; rr(this.x, this.y + 9, this.w, this.h, r); ctx.fill();
    ctx.fillStyle = `rgb(${col.join(",")})`; rr(this.x, y, this.w, this.h, r); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; rr(this.x + 14, y + 9, this.w - 28, this.h * 0.22, 8); ctx.fill();
    text(this.label, this.x + this.w / 2, y + this.h / 2 + 2, { size: this.size });
  }
}

// ================================================================ 소리 (파일 없이 그 자리에서 합성)
const Sound = {
  ctx: null, master: null, muted: false, noiseBuf: null,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, n, n);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    try { localStorage.setItem("cjp_muted", this.muted ? "1" : "0"); } catch (e) {}
  },
  tone(type, f0, f1, dur, vol, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, q = 1, delay = 0, type = "bandpass") {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  jump(p) { this.noise(0.25, 0.5, 900 + p * 900, 0.8); this.tone("triangle", 220, 440 + p * 500, 0.22, 0.25); },
  tap() { this.tone("sine", 520, 760, 0.08, 0.18); this.noise(0.06, 0.15, 2000, 1.5); },
  land(hard) { this.tone("sine", 140, 50, 0.16, 0.5 * hard + 0.1); this.noise(0.1, 0.25 * hard + 0.05, 400, 0.7); },
  slip() { this.noise(0.35, 0.18, 3200, 2); },
  wall() { this.tone("square", 300, 120, 0.12, 0.12); this.noise(0.08, 0.25, 1500, 3); },
  crack() { for (let i = 0; i < 4; i++) this.noise(0.05, 0.3, 1800 - i * 300, 4, i * 0.05); },
  fallBig() { this.tone("sawtooth", 600, 90, 0.9, 0.12); },
  tick(p) { this.tone("sine", 300 + p * 600, 300 + p * 600, 0.03, 0.05); },
  clear() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone("triangle", f, f, 0.35, 0.22, i * 0.11)); },
  click() { this.tone("square", 700, 500, 0.05, 0.08); },
};
try { Sound.muted = localStorage.getItem("cjp_muted") === "1"; } catch (e) {}

// ================================================================ 랭킹 (Supabase가 설정돼 있으면 모두가 공유, 아니면 이 기기에만)
const Ranking = {
  mode: "local", list: [], loaded: false, error: "",
  cfg: (window.CJP_CONFIG || {}),
  get online() { return !!(this.cfg.SUPABASE_URL && this.cfg.SUPABASE_ANON_KEY); },
  headers() {
    return { apikey: this.cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + this.cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  },
  async refresh() {
    if (!this.online) {
      this.mode = "local";
      try { this.list = JSON.parse(localStorage.getItem("cjp_scores") || "[]"); } catch (e) { this.list = []; }
      this.loaded = true;
      return;
    }
    this.mode = "online";
    try {
      const url = this.cfg.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/scores?select=name,time_ms,created_at&order=time_ms.asc&limit=10";
      const r = await fetch(url, { headers: this.headers() });
      if (!r.ok) throw new Error(r.status);
      this.list = (await r.json()).filter((d) => d && typeof d.time_ms === "number");
      this.loaded = true; this.error = "";
    } catch (e) {
      this.error = "랭킹을 불러오지 못했어요";
    }
  },
  rankOf(ms) {
    const r = this.list.filter((d) => d.time_ms <= ms).length + 1;
    return r <= 10 ? r : null;
  },
  async add(name, ms) {
    const rank = this.list.filter((d) => d.time_ms <= ms).length + 1;
    if (this.mode === "online") {
      const url = this.cfg.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/scores";
      const r = await fetch(url, { method: "POST", headers: { ...this.headers(), Prefer: "return=minimal" },
        body: JSON.stringify({ name, time_ms: Math.round(ms) }) });
      if (!r.ok) throw new Error(r.status);
      await this.refresh();
    } else {
      this.list.splice(rank - 1, 0, { name, time_ms: Math.round(ms), created_at: new Date().toISOString() });
      this.list = this.list.slice(0, 10);
      try { localStorage.setItem("cjp_scores", JSON.stringify(this.list)); } catch (e) {}
    }
    return rank;
  },
};

// ================================================================ 입력 (스페이스 · 터치 · 마우스)
let screen = null;
let spaceDown = false;
function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height };
}
const whoOf = (e) => (e.pointerType === "mouse" ? "mouse" : "p" + e.pointerId);
canvas.addEventListener("pointerdown", (e) => {
  Sound.unlock();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  if (screen) screen.pointer("down", whoOf(e), toCanvas(e));
  e.preventDefault();
});
canvas.addEventListener("pointermove", (e) => { if (screen) screen.pointer("move", whoOf(e), toCanvas(e)); });
const pUp = (e) => { if (screen) screen.pointer("up", whoOf(e), toCanvas(e)); };
canvas.addEventListener("pointerup", pUp);
canvas.addEventListener("pointercancel", pUp);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("keydown", (e) => {
  Sound.unlock();
  if (document.activeElement === nameInput) return;
  if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Space") { spaceDown = true; if (screen && screen.jumpDown) screen.jumpDown(); }
  if (screen) screen.key(e.code);
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" && spaceDown) { spaceDown = false; if (screen && screen.jumpUp) screen.jumpUp(); }
});
window.addEventListener("blur", () => { if (spaceDown) { spaceDown = false; if (screen && screen.jumpUp) screen.jumpUp(); } });

// 이름 입력 칸 (한글 · 휴대폰 키보드용 진짜 입력 칸)
let nameBox = null;
function placeNameInput() {
  if (!nameBox) { nameInput.style.display = "none"; return; }
  const s = canvas.clientWidth / VW;
  Object.assign(nameInput.style, { display: "block", left: nameBox.x * s + "px", top: nameBox.y * s + "px",
    width: nameBox.w * s + "px", height: nameBox.h * s + "px", fontSize: Math.max(14, 30 * s) + "px" });
}
function showNameInput(box) {
  nameBox = box; nameInput.value = ""; nameInput.placeholder = "이름 (최대 8글자)"; placeNameInput();
  setTimeout(() => { try { nameInput.focus({ preventScroll: true }); } catch (e) {} }, 50);
}
function hideNameInput() { nameBox = null; nameInput.blur(); placeNameInput(); }
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); if (screen && screen.submitName) screen.submitName(); }
  e.stopPropagation();
});

// ================================================================ 그림: 해 질 녘 고층빌딩숲 배경
const TOP_Y = GROUND_Y + GAP * FLOORS;          // 꼭대기 발판 높이 (단위)
const CAM_MAX = (TOP_Y + 20) * U;               // 카메라가 올라가는 최대(px)
const PAR_FAR = 0.18, PAR_NEAR = 0.42;
const ART = {};

function seeded(seed) {                         // 매번 같은 도시가 나오게
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function buildingLayer(par, seed, base, edge, win, density) {
  const H = Math.ceil(VH + CAM_MAX * par);
  const c = document.createElement("canvas");
  c.width = VW; c.height = H;
  const g = c.getContext("2d");
  const r = seeded(seed);
  let x = -20;
  while (x < VW + 20) {
    const w = 60 + r() * 90;
    const hTop = Math.min(H * 0.97, VH * (0.25 + r() * 0.45) + H * Math.pow(r(), 2.2) * 0.8);   // 빌딩 꼭대기 (대부분 낮고 가끔 아주 높음)
    const top = H - hTop;
    // 몸체 + 오른쪽 그림자 면
    g.fillStyle = base; g.fillRect(x, top, w, hTop);
    g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(x + w * 0.62, top, w * 0.38, hTop);
    // 노을빛 가장자리 (왼쪽 · 꼭대기)
    g.fillStyle = edge; g.fillRect(x, top, w, 3); g.fillRect(x, top, 3, hTop);
    // 옥상 구조물
    if (r() < 0.5) { g.fillStyle = base; g.fillRect(x + w * 0.3, top - 18, w * 0.25, 18); }
    if (r() < 0.3) { g.fillStyle = base; g.fillRect(x + w * 0.5, top - 60, 3, 60); g.fillStyle = "#ff5a4a"; g.fillRect(x + w * 0.5 - 2, top - 64, 7, 6); }
    // 창문 조명
    const cols = Math.max(2, Math.floor(w / 18)), cw = w / cols;
    for (let yy = top + 14; yy < H - 8; yy += 22) {
      for (let i = 0; i < cols; i++) {
        if (r() < density) {
          g.fillStyle = r() < 0.85 ? win : "rgba(180,220,255,0.55)";
          g.fillRect(x + i * cw + cw * 0.25, yy, cw * 0.5, 10);
        }
      }
    }
    x += w + 18 + r() * 70;                     // 빌딩 사이로 노을 하늘이 보이게
  }
  return c;
}
function prepareBackground() {
  ART.far = buildingLayer(PAR_FAR, 7, "#6a4566", "rgba(255,180,130,0.6)", "rgba(255,214,140,0.5)", 0.18);
  ART.near = buildingLayer(PAR_NEAR, 21, "#2a1d33", "rgba(255,150,100,0.75)", "rgba(255,205,110,0.85)", 0.26);
  const r = seeded(99);
  ART.stars = Array.from({ length: 140 }, () => [r() * VW, r() * VH * 3, 0.6 + r() * 1.6, r() * 6]);
}
function mix(c1, c2, k) { return c1.map((v, i) => Math.round(lerp(v, c2[i], k))); }
const rgb = (c) => `rgb(${c.join(",")})`;
function drawBackground(camPx, t) {
  const k = clamp(camPx / CAM_MAX, 0, 1);       // 0 = 땅, 1 = 꼭대기
  const top = mix([92, 58, 112], [14, 12, 38], k), mid = mix([214, 96, 104], [52, 34, 86], k), bot = mix([255, 170, 96], [118, 64, 104], k);
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, rgb(top)); g.addColorStop(0.6, rgb(mid)); g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (k > 0.25) {                               // 높이 올라가면 별
    ctx.fillStyle = "#fff";
    for (const [x, y, s, ph] of ART.stars) {
      const sy = ((y + camPx * 0.05) % (VH * 3)) - VH;
      if (sy < 0 || sy > VH) continue;
      ctx.globalAlpha = (k - 0.25) * 1.3 * (0.6 + 0.4 * Math.sin(t * 2 + ph));
      ctx.fillRect(x, sy, s, s);
    }
    ctx.globalAlpha = 1;
  }
  // 지는 해 (천천히 따라 내려감)
  const sunY = VH - 330 + camPx * 0.08;
  if (sunY < VH + 120) {
    const sg = ctx.createRadialGradient(470, sunY, 10, 470, sunY, 260);
    sg.addColorStop(0, "rgba(255,236,170,0.95)"); sg.addColorStop(0.25, "rgba(255,170,90,0.55)"); sg.addColorStop(1, "rgba(255,120,80,0)");
    ctx.fillStyle = sg; ctx.fillRect(0, sunY - 260, VW, 520);
    circle(470, sunY, 70, "rgb(255,214,140)");
  }
  ctx.drawImage(ART.far, 0, VH - ART.far.height + camPx * PAR_FAR);
  ctx.drawImage(ART.near, 0, VH - ART.near.height + camPx * PAR_NEAR);
  // 아래쪽 노을 안개
  const fog = ctx.createLinearGradient(0, VH * 0.55, 0, VH);
  fog.addColorStop(0, "rgba(255,150,100,0)"); fog.addColorStop(1, `rgba(255,150,100,${0.18 * (1 - k)})`);
  ctx.fillStyle = fog; ctx.fillRect(0, VH * 0.55, VW, VH * 0.45);
}

// ================================================================ 그림: 발판 (올라갈수록 좋은 재료)
const PLAT_H = 1.9;                              // 발판 두께 (단위)
function wetColor(floor) {                       // 미끄러운 물기: 아래는 빗물, 위로 갈수록 피
  const k = clamp((floor - 1) / (FLOORS - 2), 0, 1);
  return { c: mix([150, 200, 245], [150, 8, 22], Math.pow(k, 0.9)), a: lerp(0.55, 0.85, k) };
}
function makePlatformArt(p) {
  const w = Math.round(p.w * U), h = Math.round(PLAT_H * U), pad = 14;
  const c = document.createElement("canvas");
  c.width = w + pad * 2; c.height = h + pad * 2 + 26;      // 아래로 떨어지는 물방울 자리
  const g = c.getContext("2d");
  const r = seeded(p.seed);
  const X = pad, Y = pad;
  const box = (fill) => { g.fillStyle = fill; g.fillRect(X, Y, w, h); };
  const key = p.goal ? "gold" : tierOf(p.floor).key;
  if (key === "wood") {
    box("#9a6a3c");
    const n = Math.max(2, Math.round(w / 46));
    for (let i = 0; i < n; i++) {
      const x0 = X + (w / n) * i;
      g.fillStyle = i % 2 ? "#a8763f" : "#93633a"; g.fillRect(x0 + 1, Y + 1, w / n - 2, h - 2);
      g.strokeStyle = "rgba(60,35,15,0.45)"; g.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { g.beginPath(); const yy = Y + 5 + k * 6 + r() * 3; g.moveTo(x0 + 3, yy); g.bezierCurveTo(x0 + w / n * 0.4, yy + 2, x0 + w / n * 0.6, yy - 2, x0 + w / n - 3, yy); g.stroke(); }
      g.fillStyle = "#3a2a1a"; g.fillRect(x0 + 5, Y + h / 2 - 1.5, 3, 3); g.fillRect(x0 + w / n - 8, Y + h / 2 - 1.5, 3, 3);
    }
  } else if (key === "brick") {
    box("#d9c7b0");
    const bw = 30, bh = h / 2;
    for (let row = 0; row < 2; row++) for (let x0 = X - (row ? bw / 2 : 0); x0 < X + w; x0 += bw) {
      const xa = Math.max(X, x0 + 1.5), xb = Math.min(X + w, x0 + bw - 1.5);
      g.fillStyle = ["#b5492f", "#a8412b", "#c25436"][Math.floor(r() * 3)];
      g.fillRect(xa, Y + row * bh + 1.5, xb - xa, bh - 3);
    }
  } else if (key === "stone") {
    box("#5e6066");
    for (let x0 = X; x0 < X + w; ) {
      const sw = 22 + r() * 26;
      g.fillStyle = ["#8a8d94", "#7b7e86", "#9a9ca2"][Math.floor(r() * 3)];
      g.beginPath(); g.roundRect ? g.roundRect(x0 + 1.5, Y + 2, Math.min(sw, X + w - x0) - 3, h - 4, 6) : g.rect(x0 + 1.5, Y + 2, Math.min(sw, X + w - x0) - 3, h - 4); g.fill();
      x0 += sw;
    }
  } else if (key === "steel") {
    box("#6f7c8c");
    g.fillStyle = "#8d9aab"; g.fillRect(X, Y, w, 5);
    g.fillStyle = "#4b5563"; g.fillRect(X, Y + h - 5, w, 5);
    g.fillStyle = "#c9d2dc";
    for (let x0 = X + 10; x0 < X + w - 6; x0 += 22) { g.beginPath(); g.arc(x0, Y + h / 2, 2.4, 0, 7); g.fill(); }
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#1d1d1d" : "#f2c21b"; g.fillRect(X + i * 6, Y, 6, h); g.fillRect(X + w - 24 + i * 6, Y, 6, h); }
  } else if (key === "marble" || key === "gold") {
    box(key === "gold" ? "#fbf3df" : "#f4f1ec");
    g.strokeStyle = "rgba(120,120,130,0.45)"; g.lineWidth = 1.2;
    for (let k = 0; k < Math.max(3, w / 40); k++) {
      g.beginPath(); let x0 = X + r() * w, y0 = Y + r() * h; g.moveTo(x0, y0);
      for (let s = 0; s < 4; s++) { x0 += 8 + r() * 14; y0 = clamp(y0 + (r() - 0.5) * 10, Y + 1, Y + h - 1); g.lineTo(Math.min(x0, X + w), y0); }
      g.stroke();
    }
    g.fillStyle = "#d4a73a"; g.fillRect(X, Y, w, 3.5); g.fillRect(X, Y + h - 3.5, w, 3.5);
  }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(X, Y, w, h);
  // 미끄러운 발판: 위에 고인 물기 + 떨어지는 방울
  if (p.type === "slip") {
    const { c: wc, a } = wetColor(p.floor);
    const col = `rgba(${wc.join(",")},${a})`, hi = `rgba(255,255,255,${0.5 - a * 0.25})`;
    g.fillStyle = col;
    for (let x0 = X + 6; x0 < X + w - 10; x0 += 18 + r() * 22) {
      const pw = 16 + r() * 26;
      g.beginPath(); g.ellipse(Math.min(x0 + pw / 2, X + w - 8), Y + 1, pw / 2, 4 + r() * 2, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillRect(X + 2, Y - 1, w - 4, 4);
    g.fillStyle = hi; g.fillRect(X + 8, Y - 1, w * 0.3, 1.5);
    g.fillStyle = col;
    for (let i = 0; i < Math.max(2, w / 45); i++) {         // 아래로 맺힌 방울
      const dx = X + 8 + r() * (w - 16), len = 6 + r() * 14;
      g.fillRect(dx - 1.5, Y + h, 3, len);
      g.beginPath(); g.arc(dx, Y + h + len, 3.5, 0, 7); g.fill();
    }
  }
  return c;
}
function drawGround(camPx) {
  const top = VH - (GROUND_Y * U - camPx);
  if (top > VH + 10) return;
  const g = ctx.createLinearGradient(0, top, 0, top + GROUND_Y * U);
  g.addColorStop(0, "#6b4a2e"); g.addColorStop(1, "#3b2617");
  ctx.fillStyle = g; ctx.fillRect(0, top, VW, VH - top + 20);
  ctx.fillStyle = "#7d5836"; ctx.fillRect(0, top, VW, 8);
  const r = seeded(5);
  for (let i = 0; i < 70; i++) { ctx.fillStyle = r() < 0.5 ? "#4f3520" : "#8a6440"; ctx.beginPath(); ctx.ellipse(r() * VW, top + 16 + r() * (GROUND_Y * U - 20), 3 + r() * 5, 2 + r() * 3, 0, 0, 7); ctx.fill(); }
  // 흙에 꽂힌 흙수저
  ctx.save(); ctx.translate(560, top + 6); ctx.rotate(-0.5);
  ctx.fillStyle = "#8a6a4a"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, -46, 13, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  rr(-3.5, -30, 7, 44, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#5a4028"; ctx.beginPath(); ctx.ellipse(-2, -48, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  text("흙수저", 560, top + 40, { size: 22, color: "#f3dcc0", ow: 5 });
}
function drawSpikes(camPx) {                     // 양옆 검정 이빨 가시 벽
  const w = SPIKE_W * U, step = 2.6 * U;
  ctx.fillStyle = "#0d0b10";
  ctx.fillRect(0, 0, w * 0.35, VH); ctx.fillRect(VW - w * 0.35, 0, w * 0.35, VH);
  const off = ((camPx % step) + step) % step;
  ctx.beginPath();
  for (let y = -step + off; y < VH + step; y += step) {
    ctx.moveTo(w * 0.35, y); ctx.lineTo(w, y + step / 2); ctx.lineTo(w * 0.35, y + step);
    ctx.moveTo(VW - w * 0.35, y); ctx.lineTo(VW - w, y + step / 2); ctx.lineTo(VW - w * 0.35, y + step);
  }
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let y = -step + off; y < VH + step; y += step) { ctx.fillRect(w * 0.35, y + step * 0.3, 3, step * 0.25); }
}

// ================================================================ 그림: 막대 인간 (검정 머리 · 검정 몸통)
const POSE_KEYS = ["hip", "neck", "head", "kneeL", "footL", "kneeR", "footR", "elbowL", "handL", "elbowR", "handR"];
function rotAround(p, c, deg) {
  const a = -deg * Math.PI / 180, s = Math.sin(a), co = Math.cos(a);
  const x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * co - y * s, c[1] + x * s + y * co];
}
const Pose = {
  stand() {
    return { hip: [0, 3.7], neck: [0, 6.1], head: [0, 7.25], kneeL: [-0.45, 1.85], footL: [-0.6, 0], kneeR: [0.45, 1.85], footR: [0.6, 0],
      elbowL: [-0.75, 5.0], handL: [-0.95, 3.9], elbowR: [0.75, 5.0], handR: [0.95, 3.9], rot: 0, lift: 0 };
  },
  /** 쭈그려 앉기 (k: 깊이 0~1), lean: 몸통 · 머리가 점프 방향으로 기욺(도) */
  crouch(k, lean, armsBack = 0) {
    const hy = 3.7 - 1.7 * k, hip = [0, hy];
    const up = (dx, dy, extra = 1) => rotAround([dx, hy + dy], hip, lean * extra);
    return { hip, neck: up(0, 2.35), head: up(0, 3.5, 1.25),
      kneeL: [-(0.45 + 1.05 * k), 1.85 - 0.35 * k + 0.2 * k], footL: [-0.75, 0], kneeR: [0.45 + 1.05 * k, 1.85 - 0.35 * k + 0.2 * k], footR: [0.75, 0],
      elbowL: up(-0.85 - 0.3 * armsBack, 1.4 - 0.3 * armsBack), handL: up(-1.05 - 0.6 * armsBack, 0.4 - 0.4 * armsBack),
      elbowR: up(0.85 + 0.3 * armsBack, 1.4 - 0.3 * armsBack), handR: up(1.05 + 0.6 * armsBack, 0.4 - 0.4 * armsBack), rot: 0, lift: 0 };
  },
  /** 차렷 (스키점프처럼 몸 전체가 날아가는 방향으로 기욺) */
  straight(rot) {
    return { hip: [0, 3.7], neck: [0, 6.15], head: [0, 7.3], kneeL: [-0.18, 1.85], footL: [-0.18, 0], kneeR: [0.18, 1.85], footR: [0.18, 0],
      elbowL: [-0.42, 5.0], handL: [-0.42, 3.75], elbowR: [0.42, 5.0], handR: [0.42, 3.75], rot, lift: 0 };
  },
  /** 개구리 수영 (s: 0 → 1 팔다리 휘젓기 한 번) */
  frog(s, rot) {
    const out = Math.sin(s * Math.PI);           // 0 → 펼침 → 0
    return { hip: [0, 3.7], neck: [0, 6.1], head: [0, 7.25],
      kneeL: [-(0.5 + 1.1 * out), 2.3], footL: [-(0.4 + 1.8 * out), 0.6 + 0.6 * out], kneeR: [0.5 + 1.1 * out, 2.3], footR: [0.4 + 1.8 * out, 0.6 + 0.6 * out],
      elbowL: [-(0.9 + 0.9 * out), 6.2], handL: [-(0.7 + 1.7 * out), 7.4 - 2.2 * (1 - out)], elbowR: [0.9 + 0.9 * out, 6.2], handR: [0.7 + 1.7 * out, 7.4 - 2.2 * (1 - out)],
      rot, lift: 0 };
  },
};
function blendPose(cur, target, k) {
  const out = {};
  for (const key of POSE_KEYS) out[key] = [lerp(cur[key][0], target[key][0], k), lerp(cur[key][1], target[key][1], k)];
  out.rot = lerp(cur.rot, target.rot, k);
  out.lift = lerp(cur.lift, target.lift, k);
  return out;
}
/** 발 위치(px)에 막대 인간 그리기 */
function drawStickman(pose, fx, fy, scale = 1, alpha = 1) {
  const S = U * scale;
  const center = [0, 4];
  const P = (key) => {
    const q = pose.rot ? rotAround(pose[key], center, pose.rot) : pose[key];
    return [fx + q[0] * S, fy - (q[1] + pose.lift) * S];
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#0e0c12"; ctx.fillStyle = "#0e0c12";
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 0.62 * S;
  const line = (...keys) => { ctx.beginPath(); keys.forEach((k, i) => { const p = P(k); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); };
  line("footL", "kneeL", "hip", "kneeR", "footR");
  line("hip", "neck");
  line("handL", "elbowL", "neck", "elbowR", "handR");
  const h = P("head");
  ctx.beginPath(); ctx.arc(h[0], h[1], 1.18 * S, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";               // 머리 윤기
  ctx.beginPath(); ctx.arc(h[0] - 0.4 * S, h[1] - 0.45 * S, 0.32 * S, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ================================================================ 그림: 꼭대기 건물주 빌딩
function makeGoalBuilding(w, h) {
  const c = document.createElement("canvas");
  c.width = w + 40; c.height = h + 60;
  const g = c.getContext("2d");
  const X = 20, B = c.height - 2;                  // 아래가 발판 윗면
  const towerW = w * 0.74, tx = X + (w - towerW) / 2;
  const podH = 70, crownH = 70, towerTop = 60 + crownH, towerBot = B - podH;
  g.lineJoin = "round";
  const stroke = (lw = 4) => { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };
  // 왕관 · 첨탑
  g.fillStyle = "#e8c35a";
  g.beginPath(); g.moveTo(X + w / 2, 6); g.lineTo(X + w / 2 + 7, 46); g.lineTo(X + w / 2 - 7, 46); g.closePath(); g.fill(); stroke(3);
  g.beginPath();
  g.moveTo(tx + 10, towerTop); g.lineTo(tx + 10, 70); g.lineTo(tx + towerW * 0.3, 92); g.lineTo(X + w / 2, 50);
  g.lineTo(tx + towerW * 0.7, 92); g.lineTo(tx + towerW - 10, 70); g.lineTo(tx + towerW - 10, towerTop); g.closePath();
  const cg = g.createLinearGradient(0, 50, 0, towerTop); cg.addColorStop(0, "#ffe9a0"); cg.addColorStop(1, "#c9962e");
  g.fillStyle = cg; g.fill(); stroke();
  for (const k of [0.3, 0.5, 0.7]) { g.fillStyle = "#ff5a6a"; g.beginPath(); g.arc(tx + towerW * k, 112, 6, 0, 7); g.fill(); stroke(2); }
  // 대리석 탑
  g.fillStyle = "#f6f2ea"; g.fillRect(tx, towerTop, towerW, towerBot - towerTop);
  g.strokeStyle = "rgba(140,140,150,0.35)"; g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { g.beginPath(); let x0 = tx + ((i * 37) % towerW), y0 = towerTop + (i * 53) % (towerBot - towerTop); g.moveTo(x0, y0);
    for (let s = 0; s < 4; s++) { x0 += 10; y0 += (s % 2 ? -8 : 9); g.lineTo(Math.min(x0, tx + towerW), y0); } g.stroke(); }
  // 창문 (따뜻한 불빛) + 금색 세로 띠
  const cols = 4, rows = 5, gw = towerW / cols;
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
    const wx = tx + i * gw + gw * 0.2, wy = towerTop + 54 + r * ((towerBot - towerTop - 70) / rows);
    const wg = g.createLinearGradient(0, wy, 0, wy + 26); wg.addColorStop(0, "#ffe7a6"); wg.addColorStop(1, "#ffb85a");
    g.fillStyle = (r + i) % 3 === 0 ? "#3a3a5a" : wg; g.fillRect(wx, wy, gw * 0.6, 26);
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(wx, wy, gw * 0.6, 26);
  }
  g.fillStyle = "#d4a73a"; for (let i = 1; i < cols; i++) g.fillRect(tx + i * gw - 2, towerTop, 4, towerBot - towerTop);
  // 간판
  g.fillStyle = "#2b2233"; g.fillRect(tx + 14, towerTop + 8, towerW - 28, 38);
  g.strokeStyle = "#ffd447"; g.lineWidth = 3; g.strokeRect(tx + 14, towerTop + 8, towerW - 28, 38);
  g.fillStyle = "#ffd447"; g.font = `28px ${FONT_GAME}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("건물주 타워", tx + towerW / 2, towerTop + 28);
  g.beginPath(); g.rect(tx, towerTop, towerW, towerBot - towerTop); stroke();
  // 1층 로비: 기둥 + 회전문
  g.fillStyle = "#fbf3df"; g.fillRect(X, towerBot, w, podH);
  g.fillStyle = "#d4a73a"; g.fillRect(X - 6, towerBot - 6, w + 12, 12);
  for (let i = 0; i < 6; i++) { const px = X + 14 + i * ((w - 40) / 5); g.fillStyle = "#ece6d8"; g.fillRect(px, towerBot + 6, 12, podH - 6); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(px, towerBot + 6, 12, podH - 6); }
  g.fillStyle = "#5a7a9a"; g.fillRect(X + w / 2 - 26, towerBot + 18, 52, podH - 18);
  g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(X + w / 2 - 20, towerBot + 22, 8, podH - 26);
  g.beginPath(); g.rect(X, towerBot - 6, w, podH + 6); stroke();
  g.strokeRect(X + w / 2 - 26, towerBot + 18, 52, podH - 18);
  return c;
}

// ================================================================ 게임
const HW = 1.3;                                   // 캐릭터 몸 반폭 (단위)
Pose.cheer = (s) => {
  const p = Pose.stand();
  const wave = Math.sin(s * 8) * 0.35;
  p.elbowL = [-1.1, 6.9]; p.handL = [-1.6 + wave, 8.3]; p.elbowR = [1.1, 6.9]; p.handR = [1.6 - wave, 8.3];
  return p;
};

function makeTower() {
  const plats = [];
  let prev = WORLD_W / 2;
  for (let f = 1; f <= FLOORS; f++) {
    const goal = f === FLOORS;
    const w = goal ? 27 : clamp(lerp(24.8, 16.8, f / FLOORS) + rand(-1.9, 1.9), 15.2, 27.2);   // 발판 길이
    let shift = rand(12, 34) * (Math.random() < 0.5 ? -1 : 1);
    let cx = prev + shift;
    if (cx < LEFT + w / 2 + 1 || cx > RIGHT - w / 2 - 1) cx = prev - shift;
    cx = clamp(cx, LEFT + w / 2 + 1, RIGHT - w / 2 - 1);
    let type = "normal";
    if (!goal && f > 2) { const r = Math.random(); type = r < 0.22 ? "slip" : r < 0.37 ? "vanish" : "normal"; }
    const p = { floor: f, x: cx - w / 2, w, y: GROUND_Y + GAP * f, type, goal, seed: Math.floor(Math.random() * 1e9),
      vt: -1, gone: false, respawn: 0, alpha: 1 };
    p.art = makePlatformArt(p);
    plats.push(p);
    prev = cx;
  }
  return plats;
}

class Game {
  constructor() {
    this.pauseC = { x: VW - 56, y: 60 };
    this.btnResume = new Button(VW / 2, 600, 360, 92, "계속하기", [255, 150, 70]);
    this.btnPauseMenu = new Button(VW / 2, 720, 360, 84, "메인 화면", [110, 140, 220]);
    this.btnRetry = new Button(VW / 2, 900, 380, 92, "다시 도전", [255, 150, 70]);
    this.btnMenu = new Button(VW / 2, 1020, 380, 84, "메인 화면", [110, 140, 220]);
    this.btnSave = new Button(VW / 2 + 215, 760, 150, 72, "등록", [120, 200, 100], 34);
    this.nameRect = { x: VW / 2 - 85 - 190, y: 760 - 36, w: 380, h: 72 };
    this.reset();
  }
  reset() {
    this.plats = makeTower();
    this.pl = { x: WORLD_W / 2, y: GROUND_Y, vx: 0, vy: 0, state: "ready", aimT: 0, angle: 0, power: 0, chargeT: 0,
      locked: 0, jumpAngle: 0, tapPower: TAP_IMPULSE, on: null, landT: 0, slideV: 0, frogT: 0, standFloor: 0 };
    this.pose = Pose.crouch(0.3, 0);
    this.camY = 0; this.t = 0; this.elapsed = 0; this.started = false;
    this.best = 0; this.falls = 0;
    this.state = "play"; this.clearT = 0;
    this.texts = []; this.sparks = [];
    this.jumpPointer = null;
    this.entering = false; this.entryRank = null; this.savedRank = null; this.saveMsg = "";
    this.gen = (this.gen || 0) + 1;
    for (const b of [this.btnResume, this.btnPauseMenu, this.btnRetry, this.btnMenu, this.btnSave]) b.reset();
    hideNameInput();
    if (DEBUG_START_FLOOR > 0) {                      // 디버그: 지정한 층 발판 위에서 시작
      const p = this.plats[clamp(DEBUG_START_FLOOR, 1, FLOORS - 1) - 1];
      Object.assign(this.pl, { x: p.x + p.w / 2, y: p.y, on: p, standFloor: p.floor });
      this.best = p.floor; this.camY = p.y - GROUND_Y;
    }
  }
  // ------------------------------------------------------------ 입력
  key(code) {
    if (code === "Escape" || code === "KeyP") {
      if (this.state === "play") this.pause(); else if (this.state === "pause") this.state = "play";
    }
  }
  pointer(kind, who, p) {
    if (this.state === "play") {
      if (kind === "down") {
        if (Math.hypot(p.x - this.pauseC.x, p.y - this.pauseC.y) < 44) { this.pause(); return; }
        if (this.jumpPointer === null) { this.jumpPointer = who; this.jumpDown(); }
      } else if (kind === "up" && who === this.jumpPointer) { this.jumpPointer = null; this.jumpUp(); }
    } else if (this.state === "pause") {
      if (this.btnResume.pointer(kind, who, p)) this.state = "play";
      else if (this.btnPauseMenu.pointer(kind, who, p)) goMenu();
    } else if (this.state === "clear" && this.clearT > CLEAR_DELAY) {
      if (this.entering && this.btnSave.pointer(kind, who, p)) { this.submitName(); return; }
      if (this.btnRetry.pointer(kind, who, p)) { this.submitName(); this.reset(); }
      else if (this.btnMenu.pointer(kind, who, p)) { this.submitName(); goMenu(); }
    }
  }
  pause() { if (this.state === "play") { this.state = "pause"; this.jumpPointer = null; if (this.pl.state === "charge") this.pl.state = "ready"; } }
  jumpDown() {
    if (this.state !== "play") return;
    const pl = this.pl;
    if (pl.state === "ready") {                        // 방향 고정 → 게이지 충전 시작
      pl.state = "charge"; pl.locked = pl.angle; pl.chargeT = 0; pl.power = 0;
    } else if (pl.state === "air") {                   // 공중 연타: 처음 점프 방향으로 살짝 밀기
      const a = pl.jumpAngle * Math.PI / 180;
      pl.vx += pl.tapPower * Math.sin(a);
      pl.vy += pl.tapPower * Math.cos(a);
      pl.tapPower *= TAP_DECAY;
      pl.frogT = 0.38;
      Sound.tap();
    }
  }
  jumpUp() {
    if (this.state !== "play") return;
    const pl = this.pl;
    if (pl.state !== "charge") return;
    const speed = V0 * (MIN_POWER + (1 - MIN_POWER) * pl.power);
    const a = pl.locked * Math.PI / 180;
    pl.vx = speed * Math.sin(a); pl.vy = speed * Math.cos(a);
    pl.jumpAngle = pl.locked; pl.tapPower = TAP_IMPULSE; pl.frogT = 0;
    pl.state = "air"; pl.on = null;
    this.started = true;
    Sound.jump(pl.power);
    this.puff(pl.x, pl.y, 8);
  }
  // ------------------------------------------------------------ 업데이트
  update(dt) {
    if (this.state === "pause") return;
    this.t += dt;
    const pl = this.pl;
    if (this.state === "clear") { this.clearT += dt; this.updatePose(dt); this.updateFx(dt); this.updateCamera(dt);
      if (this.entering && this.clearT > CLEAR_DELAY && !nameBox) showNameInput(this.nameRect);
      if (Math.random() < 0.6) this.confetti();
      return; }
    if (this.started) this.elapsed += dt * 1000;
    this.updatePlatforms(dt);
    switch (pl.state) {
      case "ready":
        pl.aimT += dt;
        pl.angle = AIM_MAX * Math.sin(2 * Math.PI * pl.aimT / AIM_PERIOD);   // 메트로놈
        this.checkSupport();
        break;
      case "charge": {
        pl.chargeT += dt;
        const ph = (pl.chargeT / CHARGE_TIME) % 2;
        const was = pl.power;
        pl.power = ph <= 1 ? ph : 2 - ph;
        if ((was < 0.98 && pl.power >= 0.98) || (was > 0.02 && pl.power <= 0.02)) Sound.tick(pl.power);
        this.checkSupport();
        break;
      }
      case "land":
        pl.landT += dt;
        if (pl.landT > 0.62) { pl.state = "ready"; }
        this.checkSupport();
        break;
      case "slide": {
        pl.x += pl.slideV * dt;
        const s = Math.sign(pl.slideV);
        pl.slideV -= s * SLIP_FRICTION * dt;
        if (Math.sign(pl.slideV) !== s) pl.slideV = 0;
        this.walls(true);
        if (Math.abs(pl.slideV) < 0.4) { pl.state = "land"; pl.landT = 0.38; }
        this.checkSupport();
        break;
      }
      case "air": this.updateAir(dt); break;
    }
    this.updatePose(dt);
    this.updateCamera(dt);
    this.updateFx(dt);
  }
  updatePlatforms(dt) {
    for (const p of this.plats) {
      if (p.type !== "vanish" || p.vt < 0) continue;
      if (!p.gone) {
        p.vt += dt;
        p.alpha = clamp(1 - Math.pow(p.vt / VANISH_TIME, 1.6), 0, 1);   // 점점 흐려짐
        if (p.vt >= VANISH_TIME) {
          p.gone = true; p.respawn = RESPAWN_TIME; p.alpha = 0;
          if (Math.abs(p.y - this.camY - 50) < 60) {
            Sound.crack();
            this.float(meme("vanish"), p.x + p.w / 2, p.y + 4, "#c9b8e8", 2.4);
          }
        }
      } else {
        p.respawn -= dt;
        if (p.respawn <= 0) { p.gone = false; p.vt = -1; p.alpha = 1; p.fadeIn = 0.6; }   // 다시 생김 (처음처럼)
      }
      if (p.fadeIn) p.fadeIn = Math.max(0, p.fadeIn - dt);
    }
  }
  /** 서 있는 발판이 사라졌거나 발이 발판 밖이면 떨어짐 */
  checkSupport() {
    const pl = this.pl, p = pl.on;
    if (!p) return;                                   // 흙바닥
    const inside = pl.x >= p.x - HW * 0.5 && pl.x <= p.x + p.w + HW * 0.5;
    if (p.gone || !inside) {
      const vx = pl.state === "slide" ? pl.slideV : 0;
      pl.state = "air"; pl.vx = vx; pl.vy = 0; pl.on = null; pl.slideV = 0;
      pl.jumpAngle = clamp(pl.vx * 2, -40, 40); pl.tapPower = TAP_IMPULSE * 0.6;
    }
  }
  walls(sliding = false) {
    const pl = this.pl;
    const hit = (side) => {
      Sound.wall();
      if (this.t - (this.lastWallLine || -9) > 1.5) {          // 벽에 닿으면 도망칠 수 없다는 한마디 (너무 자주는 말고)
        this.lastWallLine = this.t;
        this.float(meme("wall"), pl.x - side * 8, pl.y + 6, "#f2ecff", 2.4, 32);
      }
      this.puff(pl.x + side * HW, pl.y + 4, 6, "rgba(255,255,255,0.8)");
    };
    if (pl.x - HW < LEFT) {
      pl.x = LEFT + HW;
      if (sliding) pl.slideV = Math.abs(pl.slideV) * WALL_BOUNCE; else pl.vx = Math.abs(pl.vx) * WALL_BOUNCE;
      pl.jumpAngle = Math.abs(pl.jumpAngle); hit(-1);
    } else if (pl.x + HW > RIGHT) {
      pl.x = RIGHT - HW;
      if (sliding) pl.slideV = -Math.abs(pl.slideV) * WALL_BOUNCE; else pl.vx = -Math.abs(pl.vx) * WALL_BOUNCE;
      pl.jumpAngle = -Math.abs(pl.jumpAngle); hit(1);
    }
  }
  updateAir(dt) {
    const pl = this.pl;
    const prevY = pl.y;
    pl.vy -= GRAVITY * dt;
    pl.vy = Math.max(pl.vy, -320);                    // 너무 빨라지지 않게 (발판 통과 방지)
    pl.x += pl.vx * dt; pl.y += pl.vy * dt;
    pl.frogT = Math.max(0, pl.frogT - dt);
    this.walls();
    if (pl.vy > 0) return;
    // 위에서 내려오며 발판 윗면을 지나면 착지 (아래에서는 통과)
    for (const p of this.plats) {
      if (p.gone) continue;
      if (prevY >= p.y - 0.01 && pl.y <= p.y && pl.x >= p.x - HW * 0.5 && pl.x <= p.x + p.w + HW * 0.5) { this.land(p); return; }
    }
    if (pl.y <= GROUND_Y) this.land(null);
  }
  land(p) {
    const pl = this.pl;
    const hard = clamp(-pl.vy / 200, 0, 1);
    pl.y = p ? p.y : GROUND_Y;
    pl.on = p;
    Sound.land(hard);
    this.puff(pl.x, pl.y, 6 + Math.round(hard * 8));
    const floor = p ? p.floor : 0;
    const drop = pl.standFloor - floor;
    // 한국 증시 색: 오르면 빨강, 떨어지면 파랑
    if (drop >= 5) {                                  // 크게 추락: 안 좋은 밈
      this.float(meme("crash"), pl.x, pl.y + 16, "#8fb4ff", 2.6, 40);
      this.float(floor === 0 ? "태초의 흙바닥으로…" : `-${drop}층`, pl.x, pl.y + 10, "#cfdcff", 2.6, 28);
      Sound.fallBig(); this.falls++;
    } else if (drop >= 1) {                           // 1~4층 추락: 돈 · 투자 · 부동산 · 건강 손해
      this.float(meme("loss"), pl.x, pl.y + 16, "#6fa0ff", 2.2, 36);
      this.float(floor === 0 ? "태초의 흙바닥으로…" : `-${drop}층`, pl.x, pl.y + 10, "#cfdcff", 2.2, 26);
      this.falls++;
    } else if (floor > pl.standFloor && !(p && p.goal)) {   // 올라감: 좋은 말 (꼭대기는 대사로 대신)
      this.float(meme("up"), pl.x, pl.y + 16, "#ff6b5b", 2.2, 38);
      this.float(`${floor}층 · ${tierOf(floor).name}`, pl.x, pl.y + 10, "#ffe7a0", 2.2, 26);
    }
    pl.standFloor = floor;
    this.best = Math.max(this.best, floor);
    if (p && p.type === "vanish" && p.vt < 0) p.vt = 0;
    if (p && p.goal) { this.clear(); return; }
    if (p && p.type === "slip" && Math.abs(pl.vx * SLIP_RATIO) > 0.5) {
      pl.slideV = pl.vx * SLIP_RATIO; pl.state = "slide"; Sound.slip();
    } else {
      pl.state = "land"; pl.landT = 0;
    }
    pl.vx = 0; pl.vy = 0;
  }
  clear() {
    const pl = this.pl;
    pl.state = "clear"; this.state = "clear"; this.clearT = 0;
    Sound.clear();
    this.entryRank = DEBUG_START_FLOOR > 0 ? null : Ranking.rankOf(this.elapsed);
    this.entering = !!this.entryRank && !Ranking.error;
  }
  async submitName() {
    if (!this.entering) return;
    const gen = this.gen;
    const name = (nameInput.value || "").trim().slice(0, 8) || "익명의 세입자";
    this.entering = false; hideNameInput();
    this.saveMsg = "저장하는 중…";
    try {
      const rank = await Ranking.add(name, this.elapsed);
      if (gen === this.gen) { this.savedRank = rank; this.saveMsg = ""; }
    } catch (e) {
      if (gen === this.gen) this.saveMsg = "랭킹에 저장하지 못했어요";
    }
  }
  updatePose(dt) {
    const pl = this.pl;
    let target, lift = null;
    switch (pl.state) {
      case "ready": target = Pose.crouch(0.3, pl.angle * 0.5); break;
      case "charge": target = Pose.crouch(0.3 + 0.55 * pl.power, pl.locked * 0.55, pl.power); break;
      case "air": {
        const rot = pl.jumpAngle * (pl.vy > 0 ? 1 : 0.55);
        target = pl.frogT > 0 ? Pose.frog(1 - pl.frogT / 0.38, rot) : Pose.straight(rot);
        break;
      }
      case "land": {
        const t = pl.landT;
        if (t < 0.38) {                               // 통-통 튀기
          target = Pose.crouch(0.5, 0);
          lift = t < 0.22 ? 0.9 * Math.sin(Math.PI * t / 0.22) : 0.3 * Math.sin(Math.PI * (t - 0.22) / 0.16);
        } else target = Pose.stand();                 // 일어나기
        break;
      }
      case "slide": target = Pose.crouch(0.35, -Math.sign(pl.slideV) * 14, 0.6); break;
      case "clear": target = Pose.cheer(this.t); break;
      default: target = Pose.stand();
    }
    this.pose = blendPose(this.pose, target, 1 - Math.exp(-dt * (pl.state === "air" ? 22 : 16)));
    if (lift !== null) this.pose.lift = lift;
  }
  updateCamera(dt) {
    const pl = this.pl;
    let target = this.camY;
    if (pl.state !== "air") target = pl.y - GROUND_Y;
    else if (pl.y < this.camY + 12) target = pl.y - 12;
    else if (pl.y > this.camY + 70) target = pl.y - 70;
    target = clamp(target, 0, TOP_Y - GROUND_Y);
    this.camY += (target - this.camY) * Math.min(1, dt * (pl.state === "air" ? 6 : 3.5));
  }
  float(str, x, y, color, life = 1.6, size = 34) { this.texts.push({ str, x, y, color, t: 0, life, size }); }
  puff(x, y, n, color = "rgba(235,220,200,0.85)") {
    for (let i = 0; i < n; i++) this.sparks.push({ x, y, vx: rand(-14, 14), vy: rand(2, 12), life: rand(0.3, 0.6), r: rand(0.3, 0.7), color });
  }
  confetti() {
    const cols = ["#ffd447", "#ff6b6b", "#6bd4ff", "#9cff6b", "#ffffff"];
    this.sparks.push({ x: rand(LEFT, RIGHT), y: this.camY + 102, vx: rand(-6, 6), vy: rand(-18, -8), life: 2.5, r: rand(0.35, 0.6), color: cols[Math.floor(rand(0, 5))], g: 0 });
  }
  updateFx(dt) {
    for (const f of this.texts) { f.t += dt; f.y += 6 * dt; }
    this.texts = this.texts.filter((f) => f.t < f.life);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.g === undefined) s.vy -= 30 * dt; s.life -= dt; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  // ------------------------------------------------------------ 그리기
  sx(x) { return x * U; }
  sy(y) { return VH - (y - this.camY) * U; }
  draw() {
    const camPx = this.camY * U, pl = this.pl;
    drawBackground(camPx, this.t);
    drawGround(camPx);
    for (const p of this.plats) {
      const y = this.sy(p.y);
      if (y < -60 || y > VH + 60 || p.gone) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha * (p.fadeIn ? 1 - p.fadeIn / 0.6 : 1);
      if (p.type === "vanish" && p.vt > VANISH_TIME - 2) ctx.translate(Math.sin(this.t * 60) * 1.5, 0);   // 사라지기 직전 덜덜
      ctx.drawImage(p.art, this.sx(p.x) - 14, y - 14);
      ctx.restore();
    }
    const goal = this.plats[FLOORS - 1], gy = this.sy(goal.y);
    if (gy > -60 && gy - 420 < VH) this.drawGoal(goal, gy);   // 꼭대기 빌딩 (막대 인간 뒤)
    drawSpikes(camPx);
    for (const s of this.sparks) circle(this.sx(s.x), this.sy(s.y), s.r * U, s.color);
    // 조준 화살표 + 게이지
    if (this.state === "play" && (pl.state === "ready" || pl.state === "charge")) this.drawAim();
    const fx = this.sx(pl.x), fy = this.sy(pl.y);
    drawStickman(this.pose, fx, fy);
    if (this.state === "clear" && this.clearT <= CLEAR_DELAY) this.drawSpeech(GOAL_LINE);
    for (const f of this.texts) {
      ctx.font = `${f.size}px ${FONT_GAME}`;
      const half = ctx.measureText(f.str).width / 2 + 56;
      const fx = clamp(this.sx(f.x), half, VW - half);                // 긴 문장도 화면 밖으로 안 잘리게
      ctx.save(); ctx.globalAlpha = clamp((f.life - f.t) / 0.4, 0, 1);
      text(f.str, fx, this.sy(f.y) - 60, { size: f.size, color: f.color, ow: f.size > 30 ? 7 : 5 });
      ctx.restore();
    }
    this.drawHud();
    if (this.state === "pause") {
      ctx.fillStyle = "rgba(15,10,25,0.6)"; ctx.fillRect(0, 0, VW, VH);
      text("잠깐 쉬는 중", VW / 2, 470, { size: 64, ow: 8 });
      this.btnResume.draw(); this.btnPauseMenu.draw();
    } else if (this.state === "clear" && this.clearT > CLEAR_DELAY) this.drawClear();
  }
  drawGoal(p, y) {
    if (!ART.goal) ART.goal = makeGoalBuilding(Math.round(p.w * U * 0.62), 380);
    const b = ART.goal, x = this.sx(p.x + p.w / 2);
    if (this.state === "clear") {                     // 도착하면 빌딩 뒤로 금빛
      const g = ctx.createRadialGradient(x, y - 200, 20, x, y - 200, 320);
      g.addColorStop(0, "rgba(255,225,120,0.55)"); g.addColorStop(1, "rgba(255,200,90,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 330, y - 520, 660, 520);
    }
    ctx.drawImage(b, x - b.width / 2, y - b.height + 2);
  }
  drawSpeech(str) {                                   // 막대 인간 머리 위 말풍선
    const pl = this.pl, hx = this.sx(pl.x), hy = this.sy(pl.y + 9.5);
    ctx.save();
    ctx.font = `36px ${FONT_GAME}`;
    const w = ctx.measureText(str).width + 48, h = 70;
    const bx = clamp(hx - w / 2, 50, VW - 50 - w), by = hy - h - 26;
    const pop = Math.min(1, this.clearT / 0.25);
    ctx.translate(hx, by + h); ctx.scale(pop, pop); ctx.translate(-hx, -(by + h));
    ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = INK; ctx.lineWidth = 5;
    rr(bx, by, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 14, by + h - 3); ctx.lineTo(hx + 4, by + h + 26); ctx.lineTo(hx + 16, by + h - 3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillRect(hx - 12, by + h - 6, 26, 6);
    ctx.restore();
    ctx.save(); ctx.translate(hx, by + h); ctx.scale(pop, pop); ctx.translate(-hx, -(by + h));
    text(str, bx + w / 2, by + h / 2 + 2, { size: 36, color: INK, outline: false });
    ctx.restore();
  }
  drawAim() {
    const pl = this.pl;
    const ang = pl.state === "charge" ? pl.locked : pl.angle;
    const a = ang * Math.PI / 180;
    const cx = this.sx(pl.x), cy = this.sy(pl.y + 4.5);
    const len = (8 + (pl.state === "charge" ? pl.power * 6 : 0)) * U;
    const ex = cx + Math.sin(a) * len, ey = cy - Math.cos(a) * len;
    const col = pl.state === "charge" ? `rgb(255,${Math.round(220 - pl.power * 170)},${Math.round(90 - pl.power * 60)})` : "rgba(255,255,255,0.85)";
    // 범위 표시 (±60도 부채꼴)
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 8 * U, -Math.PI / 2 - AIM_MAX * Math.PI / 180, -Math.PI / 2 + AIM_MAX * Math.PI / 180); ctx.closePath(); ctx.fill();
    ctx.lineCap = "round";
    ctx.strokeStyle = INK; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * 2.5 * U, cy - Math.cos(a) * 2.5 * U); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.stroke();
    const hx = Math.sin(a), hy = -Math.cos(a), px = -hy, py = hx, hs = 22;
    ctx.beginPath(); ctx.moveTo(ex + hx * hs, ey + hy * hs); ctx.lineTo(ex + px * hs * 0.75, ey + py * hs * 0.75); ctx.lineTo(ex - px * hs * 0.75, ey - py * hs * 0.75); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    if (pl.state === "charge") {                       // 세기 게이지
      const gx = cx + (pl.x > WORLD_W / 2 ? -5.5 : 3.5) * U, gy = this.sy(pl.y + 11), gh = 10 * U, gw = 22;
      ctx.fillStyle = "rgba(20,14,30,0.75)"; rr(gx, gy, gw, gh, 8); ctx.fill();
      const fh = gh * pl.power;
      const grad = ctx.createLinearGradient(0, gy + gh, 0, gy);
      grad.addColorStop(0, "#6bd46b"); grad.addColorStop(0.6, "#ffd447"); grad.addColorStop(1, "#ff5a4a");
      ctx.fillStyle = grad; rr(gx + 3, gy + gh - fh + 3, gw - 6, Math.max(0, fh - 6), 5); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; rr(gx, gy, gw, gh, 8); ctx.stroke();
    }
  }
  drawHud() {
    const pl = this.pl;
    ctx.fillStyle = "rgba(20,14,30,0.55)"; rr(VW / 2 - 140, 22, 280, 76, 20); ctx.fill();
    text(fmtTime(this.elapsed), VW / 2, 61, { size: 46, font: `46px ${FONT_TITLE}`, ow: 7, color: this.started ? "#fff" : "#cfc6d8" });
    const floor = pl.standFloor, tier = tierOf(floor);
    text(`${floor}층 · ${tier.name}`, 52, 132, { size: 32, align: "left", ow: 6, color: "#ffe7a0" });
    text(`최고 ${this.best}층`, 52, 170, { size: 24, align: "left", ow: 5, color: "#e8dcef" });
    if (!this.started && this.state === "play") text("스페이스(터치)를 꾹 눌렀다 떼서 점프!", VW / 2, 230, { size: 30, ow: 6 });
    // 오른쪽 높이 막대
    const bx = VW - 60, by0 = 150, by1 = VH - 150;
    ctx.fillStyle = "rgba(20,14,30,0.5)"; rr(bx - 7, by0, 14, by1 - by0, 7); ctx.fill();
    const py = lerp(by1, by0, clamp((pl.y - GROUND_Y) / (TOP_Y - GROUND_Y), 0, 1));
    const bestY = lerp(by1, by0, this.best / FLOORS);
    ctx.fillStyle = "#ffd447"; ctx.fillRect(bx - 12, bestY - 2, 24, 4);
    circle(bx, py, 11, "#0e0c12", "#fff", 3);
    // 일시정지
    const c = this.pauseC;
    circle(c.x, c.y + 5, 34, INK); circle(c.x, c.y, 34, "#fff", INK, 4);
    ctx.fillStyle = INK; ctx.fillRect(c.x - 12, c.y - 14, 8, 28); ctx.fillRect(c.x + 4, c.y - 14, 8, 28);
  }
  drawClear() {
    ctx.fillStyle = "rgba(15,10,25,0.66)"; ctx.fillRect(0, 0, VW, VH);
    text("건물주 달성!", VW / 2, 380, { size: 78, color: "#ffd447", ow: 9 });
    text(`"${GOAL_LINE}"`, VW / 2, 450, { size: 34, ow: 6, color: "#fff4d6" });
    text(fmtTime(this.elapsed), VW / 2, 560, { size: 84, font: `84px ${FONT_TITLE}`, ow: 9 });
    text(`추락 ${this.falls}번`, VW / 2, 640, { size: 30, ow: 6, color: "#e8dcef" });
    let msg = "", col = "#fff", y = 700;
    if (this.entering) { msg = `${this.entryRank}위 기록! 이름을 쓰고 등록을 눌러 주세요`; col = "#a8f08a"; }
    else if (this.saveMsg) msg = this.saveMsg;
    else if (this.savedRank) { msg = `${this.savedRank}위로 랭킹에 올랐어요!`; col = "#ffd447"; y = 760; }
    else if (DEBUG_START_FLOOR > 0) { msg = `디버그 모드(${DEBUG_START_FLOOR}층 시작)라 랭킹에 저장 안 해요`; col = "#cfc6d8"; y = 760; }
    else if (Ranking.error) msg = Ranking.error;
    else { const last = Ranking.list[9]; msg = last ? `아쉽게 10위 밖이에요 (10위 ${fmtTime(last.time_ms)})` : ""; y = 760; }
    if (msg) text(msg, VW / 2, y, { size: 30, color: col, ow: 6 });
    if (this.entering) this.btnSave.draw();
    this.btnRetry.draw(); this.btnMenu.draw();
  }
}

// ================================================================ 게임 설명 (3쪽)
const HELP_PAGES = ["조작법", "발판", "규칙과 랭킹"];
const PANEL = { x: 40, y: 150, w: VW - 80, h: 980 };
class Help {
  constructor() {
    this.open = false; this.page = 0;
    this.prev = new Button(PANEL.x + 120, PANEL.y + PANEL.h - 62, 190, 72, "◀ 이전", [110, 140, 220], 32);
    this.next = new Button(PANEL.x + PANEL.w - 120, PANEL.y + PANEL.h - 62, 190, 72, "다음 ▶", [255, 150, 70], 32);
    this.close = new Button(PANEL.x + PANEL.w - 74, PANEL.y + 50, 110, 60, "닫기", [235, 95, 95], 30);
    this.demoPose = Pose.crouch(0.3, 0);
    this.t = 0;
    this.demo = null;
  }
  show() { this.open = true; this.page = 0; for (const b of [this.prev, this.next, this.close]) b.reset(); }
  flip(d) { this.page = clamp(this.page + d, 0, HELP_PAGES.length - 1); }
  key(code) {
    if (code === "Escape" || code === "KeyH") this.open = false;
    else if (code === "ArrowRight" || code === "Enter") { if (this.page === HELP_PAGES.length - 1) this.open = false; else this.flip(1); }
    else if (code === "ArrowLeft") this.flip(-1);
  }
  pointer(kind, who, p) {
    if (this.close.pointer(kind, who, p)) { this.open = false; return; }
    if (this.page > 0 && this.prev.pointer(kind, who, p)) { this.flip(-1); return; }
    if (this.next.pointer(kind, who, p)) { if (this.page === HELP_PAGES.length - 1) this.open = false; else this.flip(1); }
  }
  t2(str, x, y, o = {}) {
    ctx.save();
    ctx.font = o.font || `${o.size || 27}px ${FONT_BODY}`;
    ctx.fillStyle = o.color || "#fff"; ctx.textAlign = o.align || "left"; ctx.textBaseline = "top";
    ctx.fillText(str, x, y); ctx.restore();
  }
  head(str, x, y) { this.t2(str, x, y, { font: `34px ${FONT_GAME}`, color: "#ffd447" }); }
  lines(x, y, arr, gap = 40) { for (const s of arr) { const [str, col] = typeof s === "string" ? [s, "#fff"] : s; this.t2(str, x, y, { color: col }); y += gap; } return y; }
  keycap(label, x, y, w) {
    ctx.fillStyle = INK; rr(x, y + 5, w, 56, 10); ctx.fill();
    ctx.fillStyle = "#f2f0f5"; rr(x, y, w, 56, 10); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    text(label, x + w / 2, y + 29, { size: 26, outline: false, color: INK });
  }
  pageControls(x, y) {
    this.keycap("SPACE", x, y, 230);
    this.t2("또는 화면 터치", x + 250, y + 12, { size: 28, color: "#e8dcef" });
    y += 90;
    // 데모: 메트로놈 화살표 + 쭈그린 막대 인간
    const ang = AIM_MAX * Math.sin(2 * Math.PI * this.t / AIM_PERIOD);
    const cx = x + 120, cy = y + 210;
    ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath(); ctx.moveTo(cx, cy - 4.5 * U); ctx.arc(cx, cy - 4.5 * U, 120, -Math.PI / 2 - Math.PI / 3, -Math.PI / 2 + Math.PI / 3); ctx.closePath(); ctx.fill();
    const a = ang * Math.PI / 180;
    ctx.lineCap = "round"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(cx, cy - 4.5 * U); ctx.lineTo(cx + Math.sin(a) * 110, cy - 4.5 * U - Math.cos(a) * 110); ctx.stroke();
    ctx.restore();
    this.demoPose = blendPose(this.demoPose, Pose.crouch(0.3, ang * 0.5), 0.2);
    drawStickman(this.demoPose, cx, cy);
    this.lines(x + 250, y, [
      ["① 화살표가 메트로놈처럼", "#ffe7a0"], ["   좌우 60도 사이를 왔다 갔다", "#fff"],
      ["② 꾹 누르는 순간 방향 고정,", "#ffe7a0"], ["   게이지가 차올라요", "#fff"],
      ["   (꽉 차면 다시 줄어들어요)", "#cfc6d8"],
      ["③ 떼는 순간 그 세기로 점프!", "#ffe7a0"],
    ], 42);
    y += 300;
    this.head("공중에서 연타", x, y);
    this.lines(x, y + 52, [
      "점프한 뒤 스페이스(터치)를 톡톡 연타하면",
      "처음 점프 방향으로 살짝 더 밀어 줘요.",
      ["연타할수록 힘이 줄어요. 미세 조정용!", "#cfc6d8"],
    ]);
    this.head("일시정지", x, y + 210);
    this.t2("ESC · P 키, 또는 오른쪽 위 ( II ) 버튼", x, y + 262);
  }
  pageFloors(x, y) {
    this.head("올라갈수록 좋은 발판", x, y);
    const tiers = [["흙수저 (바닥)", "dirt", 0], ["나무 판자 1~6층", "wood", 3], ["벽돌 7~12층", "brick", 9], ["돌 13~18층", "stone", 15],
      ["강철 19~24층", "steel", 21], ["대리석 25~29층", "marble", 27], ["건물주 30층", "gold", 30]];
    if (!this.arts) {
      this.arts = tiers.map(([, key, f]) => key === "dirt" ? null : makePlatformArt({ floor: f, w: 9, type: "normal", goal: key === "gold", seed: 3 }));
      this.wet = [3, 15, 27].map((f) => makePlatformArt({ floor: f, w: 9, type: "slip", goal: false, seed: 4 }));
    }
    tiers.forEach(([name, key], i) => {
      const yy = y + 58 + i * 44;
      if (this.arts[i]) ctx.drawImage(this.arts[i], x - 14, yy - 14, this.arts[i].width * 0.62, this.arts[i].height * 0.62);
      else { ctx.fillStyle = "#6b4a2e"; ctx.fillRect(x, yy, 9 * U * 0.62, PLAT_H * U * 0.62); }
      this.t2(name, x + 90, yy - 6, { size: 26 });
    });
    y += 370;
    this.head("발판 종류", x, y);
    y = this.lines(x, y + 52, [
      ["기본 발판: 닿으면 그 자리에 딱 멈춰요", "#fff"],
      ["미끄러운 발판: 물기가 고여 있어요.", "#fff"],
      ["   날아온 속도만큼 좌우로 살짝 미끄러져요", "#cfc6d8"],
    ], 40);
    this.wet.forEach((art, i) => ctx.drawImage(art, x + 40 + i * 170, y + 6, art.width * 0.62, art.height * 0.62));
    this.t2("빗물  →  …  →  핏물 (위로 갈수록)", x + 40, y + 60, { size: 24, color: "#ffb3a8" });
    this.lines(x, y + 110, [
      ["사라지는 발판: 겉보기엔 기본 발판과 똑같아요.", "#fff"],
      ["   밟으면 10초 동안 점점 흐려지다 사라져요", "#cfc6d8"],
      ["   (조금 뒤 다시 생겨요)", "#cfc6d8"],
    ], 40);
  }
  pageRules(x, y) {
    this.head("목표", x, y);
    y = this.lines(x, y + 52, ["흙바닥에서 출발해 30층 꼭대기", "대리석 펜트하우스에 올라서면 건물주!"], 40);
    this.head("떨어지면?", x, y + 20);
    y = this.lines(x, y + 72, ["죽지 않아요. 대신 떨어진 곳에서 다시 시작.", ["운 나쁘면 태초의 흙바닥까지…", "#ffb3a8"]], 40);
    this.head("양옆 가시 벽", x, y + 20);
    y = this.lines(x, y + 72, ["닿으면 반대쪽으로 튕겨 나와요.", ["운이 좋으면 발판 위로 다시 떨어지기도!", "#cfc6d8"]], 40);
    this.head("랭킹", x, y + 20);
    this.lines(x, y + 72, ["첫 점프부터 꼭대기까지 걸린 시간이 기록이에요.",
      "빠를수록 위! 10위 안에 들면 이름을 남겨요.",
      [Ranking.mode === "online" ? "랭킹은 링크로 들어온 모두가 함께 써요." : "지금 랭킹은 이 기기에만 저장돼요.", "#a8f08a"]], 40);
  }
  draw(dt) {
    this.t += dt;
    ctx.fillStyle = "rgba(15,10,25,0.6)"; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "rgb(38,26,54)"; rr(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,210,150,0.7)"; ctx.stroke();
    text(`게임 설명 · ${HELP_PAGES[this.page]}`, PANEL.x + 40, PANEL.y + 52, { size: 40, align: "left", color: "#ffd447", ow: 6 });
    const x = PANEL.x + 40, y = PANEL.y + 120;
    [this.pageControls, this.pageFloors, this.pageRules][this.page].call(this, x, y);
    for (let i = 0; i < HELP_PAGES.length; i++) circle(VW / 2 + (i - 1) * 30, PANEL.y + PANEL.h - 62, 9, i === this.page ? "#ffd447" : "#6a5a80");
    if (this.page > 0) this.prev.draw();
    this.next.label = this.page === HELP_PAGES.length - 1 ? "닫기" : "다음 ▶";
    this.next.draw(); this.close.draw();
  }
}

// ================================================================ 메인 화면
class Menu {
  constructor() {
    this.start = new Button(VW / 2, 690, 420, 100, "게임 시작", [255, 150, 70], 48);
    this.helpBtn = new Button(VW / 2, 806, 320, 78, "게임 설명", [120, 200, 100], 36);
    this.plank = null;
    this.soundBtn = new Button(110, 54, 180, 60, "", [110, 140, 220], 26);
    this.help = new Help();
    this.t = 0;
    this.pose = Pose.crouch(0.3, 0);
  }
  enter() { for (const b of [this.start, this.helpBtn, this.soundBtn]) b.reset(); Ranking.refresh(); }
  key(code) {
    if (this.help.open) { this.help.key(code); return; }
    if (code === "KeyH") this.help.show();
    else if (code === "Enter") goGame();
  }
  pointer(kind, who, p) {
    if (this.help.open) { this.help.pointer(kind, who, p); if (!this.help.open) this.enter(); return; }
    if (this.start.pointer(kind, who, p)) { Sound.click(); goGame(); }
    else if (this.helpBtn.pointer(kind, who, p)) { Sound.click(); this.help.show(); }
    else if (this.soundBtn.pointer(kind, who, p)) Sound.toggleMute();
  }
  update(dt) {
    this.t += dt;
    const ang = AIM_MAX * Math.sin(2 * Math.PI * this.t / AIM_PERIOD);
    this.pose = blendPose(this.pose, Pose.crouch(0.3, ang * 0.5), 1 - Math.exp(-dt * 16));
  }
  drawBoard() {
    const x = 70, y = 880, w = VW - 140, h = 262;
    ctx.fillStyle = "rgba(25,16,38,0.78)"; rr(x, y, w, h, 24); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,210,150,0.6)"; ctx.stroke();
    text("랭킹 TOP 5 · 빠른 건물주", VW / 2, y + 36, { size: 32, color: "#ffd447", ow: 5 });
    const top = Ranking.list.slice(0, 5);
    if (!Ranking.loaded && !Ranking.error) text("불러오는 중…", VW / 2, y + 160, { size: 28, ow: 5 });
    else if (Ranking.error && !top.length) text(Ranking.error, VW / 2, y + 160, { size: 28, ow: 5 });
    else if (!top.length) { text("아직 건물주가 없어요", VW / 2, y + 140, { size: 30, ow: 5 }); text("첫 건물주가 되어 보세요!", VW / 2, y + 185, { size: 24, color: "#cfc6d8", ow: 4 }); }
    const medal = ["#ffd447", "#dfe6ef", "#e7a46a"];
    top.forEach((d, i) => {
      const yy = y + 82 + i * 40, col = medal[i] || "#fff";
      text(String(i + 1), x + 40, yy, { size: 30, color: col, ow: 5 });
      text(String(d.name || "익명").slice(0, 8), x + 76, yy, { size: 30, align: "left", ow: 5 });
      text(fmtTime(d.time_ms), x + w - 30, yy, { font: `28px ${FONT_TITLE}`, align: "right", color: col, ow: 5 });
    });
    text(Ranking.mode === "online" ? "모두와 함께 쓰는 랭킹" : "이 기기에만 저장되는 랭킹", VW / 2, y + h - 22, { size: 20, color: "#cfc6d8", ow: 4 });
  }
  draw(dt) {
    drawBackground(0, this.t);
    drawGround(0);
    drawSpikes(0);
    // 제목
    const bob = Math.sin(this.t * 1.6) * 4;
    text("CONCRETE", VW / 2, 170 + bob, { font: `84px ${FONT_TITLE}`, color: "#ffd8a8", ow: 12 });
    text("JUNGLE", VW / 2, 262 + bob, { font: `92px ${FONT_TITLE}`, color: "#ffb36b", ow: 12 });
    text("OF PATIENCE", VW / 2, 346 + bob, { font: `56px ${FONT_TITLE}`, color: "#ffe9cf", ow: 10 });
    text("흙수저에서 건물주까지, 점프 하나로", VW / 2, 418, { size: 34, ow: 6 });
    // 흙바닥 위 막대 인간 + 메트로놈 화살표
    if (!this.plank) this.plank = makePlatformArt({ floor: 3, w: 12, type: "normal", goal: false, seed: 11 });
    const fx = VW / 2, fy = 560;
    ctx.drawImage(this.plank, fx - 6 * U - 14, fy - 14);
    const a = AIM_MAX * Math.sin(2 * Math.PI * this.t / AIM_PERIOD) * Math.PI / 180;
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(fx + Math.sin(a) * 40, fy - 4.5 * U - Math.cos(a) * 40); ctx.lineTo(fx + Math.sin(a) * 100, fy - 4.5 * U - Math.cos(a) * 100); ctx.stroke(); ctx.restore();
    drawStickman(this.pose, fx, fy);
    this.start.draw(); this.helpBtn.draw();
    this.drawBoard();
    this.soundBtn.label = Sound.muted ? "소리 꺼짐" : "소리 켜짐";
    this.soundBtn.color = Sound.muted ? [150, 150, 165] : [110, 140, 220];
    this.soundBtn.draw();
    if (this.help.open) this.help.draw(dt);
  }
}

// ================================================================ 화면 전환 · 반복
let menu = null, game = null;
function goGame() { Sound.unlock(); if (!game) game = new Game(); else game.reset(); screen = game; }
function goMenu() { hideNameInput(); screen = menu; menu.enter(); }
let last = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, 1 / 30);
  last = now;
  if (screen) { screen.update(dt); screen.draw(dt); }
  requestAnimationFrame(frame);
}
async function boot() {
  fit();
  ctx.fillStyle = "#2a1b3d"; ctx.fillRect(0, 0, VW, VH);
  try {
    await Promise.race([Promise.all([document.fonts.load(`40px "Bungee"`), document.fonts.load(`30px "Jua"`), document.fonts.load(`400 20px "Noto Sans KR"`)]),
      new Promise((ok) => setTimeout(ok, 2500))]);
  } catch (e) {}
  prepareBackground();
  menu = new Menu();
  screen = menu; menu.enter();
  document.addEventListener("visibilitychange", () => { if (document.hidden && screen === game) game.pause(); });
  requestAnimationFrame((t) => { last = t; frame(t); });
}
boot();
