// Generates the guide figures (English + Turkish) as theme-aware SVG files.
// Usage: node docs/images/build.js
'use strict';
const fs = require('fs');
const path = require('path');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const STYLE = `<style>
  text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
  .ink{fill:#1f2328}.quiet{fill:#59636e}.edge{stroke:#8c959f}.edgef{fill:#8c959f}.grid{stroke:#d1d9e0}
  .acc{stroke:#0969da}.accf{fill:#0969da}.tint{fill:#eff2f5}.sel{fill:#0969da;fill-opacity:.12}
  @media (prefers-color-scheme: dark){
    .ink{fill:#f0f6fc}.quiet{fill:#9198a1}.edge{stroke:#656c76}.edgef{fill:#656c76}.grid{stroke:#3d444d}
    .acc{stroke:#4493f8}.accf{fill:#4493f8}.tint{fill:#151b23}.sel{fill:#4493f8;fill-opacity:.18}
  }
</style>`;

const svg = (h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 ${h}" width="760" role="img" aria-label="${esc(title)}" font-size="13">
${STYLE}
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="edgef"/></marker></defs>
<text x="24" y="34" font-size="15" font-weight="600" class="ink">${esc(title)}</text>
${body}
</svg>
`;

// text helper: t(x, y, words, {size, weight, cls, anchor})
const t = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.size ? ` font-size="${o.size}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''} class="${o.cls || 'ink'}">${esc(s)}</text>`;
const q = (x, y, s, o = {}) => t(x, y, s, { size: 11.5, cls: 'quiet', ...o });
const box = (x, y, w, h, cls = 'edge', extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" class="${cls}" stroke-width="${cls === 'acc' ? 2 : 1.25}"${extra}/>`;
const line = (d, extra = '') => `<path d="${d}" fill="none" class="edge" stroke-width="1.25"${extra}/>`;
const arrow = (d, both) => line(d, ` marker-end="url(#arrow)"${both ? ' marker-start="url(#arrow)"' : ''}`);

// ---------- figure 1: the side panel ----------
function panel(L) {
  const ic = {
    spin: '<circle cx="100" cy="140" r="5" fill="none" class="acc" stroke-width="1.5" stroke-dasharray="20 12"/>',
    term: '<rect x="94" y="163" width="12" height="10" rx="2" fill="none" class="edge" stroke-width="1.25"/><path d="M97 166l2 2l-2 2" fill="none" class="edge" stroke-width="1.25"/>',
    idle: '<circle cx="100" cy="196" r="5" fill="none" class="edge" stroke-width="1.25"/>',
    pass: '<circle cx="100" cy="256" r="5" fill="none" class="edge" stroke-width="1.25"/><path d="M97.5 256l2 2l3.5 -3.5" fill="none" class="edge" stroke-width="1.25"/>',
    hist: '<circle cx="100" cy="284" r="5" fill="none" class="edge" stroke-width="1.25"/><path d="M100 281v3h3" fill="none" class="edge" stroke-width="1.25"/>',
  };
  return svg(348, L.title, [
    box(24, 56, 432, 248),
    '<path d="M32 56H64V304H32a8 8 0 0 1 -8 -8V64a8 8 0 0 1 8 -8z" class="tint"/>',
    '<line x1="64" y1="92" x2="456" y2="92" class="grid"/>',
    '<rect x="34" y="70" width="20" height="20" rx="4" fill="none" class="edge"/>',
    '<rect x="34" y="106" width="20" height="20" rx="4" fill="none" class="edge"/>',
    '<rect x="24" y="140" width="3" height="24" class="accf"/>',
    '<rect x="34" y="142" width="20" height="20" rx="4" class="sel"/><rect x="34" y="142" width="20" height="20" rx="4" fill="none" class="acc" stroke-width="2"/>',
    '<path d="M38 147h9v6h-5l-3 3v-3h-1z" fill="none" class="acc" stroke-width="1.25"/>',
    t(76, 78, 'CLAUDE THREADS', { size: 11, weight: 600, cls: 'quiet' }),
    t(352, 80, '+', { size: 16, anchor: 'middle' }), t(378, 80, '≡', { size: 16, anchor: 'middle' }),
    t(404, 80, '↻', { size: 14, anchor: 'middle' }),
    '<path d="M422 68h5l2 2h7v9h-14z" fill="none" class="edge" stroke-width="1.25"/>',
    '<path d="M76 109l4 4l4 -4" fill="none" class="edge" stroke-width="1.25"/>', t(90, 116, L.grpOpen, { size: 12, weight: 600 }),
    '<rect x="65" y="126" width="390" height="28" class="sel"/>',
    ic.spin, t(112, 144, L.r1, { size: 12 }), q(414, 144, L.r1d, { size: 11, anchor: 'end' }),
    '<path d="M424 140l4 4l8 -8" fill="none" class="edge" stroke-width="1.5"/>',
    ic.term, t(112, 172, L.r2, { size: 12 }), q(444, 172, L.r2d, { size: 11, anchor: 'end' }),
    ic.idle, t(112, 200, L.r3, { size: 12 }), q(444, 200, L.r3d, { size: 11, anchor: 'end' }),
    '<path d="M76 225l4 4l4 -4" fill="none" class="edge" stroke-width="1.25"/>', t(90, 232, L.grpDone, { size: 12, weight: 600 }),
    ic.pass, t(112, 260, L.b1, { size: 12 }), q(414, 260, L.b1d, { size: 11, anchor: 'end' }), t(430, 261, '↻', { size: 14, anchor: 'middle' }),
    ic.hist, q(112, 288, L.b2, { size: 12 }),
    '<g fill="none" class="edge" stroke-width="1"><path d="M456 76H474"/><path d="M462 128H468V210H462"/><path d="M468 168H474"/><path d="M462 244H468V298H462"/><path d="M468 270H474"/></g>',
    t(480, 72, L.c1, { weight: 600 }), q(480, 90, L.c1a),
    t(480, 136, L.c2, { weight: 600 }), q(480, 154, L.c2a), q(480, 170, L.c2b), q(480, 186, L.c2c), q(480, 202, L.c2d),
    t(480, 252, L.c3, { weight: 600 }), q(480, 270, L.c3a), q(480, 286, L.c3b), q(480, 302, L.c3c),
    q(24, 330, L.note),
  ].join('\n'));
}

// ---------- figure 2: lifecycle ----------
function lifecycle(L) {
  return svg(324, L.title, [
    '<rect x="188" y="64" width="352" height="208" rx="8" class="sel"/>', box(188, 64, 352, 208, 'acc'),
    t(204, 88, L.open, { weight: 600 }),
    arrow('M156 176H188'), arrow('M340 160L396 134', true), arrow('M340 192L396 218', true),
    arrow('M540 176H600'), arrow('M668 212V300H364V272'),
    box(24, 140, 132, 72), t(90, 164, L.newName, { anchor: 'middle', weight: 600 }), q(90, 180, L.newA, { anchor: 'middle' }), q(90, 196, L.newB, { anchor: 'middle' }),
    box(204, 140, 136, 72), t(272, 164, L.sOpen, { anchor: 'middle', weight: 600 }), q(272, 180, L.sOpenA, { anchor: 'middle' }), q(272, 196, L.sOpenB, { anchor: 'middle' }),
    box(396, 96, 128, 72), t(460, 120, L.sWork, { anchor: 'middle', weight: 600 }), q(460, 136, L.sWorkA, { anchor: 'middle' }), q(460, 152, L.sWorkB, { anchor: 'middle' }),
    box(396, 184, 128, 72), t(460, 208, L.sIdle, { anchor: 'middle', weight: 600 }), q(460, 224, L.sIdleA, { anchor: 'middle' }), q(460, 240, L.sIdleB, { anchor: 'middle' }),
    box(600, 140, 136, 72), t(668, 164, L.done, { anchor: 'middle', weight: 600 }), q(668, 180, L.doneA, { anchor: 'middle' }), q(668, 196, L.doneB, { anchor: 'middle' }),
    q(570, 166, L.close, { anchor: 'middle' }), q(516, 292, L.reopen, { anchor: 'middle' }),
  ].join('\n'));
}

// ---------- figure 3: quick switch ----------
function quickpick(L) {
  const term = (y) => `<rect x="42" y="${y - 5}" width="12" height="10" rx="2" fill="none" class="edge" stroke-width="1.25"/><path d="M45 ${y - 2}l2 2l-2 2" fill="none" class="edge" stroke-width="1.25"/>`;
  return svg(340, L.title, [
    box(24, 56, 480, 250),
    t(264, 76, L.qpTitle, { size: 11.5, weight: 600, cls: 'quiet', anchor: 'middle' }),
    '<rect x="36" y="88" width="456" height="28" rx="4" fill="none" class="acc" stroke-width="1.5"/>',
    q(48, 106, L.placeholder, { size: 12 }),
    '<rect x="25" y="123" width="478" height="26" class="sel"/>',
    t(48, 141, '+', { size: 15, anchor: 'middle' }), t(64, 140, L.newThread, { size: 12 }),
    '<line x1="36" y1="160" x2="440" y2="160" class="grid"/>', q(492, 164, L.sepOpen, { size: 11, anchor: 'end' }),
    term(186), t(64, 190, L.r1, { size: 12 }), q(236, 190, L.r1d, { size: 11 }),
    term(212), t(64, 216, L.r2, { size: 12 }),
    term(238), t(64, 242, L.r3, { size: 12 }),
    '<line x1="36" y1="262" x2="290" y2="262" class="grid"/>', q(492, 266, L.sepDone, { size: 11, anchor: 'end' }),
    '<circle cx="48" cy="288" r="5" fill="none" class="edge" stroke-width="1.25"/><path d="M45.5 288l2 2l3.5 -3.5" fill="none" class="edge" stroke-width="1.25"/>',
    t(64, 292, L.b1, { size: 12 }), q(L.b1x, 292, L.b1d, { size: 11 }),
    '<g fill="none" class="edge" stroke-width="1"><path d="M504 102H522"/><path d="M504 140H522"/><path d="M510 174H516V250H510"/><path d="M516 212H522"/><path d="M504 288H522"/></g>',
    t(528, 98, L.cInput, { weight: 600 }), q(528, 114, L.cInputA),
    t(528, 144, L.cNew, { weight: 600 }), q(528, 160, L.cNewA),
    t(528, 204, L.cOpen, { weight: 600 }), q(528, 220, L.cOpenA), q(528, 236, L.cOpenB),
    t(528, 284, L.cDone, { weight: 600 }), q(528, 300, L.cDoneA), q(528, 316, L.cDoneB),
  ].join('\n'));
}

// ---------- figure 4: where files go ----------
function files(L) {
  return svg(324, L.title, [
    '<rect x="24" y="152" width="232" height="88" rx="8" class="tint"/>', box(24, 152, 232, 88),
    t(40, 176, L.src, { weight: 600 }), q(40, 192, L.srcA), q(40, 208, L.srcB), q(40, 224, L.srcC),
    box(352, 64, 384, 236), t(368, 88, '.claude-threads', { weight: 600 }), q(490, 88, L.boxSub),
    box(368, 104, 352, 56), t(384, 128, L.state, { weight: 600 }), q(384, 144, L.stateA),
    '<rect x="368" y="192" width="160" height="72" rx="8" class="sel"/>', box(368, 192, 160, 72, 'acc'),
    t(384, 216, L.fOpen, { weight: 600 }), q(384, 232, L.fOpenA), q(384, 248, L.fOpenB),
    box(560, 192, 160, 72), t(576, 216, L.fDone, { weight: 600 }), q(576, 232, L.fDoneA), q(576, 248, L.fDoneB),
    arrow('M256 228H368'), arrow('M528 216H560'), arrow('M560 244H528'),
    q(304, 218, L.lbl1, { anchor: 'middle' }), q(304, 246, L.lbl2, { anchor: 'middle' }),
    q(544, 286, L.move, { anchor: 'middle' }),
  ].join('\n'));
}

const LABELS = {
  en: {
    panel: {
      title: 'Open threads on top, finished ones below', grpOpen: 'Open (3)', grpDone: 'Done',
      r1: 'Refactor auth module', r1d: 'working · just now', r2: 'Write API docs', r2d: 'open · 2 h ago',
      r3: 'Fix flaky tests', r3d: 'idle · 50 min ago', b1: 'Migrate to Postgres', b1d: '3 h ago', b2: 'An older session',
      c1: 'Top buttons', c1a: '+ new · ≡ switch · ↻ refresh · folder',
      c2: 'Open threads', c2a: 'spinning ring: Claude is writing', c2b: 'terminal: waiting for you',
      c2c: 'empty circle: terminal closed', c2d: '✓ appears on hover, closes it',
      c3: 'Done threads', c3a: 'check circle: a closed thread', c3b: 'clock: session from before the extension',
      c3c: '↻ appears on hover, reopens it',
      note: 'The highlighted bubble icon in the activity bar opens this panel.',
    },
    life: {
      title: 'A thread moves between Open and Done', open: 'Open', newName: 'New thread', newA: 'Ctrl+Shift+Alt+N',
      newB: 'name it, it starts', sOpen: 'open', sOpenA: 'terminal open,', sOpenB: 'waiting for you',
      sWork: 'working', sWorkA: 'Claude is', sWorkB: 'writing', sIdle: 'idle', sIdleA: 'tab closed;',
      sIdleB: 'click to resume', done: 'Done', doneA: 'transcript moves', doneB: 'to the done folder',
      close: '✓ close', reopen: '↻ reopen',
    },
    quick: {
      title: 'Ctrl+Shift+Alt+T reaches every thread from one box', qpTitle: 'Claude threads',
      placeholder: 'Pick a thread…', newThread: 'New thread', sepOpen: 'Open',
      r1: 'Refactor auth module', r1d: 'working', r2: 'Write API docs', r3: 'Fix flaky tests',
      sepDone: 'Done (selecting reopens it)', b1: 'Migrate to Postgres', b1x: 196, b1d: '3 h ago',
      cInput: 'Type to filter', cInputA: 'matches names and descriptions', cNew: 'On top: new thread',
      cNewA: 'asks a name, opens a new tab', cOpen: 'Open threads', cOpenA: 'brought forward if running,',
      cOpenB: 'otherwise resumed', cDone: 'Done threads', cDoneA: 'the last 30; picking one',
      cDoneB: 'reopens it',
    },
    files: {
      title: "The chat stays in Claude's own file; the extension writes a readable copy",
      src: 'Claude Code session file', srcA: '~/.claude/projects/', srcB: '<project>/<session-id>.jsonl',
      srcC: 'only read, never changed', boxSub: 'inside the project folder', state: 'threads.json',
      stateA: 'which threads are open or done, their names', fOpen: 'open/', fOpenA: 'open threads',
      fOpenB: '.md transcripts', fDone: 'done/', fDoneA: 'closed threads', fDoneB: '.md transcripts',
      lbl1: 'after a reply', lbl2: '~4 s later', move: '✓ close moves it to done/ · ↻ reopen brings it back',
    },
  },
  tr: {
    panel: {
      title: "Açık thread'ler üstte, bitenler altta durur", grpOpen: 'Açık (3)', grpDone: 'Biten',
      r1: 'Giriş modülünü düzenle', r1d: 'çalışıyor · az önce', r2: 'API belgelerini yaz', r2d: 'açık · 2 sa önce',
      r3: 'Kararsız testleri düzelt', r3d: 'beklemede · 50 dk önce', b1: "Postgres'e geçiş", b1d: '3 sa önce',
      b2: 'Eklentiden önceki bir oturum',
      c1: 'Üst düğmeler', c1a: '+ yeni · ≡ geçiş · ↻ yenile · klasör',
      c2: "Açık thread'ler", c2a: 'dönen halka: Claude yazıyor', c2b: 'terminal: seni bekliyor',
      c2c: 'boş daire: terminali kapalı', c2d: '✓ üzerine gelince çıkar, kapatır',
      c3: "Biten thread'ler", c3a: 'tik dairesi: kapatılmış thread', c3b: 'saat: eklentiden önceki oturum',
      c3c: '↻ üzerine gelince çıkar, yeniden açar',
      note: 'Sol çubuktaki vurgulu baloncuk simgesi bu paneli açar.',
    },
    life: {
      title: 'Bir thread Açık ile Biten arasında gidip gelir', open: 'Açık', newName: 'Yeni thread',
      newA: 'Ctrl+Shift+Alt+N', newB: 'ad verip başlatır', sOpen: 'açık', sOpenA: 'terminal açık,',
      sOpenB: 'seni bekliyor', sWork: 'çalışıyor', sWorkA: 'Claude cevap', sWorkB: 'yazıyor', sIdle: 'beklemede',
      sIdleA: 'sekme kapalı,', sIdleB: 'tıklayınca sürer', done: 'Biten', doneA: 'dökümü biten',
      doneB: 'klasörüne geçer', close: '✓ kapat', reopen: '↻ yeniden aç',
    },
    quick: {
      title: "Ctrl+Shift+Alt+T ile her thread'e tek pencereden ulaşırsın", qpTitle: "Claude thread'leri",
      placeholder: 'Thread seç…', newThread: 'Yeni thread', sepOpen: 'Açık',
      r1: 'Giriş modülünü düzenle', r1d: 'çalışıyor', r2: 'API belgelerini yaz', r3: 'Kararsız testleri düzelt',
      sepDone: 'Biten (seçince yeniden açılır)', b1: "Postgres'e geçiş", b1x: 180, b1d: '3 sa önce',
      cInput: 'Yazarak ara', cInputA: 'ada ve açıklamaya göre süzer', cNew: 'En üstte: yeni thread',
      cNewA: 'ad sorup yeni sekme açar', cOpen: "Açık thread'ler", cOpenA: 'terminali açıksa öne gelir,',
      cOpenB: 'değilse kaldığı yerden sürer', cDone: "Biten thread'ler", cDoneA: 'son 30 tanesi; seçince',
      cDoneB: 'yeniden açılır',
    },
    files: {
      title: "Konuşma Claude'un dosyasında kalır, eklenti okunabilir kopyasını yazar",
      src: 'Claude Code oturum dosyası', srcA: '~/.claude/projects/', srcB: '<proje>/<oturum-id>.jsonl',
      srcC: 'eklenti buna yalnız bakar', boxSub: 'proje klasörünün içinde', state: 'durum.json',
      stateA: 'hangi thread açık, hangisi bitti, adları', fOpen: 'acik/', fOpenA: "açık thread'lerin",
      fOpenB: '.md dökümleri', fDone: 'biten/', fDoneA: 'kapatılanların', fDoneB: '.md dökümleri',
      lbl1: 'her cevaptan', lbl2: '~4 sn sonra', move: "✓ kapatınca biten/'e taşınır · ↻ yeniden açınca geri gelir",
    },
  },
};

const out = __dirname;
for (const [lang, L] of Object.entries(LABELS)) {
  const yaz = (ad, icerik) => fs.writeFileSync(path.join(out, `${ad}.${lang}.svg`), icerik, 'utf8');
  yaz('panel', panel(L.panel));
  yaz('lifecycle', lifecycle(L.life));
  yaz('quick-switch', quickpick(L.quick));
  yaz('files', files(L.files));
}
console.log('figures written to', out);
