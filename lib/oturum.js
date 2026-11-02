// Claude Code oturum dosyalarını (~/.claude/projects/<proje>/<id>.jsonl) okur.
// Not: .jsonl biçimi Anthropic'in iç biçimidir; her alan eksik olabilir diye savunmacı okunur.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

function projelerKoku() {
  return path.join(os.homedir(), '.claude', 'projects');
}

// "C:\Users\me\Projects\app" -> "C--Users-me-Projects-app", "/home/me/app" -> "-home-me-app"
function kodla(klasor) {
  return klasor.replace(/[^a-zA-Z0-9]/g, '-');
}

// Aynı proje hem "C--..." hem "c--..." olarak kayıtlı olabilir; hepsini döndür.
function projeKlasorleri(calismaKlasoru) {
  const kok = projelerKoku();
  const hedef = kodla(calismaKlasoru).toLowerCase();
  try {
    return fs.readdirSync(kok)
      .filter((d) => d.toLowerCase() === hedef)
      .map((d) => path.join(kok, d));
  } catch {
    return [];
  }
}

function satirlar(metin) {
  const sonuc = [];
  for (const satir of metin.split('\n')) {
    if (!satir.trim()) continue;
    try { sonuc.push(JSON.parse(satir)); } catch { /* yarım satır, atla */ }
  }
  return sonuc;
}

function parcaOku(dosya, baslangic, uzunluk) {
  if (uzunluk <= 0) return '';
  const fd = fs.openSync(dosya, 'r');
  try {
    const tampon = Buffer.alloc(uzunluk);
    const okunan = fs.readSync(fd, tampon, 0, uzunluk, baslangic);
    return tampon.subarray(0, okunan).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function icerikMetni(icerik) {
  if (typeof icerik === 'string') return icerik;
  if (Array.isArray(icerik)) {
    return icerik
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
  }
  return '';
}

// Kullanıcının gerçekten yazdığı mesaj mı? (araç sonuçları, komut etiketleri, sistem notları hariç)
function kullaniciMetni(olay) {
  if (!olay || olay.type !== 'user' || olay.isMeta || olay.isSidechain) return null;
  const m = olay.message;
  if (!m || m.role !== 'user') return null;
  const metin = icerikMetni(m.content).trim();
  if (!metin) return null;
  if (metin.startsWith('<') || metin.startsWith('[Request interrupted')) return null;
  return metin;
}

const onbellek = new Map();

function ozet(dosya) {
  const st = fs.statSync(dosya);
  const k = onbellek.get(dosya);
  if (k && k.mtime === st.mtimeMs && k.size === st.size) return k.ozet;

  const bas = satirlar(parcaOku(dosya, 0, Math.min(st.size, 128 * 1024)));
  let ilkMesaj = null;
  let baslangic = null;
  for (const e of bas) {
    if (!baslangic && e.timestamp) baslangic = e.timestamp;
    const t = kullaniciMetni(e);
    if (t) { ilkMesaj = t; break; }
  }

  // Ad (custom-title) dosyanın sonlarına yazılıyor; son 256 KB'a bak.
  const kuyrukBas = Math.max(0, st.size - 256 * 1024);
  let baslik = null;
  for (const e of satirlar(parcaOku(dosya, kuyrukBas, st.size - kuyrukBas))) {
    if (e.type === 'custom-title' && e.customTitle) baslik = e.customTitle;
  }
  if (!baslik) {
    for (const e of bas) if (e.type === 'custom-title' && e.customTitle) baslik = e.customTitle;
  }

  const o = {
    id: path.basename(dosya, '.jsonl'),
    dosya,
    baslik,
    ilkMesaj,
    baslangic,
    degisti: st.mtimeMs,
    boyut: st.size,
  };
  onbellek.set(dosya, { mtime: st.mtimeMs, size: st.size, ozet: o });
  return o;
}

function oturumlar(calismaKlasoru) {
  const harita = new Map();
  for (const klasor of projeKlasorleri(calismaKlasoru)) {
    let dosyalar = [];
    try { dosyalar = fs.readdirSync(klasor).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of dosyalar) {
      try {
        const o = ozet(path.join(klasor, f));
        const eski = harita.get(o.id);
        if (!eski || eski.degisti < o.degisti) harita.set(o.id, o);
      } catch { /* dosya o an siliniyor olabilir */ }
    }
  }
  return [...harita.values()];
}

function zaman(ts, yerel) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  try { return d.toLocaleString(yerel || undefined); } catch { return d.toLocaleString(); }
}

// Okunabilir Markdown dökümü üretir. t = lib/dil.js cevirmen(), yerel = 'tr', 'en-US'...
function dokum(dosya, bilgi, t, yerel) {
  t = t || require('./dil').cevirmen('en');
  const olaylar = satirlar(fs.readFileSync(dosya, 'utf8'));
  const bloklar = [];
  let blok = null;
  let ilkZaman = null;
  let sonZaman = null;

  for (const e of olaylar) {
    if (e.timestamp) { if (!ilkZaman) ilkZaman = e.timestamp; sonZaman = e.timestamp; }
    if (e.isSidechain) continue;
    if (e.type === 'user') {
      const t = kullaniciMetni(e);
      if (!t) continue; // araç sonucu: Claude'un bloğu devam eder
      blok = { rol: 'sen', zaman: e.timestamp, metin: [t], araclar: [] };
      bloklar.push(blok);
    } else if (e.type === 'assistant' && e.message) {
      if (!blok || blok.rol !== 'claude') {
        blok = { rol: 'claude', zaman: e.timestamp, metin: [], araclar: [] };
        bloklar.push(blok);
      }
      const c = e.message.content;
      if (typeof c === 'string' && c.trim()) blok.metin.push(c);
      else if (Array.isArray(c)) {
        for (const b of c) {
          if (!b) continue;
          if (b.type === 'text' && b.text && b.text.trim()) blok.metin.push(b.text);
          else if (b.type === 'tool_use' && b.name) blok.araclar.push(b.name);
        }
      }
    }
  }

  const durumYazi = bilgi.durum === 'acik' ? `🟢 ${t('tOpen')}` : `✅ ${t('tDone')}`;
  const satir = [
    `# ${bilgi.ad}`,
    '',
    '| | |',
    '|---|---|',
    `| ${t('tStatus')} | ${durumYazi} |`,
    `| ${t('tSession')} | \`${bilgi.id}\` |`,
    `| ${t('tStarted')} | ${zaman(ilkZaman, yerel)} |`,
    `| ${t('tLast')} | ${zaman(sonZaman, yerel)} |`,
  ];
  if (bilgi.kapanis) satir.push(`| ${t('tClosed')} | ${zaman(bilgi.kapanis, yerel)} |`);
  satir.push(`| ${t('tResume')} | \`claude --resume ${bilgi.id}\` |`, '', '---', '');

  for (const b of bloklar) {
    if (!b.metin.length && !b.araclar.length) continue;
    satir.push(`### ${b.rol === 'sen' ? `🧑 ${t('tYou')}` : `🤖 ${t('tClaude')}`} · ${zaman(b.zaman, yerel)}`, '');
    if (b.metin.length) satir.push(b.metin.join('\n\n'), '');
    if (b.araclar.length) {
      const say = new Map();
      for (const a of b.araclar) say.set(a, (say.get(a) || 0) + 1);
      const liste = [...say].map(([a, n]) => (n > 1 ? `${a} ×${n}` : a)).join(', ');
      satir.push(`> ${t('tTools')}: ${liste}`, '');
    }
  }
  return satir.join('\n');
}

module.exports = { projelerKoku, kodla, projeKlasorleri, oturumlar, ozet, dokum, kullaniciMetni };
