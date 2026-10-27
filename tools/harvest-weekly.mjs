#!/usr/bin/env node
// Weekly Content Harvester & Coverage Audit for TreasureUp
// Audits active/upcoming weeks in content/weeks.js for verse-by-verse scholarly note
// density, CFM_MEDIA video coverage, and (with --online) discovers candidate YouTube
// episodes from the 13 approved channels in tools/verify.mjs for parent preview.
//
// Usage:
//   node tools/harvest-weekly.mjs             # Audit active & next week locally
//   node tools/harvest-weekly.mjs --online    # Also query followHIM & YouTube oEmbed/search

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLINE = process.argv.includes('--online');
const WEEK_ARG = (process.argv.find(a => a.startsWith('--week=')) || '').split('=')[1] || '';

const APPROVED_CHANNELS = [
  'Book of Mormon Central',
  'Scripture Central',
  'The Church of Jesus Christ of Latter-day Saints',
  'Church of Jesus Christ',
  'Gospel for Kids',
  'Strive to Be',
  'Talking Scripture',
  'Messages of Christ',
  'The Bible Project',
  'BibleProject',
  'Follow Him Podcast',
  'Line Upon Line',
  'Come Follow Up',
  'John Hilton III'
];

function loadWeeks() {
  const box = { window: {} };
  const code = fs.readFileSync(path.join(ROOT, 'content', 'weeks.js'), 'utf8');
  vm.runInNewContext(code, box);
  return box.window.TU_WEEKS || [];
}

function loadCfmMediaKeys() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = /const CFM_MEDIA = \{([\s\S]*?)\n  \};/.exec(html);
  if (!m) return new Set();
  const keys = new Set();
  for (const k of m[1].matchAll(/'([^']+:[^']+)':/g)) keys.add(k[1]);
  return keys;
}

function parseChaptersFromRef(ref) {
  const out = [];
  let book = '';
  for (const part of String(ref || '').split(';').map(s => s.trim()).filter(Boolean)) {
    const m = /^((?:[1-4]\s+)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?:[–-](\d+))?$/.exec(part);
    if (m) {
      book = m[1];
      const from = Number(m[2]), to = Number(m[3] || m[2]);
      for (let c = from; c <= to; c++) out.push(`${book} ${c}`);
    } else if (book && /^(\d+)(?:[–-](\d+))?$/.exec(part)) {
      const r = /^(\d+)(?:[–-](\d+))?$/.exec(part);
      const from = Number(r[1]), to = Number(r[2] || r[1]);
      for (let c = from; c <= to; c++) out.push(`${book} ${c}`);
    }
  }
  return out;
}

function auditWeek(w, mediaKeys) {
  const chapters = new Set([
    ...parseChaptersFromRef(w.reference),
    ...((w.plain || []).map(p => p.ch)),
    ...((w.tldr || []).map(t => t.ch))
  ]);
  const insights = w.insights || [];
  const byChapter = new Map();
  for (const ch of chapters) byChapter.set(ch, { insights: 0, plainNotes: 0, hasPlain: false, hasTldr: false });

  for (const p of w.plain || []) {
    if (!byChapter.has(p.ch)) byChapter.set(p.ch, { insights: 0, plainNotes: 0, hasPlain: false, hasTldr: false });
    const rec = byChapter.get(p.ch);
    rec.hasPlain = Array.isArray(p.verses) && p.verses.length > 0;
    rec.plainNotes += Array.isArray(p.notes) ? p.notes.length : 0;
  }
  for (const t of w.tldr || []) {
    if (!byChapter.has(t.ch)) byChapter.set(t.ch, { insights: 0, plainNotes: 0, hasPlain: false, hasTldr: false });
    byChapter.get(t.ch).hasTldr = Array.isArray(t.lines) && t.lines.length > 0;
  }
  for (const ins of insights) {
    const m = /^(.+? \d+)/.exec(ins.ref || '');
    if (!m) continue;
    const ch = m[1];
    if (!byChapter.has(ch)) byChapter.set(ch, { insights: 0, plainNotes: 0, hasPlain: false, hasTldr: false });
    byChapter.get(ch).insights++;
  }

  const guides = w.guide || [];
  const guideCount = guides.length;
  let mediaMapped = 0;
  for (let i = 0; i < guideCount; i++) {
    const gid = (guides[i] && guides[i].id) || i;
    if (mediaKeys.has(`${w.dates}:${gid}`) || mediaKeys.has(`${w.dates}:${i}`)) mediaMapped++;
  }

  const pendingVideos = insights.filter(x =>
    (x.kind === 'video' && (!x.video || x.video.previewed !== true)) ||
    (x.deep && x.deep.listen && x.deep.listen.previewed !== true)
  );

  return {
    dates: w.dates,
    reference: w.reference,
    title: w.title,
    totalInsights: insights.length,
    treasureCount: (w.treasure || []).length,
    guideCount,
    mediaMapped,
    pendingVideos,
    chapters: [...byChapter.entries()].map(([ch, stats]) => ({
      ch,
      ...stats,
      totalNotes: stats.insights + stats.plainNotes
    }))
  };
}

async function discoverOnlineCandidates(w) {
  const candidates = [];
  const q = encodeURIComponent(`Come Follow Me ${w.reference || w.title} Scripture Central OR followHIM OR John Hilton III`);
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    if (res.ok) {
      const html = await res.text();
      const ids = [...new Set([...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map(m => m[1]))].slice(0, 12);
      for (const id of ids) {
        try {
          const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
          if (!oe.ok) continue;
          const info = await oe.json();
          if (APPROVED_CHANNELS.includes(info.author_name)) {
            candidates.push({ id, title: info.title, channel: info.author_name, url: `https://www.youtube.com/watch?v=${id}` });
          }
        } catch {}
      }
    }
  } catch {}
  return candidates;
}

async function main() {
  const weeks = loadWeeks();
  const mediaKeys = loadCfmMediaKeys();
  const selected = WEEK_ARG
    ? weeks.filter(w =>
        w.dates.toLowerCase().includes(WEEK_ARG.toLowerCase()) ||
        (w.reference || '').toLowerCase().includes(WEEK_ARG.toLowerCase()) ||
        w.title.toLowerCase().includes(WEEK_ARG.toLowerCase())
      )
    : weeks;
  const targetWeeks = selected.length ? selected : weeks;

  console.log('====================================================================');
  console.log('📖 TreasureUp Weekly Content Harvester & Enrichment Audit');
  console.log(`   Approved Channels (${APPROVED_CHANNELS.length}): ${APPROVED_CHANNELS.join(', ')}`);
  console.log('====================================================================\n');

  for (const w of targetWeeks) {
    const rep = auditWeek(w, mediaKeys);
    console.log(`🗓️  ${rep.dates} — ${rep.reference} ("${rep.title}")`);
    console.log(`   • Scholarly Insight Cards : ${rep.totalInsights}`);
    console.log(`   • Hebrew/Greek Words      : ${rep.treasureCount}`);
    console.log(`   • Lesson Guide Video Clips: ${rep.mediaMapped}/${rep.guideCount} mapped in CFM_MEDIA`);
    if (rep.pendingVideos.length) {
      console.log(`   • 🎬 Videos awaiting Blake's "Yes" preview (${rep.pendingVideos.length}):`);
      for (const v of rep.pendingVideos) {
        const vid = v.kind === 'video' ? v.video : v.deep.listen;
        console.log(`     - [${v.id}] ${v.title || v.ref}: https://www.youtube.com/watch?v=${vid.youtube}`);
      }
    }
    const sparse = rep.chapters.filter(c => c.insights < 3);
    if (sparse.length) {
      console.log(`   • 🔍 Chapters needing more verse-by-verse enrichment (<3 insight cards):`);
      for (const c of sparse) {
        console.log(`     - ${c.ch}: ${c.insights} insight cards, ${c.plainNotes} plain notes`);
      }
    } else {
      console.log(`   • ✅ All ${rep.chapters.length} chapters have strong verse-by-verse note density.`);
    }

    if (ONLINE) {
      const found = await discoverOnlineCandidates(w);
      if (found.length) {
        console.log(`   • 🌐 Discovered YouTube episodes from approved channels (ask Blake before adding):`);
        for (const f of found) {
          console.log(`     - [${f.channel}] "${f.title}" → ${f.url}`);
        }
      }
    }
    console.log('');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
