// The Growth Coach (2026-10-11): a birthday instead of an age, so the stage
// moves on by itself (Primary until January of the year he turns 12, then
// Youth); no interests picked for him; and the ones he types in and his
// superpower show up as ideas, with the turning-12 ideas in the year he turns 12.
import { check, device, state, txt, wait } from './lib.mjs';

export default async function growth({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const dev = await device('growth', { url, day: '2026-10-12T16:30:00' });
  const p = dev.page;
  const sheet = () => txt(p, '#appBody');
  await p.click('#setBtn'); await wait(300);
  await p.click('#appSheet [data-set-go="profile"]'); await wait(400);
  check(!(await p.locator('#appSheet [data-coach-age]').count()) && await p.locator('#coachBornM').count() === 1, 'step 1 asks for a birthday (month and year), not an age');
  await p.fill('#coachName', 'Sam');
  await p.selectOption('#coachBornM', '4'); await wait(300);
  await p.selectOption('#coachBornY', '2015'); await wait(400);
  const s1 = await sheet();
  check(/Age 11 · Primary until January 2027, then Youth/.test(s1), 'born April 2015, in October 2026: ' + (/Age[^|]*/.exec(s1) || [''])[0]);
  check(await p.locator('#appSheet .coach-chip.on[data-coach-who="child"]').count() === 1, 'so the profile is for a child (Primary)');
  check(/Turning 12 this year/i.test(s1), 'with the turning-12 note');
  check(await p.inputValue('#coachName') === 'Sam', 'and the name typed before the birthday is kept');

  await p.click('#appSheet [data-coach-goto="2"]'); await wait(300);
  check(/\(0 selected\)/i.test(await sheet()) && !(await p.locator('#appSheet [data-coach-toggle-int].on').count()), 'no interests are picked for him');
  await p.click('#appSheet [data-coach-toggle-int="Basketball"]'); await wait(200);
  await p.selectOption('#coachCustomArea', 'intellectual');
  await p.fill('#coachCustomInt', 'Fishing'); await p.click('#appSheet [data-coach-add-custom]'); await wait(200);
  check(await p.locator('#appSheet [data-coach-rm-custom="Fishing"]').count() === 1, 'custom interest appears as a removable chip with its area tag');
  await p.click('#appSheet [data-coach-goto="3"]'); await wait(300);
  check(await p.locator('#appSheet [data-coach-val].on').count() === 3, 'Core Values Triad defaults to 3 pillars (Faith, Adventure, Integrity)');
  await p.click('#appSheet [data-coach-subval="Honest Stewardship"]'); await wait(200);
  await p.click('#appSheet [data-coach-sp="Loyal Friend"]'); await wait(200);
  await p.click('#appSheet [data-coach-finish]'); await wait(600);
  const prof = (await state(p)).profile || {};
  check(prof.born === '2015-04' && prof.who === 'child' && JSON.stringify(prof.interests) === '["Basketball","Fishing"]' && prof.superpower === 'Loyal Friend'
    && Array.isArray(prof.coreValues) && prof.coreValues.length === 3 && (prof.subValues || []).includes('Honest Stewardship'),
    `saved: born ${prof.born}, ${prof.who}, ${JSON.stringify(prof.interests)}, ${prof.superpower}, values ${JSON.stringify(prof.coreValues)}`);

  // The Social Feed tab in Family Study renders cards (including Hebrew/Greek word cards without undefined) and allows liking.
  await p.click('#tabs [data-tab="study"]'); await wait(400);
  await p.click('#home [data-study-kind="feed"]'); await wait(400);
  check(await p.locator('#home .social-feed .sf-card').count() >= 3, 'Social Feed renders vertical study cards');
  const wordCardTxt = await txt(p, '#home .social-feed .sf-card.sf-word');
  check(wordCardTxt.length > 10 && !wordCardTxt.includes('undefined'), 'Social Feed Hebrew/Greek word card renders word and meaning without undefined');
  await p.click('#home .social-feed [data-feed-like] >> nth=0'); await wait(200);
  check(Object.keys((await state(p)).feedLikes || {}).length === 1, 'loving a Social Feed card saves to feedLikes');

  // The Season's ideas, area by area.
  const ideas = async area => {
    await p.click('#tabs [data-tab="season"]'); await wait(500);
    if (await p.locator('[data-season="discover"]').count()) { await p.locator('[data-season="discover"]').first().click(); await wait(400); }
    await p.click(`[data-season-area="${area}"]`); await wait(300);
    const t = await p.$$eval('.sea-ideas .sea-idea b', bs => bs.map(b => b.textContent));
    await p.click('#appClose').catch(() => {}); await wait(300);
    return t;
  };
  const sp = await ideas('spiritual'), so = await ideas('social'), it = await ideas('intellectual');
  check(sp.some(t => /Getting ready for 12/.test(t)) && sp.some(t => /Temple prep/.test(t)), 'the year he turns 12, the spiritual ideas get him ready for 12: ' + sp.join(', '));
  check(!sp.some(t => /For the Strength of Youth|Seminary ready/.test(t)), 'but not the youth ones yet');
  check(it.some(t => /Get better at Fishing/.test(t)), 'one he typed in becomes an idea: ' + it.join(', '));
  check(so.some(t => /My strength: Loyal Friend/.test(t)), 'and his superpower: ' + so.join(', '));

  // January 2027: Youth, by itself.
  await p.evaluate(() => localStorage.setItem('fakeNow', '2027-01-11T16:30:00')); await p.reload(); await wait(1800);
  const sp2 = await ideas('spiritual');
  check(sp2.some(t => /For the Strength of Youth/.test(t)) && !sp2.some(t => /Getting ready for 12/.test(t)), 'in January 2027 he is a youth without anyone changing it: ' + sp2.join(', '));

  // Christ-Centered Leader Model (CCLM) Coach Engine & Step 4 calibration.
  await p.click('#setBtn'); await wait(300);
  await p.click('#appSheet [data-set-go="profile"]'); await wait(350);
  await p.click('#appSheet [data-coach-goto="2"]'); await wait(250);
  await p.click('#appSheet [data-coach-goto="3"]'); await wait(250);
  await p.click('#appSheet [data-coach-val="WISDOM"]'); await wait(200);
  await p.click('#appSheet [data-coach-goto="4"]'); await wait(250);
  check(/Christ-Centered Leader Engine/i.test(await sheet()), 'Step 4 renders BYU Christ-Centered Leader Engine calibration');
  await p.click('#appSheet [data-coach-cclm-drift="harmony"]'); await wait(200);
  await p.click('#appSheet [data-coach-cclm-dom="god"]'); await wait(200);
  await p.click('#appSheet [data-coach-finish]'); await wait(500);
  const profCclm = (await state(p)).profile || {};
  check(profCclm.cclmDrift === 'harmony' && profCclm.cclmDomain === 'god' && (profCclm.coreValues || []).includes('WISDOM'),
    `Step 4 saves CCLM calibration: drift=${profCclm.cclmDrift}, domain=${profCclm.cclmDomain}, values=${JSON.stringify(profCclm.coreValues)}`);

  // Open standalone Christ-Centered Leader Coach from Settings, generate playbook, audit domains, and seed Morning Council.
  await p.click('#setBtn'); await wait(300);
  await p.click('#appSheet [data-set-go="cclm"]'); await wait(350);
  await p.click('#appSheet [data-cclm-who="spouse"]'); await wait(200);
  await p.click('#appSheet [data-cclm-sit="discouraged"]'); await wait(200);
  const pbTxt = await sheet();
  check(/Your 5-Step Christ-Centered Playbook/i.test(pbTxt) && /Express Love/i.test(pbTxt) && /Honor Agency/i.test(pbTxt), 'Live Situational Coach generates 5-step Christ-Centered Playbook');
  await p.click('#appSheet [data-cclm-tab="model"]'); await wait(250);
  await p.fill('#cclmAuditNote', 'Lead with unhurried presence before problem-solving');
  await p.click('#appSheet [data-cclm-drift="fixer"]'); await wait(200);
  check((await p.inputValue('#cclmAuditNote')) === 'Lead with unhurried presence before problem-solving', 'Clicking a drift button in 4-Domain tab preserves unsaved #cclmAuditNote input');
  await p.click('#appSheet [data-cclm-rate="self:5"]'); await wait(200);
  await p.click('#appSheet [data-cclm-save-audit]'); await wait(300);
  const profAudit = (await state(p)).profile || {};
  check(profAudit.cclmRatings && profAudit.cclmRatings.self === 5 && profAudit.cclmDrift === 'fixer' && /unhurried presence/.test(profAudit.cclmNote || ''), '4-Domain Stewardship self-audit saves ratings, drift, and reflection note');

  // Verify relationship-specific playbook scripts (team vs self) and Morning Council round-trip preservation + seeded move pill.
  await p.click('#appSheet [data-cclm-tab="situation"]'); await wait(250);
  await p.click('#appSheet [data-cclm-who="team"]'); await wait(200);
  const teamPbTxt = await sheet();
  await p.click('#appSheet [data-cclm-who="self"]'); await wait(200);
  const selfPbTxt = await sheet();
  check(teamPbTxt !== selfPbTxt && /weary today|one faithful step/i.test(selfPbTxt), 'Situational Coach adapts scripts to selected relationship (team vs self)');
  await p.click('#appSheet [data-cclm-seed-bp]'); await wait(350);
  const bpUpliftVal = await p.inputValue('#bpUplift');
  check(bpUpliftVal.length > 10 && await p.locator('#appSheet [data-bp-cclm-move]').count() === 3, 'Seeding from Leader Coach opens Morning Council with populated Christ-Centered Uplift move');
  check(await p.locator('#appSheet [data-bp-cclm-move="agency"].on').count() === 1, 'Seeding from fixer drift activates the matching antidote pill (agency) in Morning Council');

  // Clicking Morning Council CCLM Principle pills updates active state and hint without throwing TypeError.
  await p.click('#appSheet [data-bp-cclm-move="accountability"]'); await wait(150);
  check(await p.locator('#appSheet [data-bp-cclm-move="accountability"].on').count() === 1 && /Invite Accountability/i.test(await txt(p, '#bpCclmHint')), 'Clicking Morning Council CCLM pill switches active principle and updates #bpCclmHint');
  await p.fill('#bpOneThing', 'Finish high-leverage architecture review');
  await p.click('#appSheet [data-open-cclm-coach]'); await wait(300);
  await p.click('#appSheet [data-cclm-seed-bp]'); await wait(350);
  check((await p.inputValue('#bpOneThing')) === 'Finish high-leverage architecture review', 'Round-trip from Morning Council to Situation Coach and back preserves unsaved #bpOneThing');
  await p.click('#appSheet [data-bp-save]'); await wait(350);

  // Evening Return & Report Jeremiah Check (#evSurrender) marks Evening done and supports clearing.
  const triggerEvening = () => p.evaluate(() => {
    const el = document.createElement('button');
    el.setAttribute('data-open-evening', '1');
    document.getElementById('home').appendChild(el);
    el.click();
    el.remove();
  });
  await triggerEvening(); await wait(300);
  await p.fill('#evMercies', '');
  await p.fill('#evWins', '');
  await p.fill('#evSurrender', 'Placing the project timeline into the Lord’s hands');
  await p.click('#appSheet [data-ev-save]'); await wait(350);
  const evAfterSave = Object.values((await state(p)).impressions || {}).find(x => x && x.kind === 'evening' && x.day === '2027-01-11') || {};
  check(/project timeline/.test(evAfterSave.surrender || ''), 'Evening Return & Report saves #evSurrender (Jeremiah Check)');
  await triggerEvening(); await wait(300);
  await p.fill('#evSurrender', '');
  await p.click('#appSheet [data-ev-save]'); await wait(350);
  const evAfterClear = Object.values((await state(p)).impressions || {}).find(x => x && x.kind === 'evening' && x.day === '2027-01-11') || {};
  check((evAfterClear.surrender || '') === '', 'Clearing #evSurrender in Evening Return & Report persists empty string');

  // Verify standalone 6-stage Self-Discovery & Christ-Centered Leader Coach page (coaching_discovery_exercise_mockup.html).
  const cp = await dev.ctx.newPage();
  const cpErrs = [];
  cp.on('pageerror', e => cpErrs.push(e.message));
  await cp.goto(`http://127.0.0.1:${port}/coaching_discovery_exercise_mockup.html`, { waitUntil: 'domcontentloaded' });
  await wait(250);
  check(await cp.locator('.ce-step-tab').count() === 6, 'Standalone Coaching Discovery Exercise renders all 6 stages');
  check((await cp.inputValue('#mirrorPeak')) === '' && (await cp.inputValue('#mirrorPinch')) === '', 'Standalone Coaching Crucible mirrors start 100% blank-slate');
  await cp.click('[data-stage="2"]'); await wait(150);
  await cp.click('#stage2Grid .vcard >> nth=3'); await wait(150); // crown HESED / LOVE
  await cp.click('[data-stage="4"]'); await wait(150);
  await cp.click('.drift-card >> nth=1'); await wait(150);
  await cp.click('[data-stage="5"]'); await wait(150);
  await cp.click('#sitWhoRow .sel-chip >> nth=2'); await wait(150); // Team
  const cpTeamPlaybook = await cp.textContent('#playbookOutput');
  await cp.click('#sitWhoRow .sel-chip >> nth=4'); await wait(150); // Myself
  const cpSelfPlaybook = await cp.textContent('#playbookOutput');
  check(/Generated Christ-Centered Playbook/i.test(cpSelfPlaybook) && cpTeamPlaybook !== cpSelfPlaybook, 'Standalone Situational Coach generates 5-step playbook and adapts to Who selection');
  await cp.click('[data-stage="6"]'); await wait(150);
  await cp.click('#syncBtn'); await wait(200);
  const syncedProf = ((await state(cp)).profile) || {};
  check(syncedProf.cclmDrift === 'harmony' && Array.isArray(syncedProf.coreValues) && syncedProf.coreValues.includes('HESED / LOVE') && (syncedProf.subValues || []).includes('Loyal Covenant Love') && syncedProf.who && !cpErrs.length, 'Standalone Coach syncs canonical HESED / LOVE ID, subValues, and who directly to localStorage with 0 errors');
  await cp.close();

  check(!p.errors.length, 'no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();
}


