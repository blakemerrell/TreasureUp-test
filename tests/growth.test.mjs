// The Growth Coach (2026-10-11): a birthday instead of an age, so the stage
// moves on by itself (Primary until January of the year he turns 12, then
// Youth); no interests picked for him; and the ones he types in and his
// superpower show up as ideas, with the turning-12 ideas in the year he turns 12.
import { check, device, state, txt, wait } from './lib.mjs';

export default async function growth({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const dev = await device('growth', {
    url,
    day: '2026-10-12T16:30:00',
    files: {
      'content/lib/1-nephi-1.js': '(window.TU_LIB = window.TU_LIB || {})["1 Nephi 1"] = ' + JSON.stringify({
        v: ['I, Nephi, having been born of goodly parents, therefore I was taught somewhat in all the learning of my father.']
      }) + ';\n'
    }
  });
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
  await p.click('#appSheet [data-coach-who="youth"]'); await wait(150);
  check(await p.locator('#appSheet .coach-chip.on[data-coach-who="child"]').count() === 1, 'tapping Youth when a child birthday is set keeps stage as child');
  check(await p.locator('#appSheet [data-coach-who="adult"]').count() === 0, 'Adult option is hidden when a child/youth birthday is set');
  check(/Turning 12 this year/i.test(s1), 'with the turning-12 note');
  check(await p.inputValue('#coachName') === 'Sam', 'and the name typed before the birthday is kept');

  await p.click('#appSheet [data-coach-goto="2"]'); await wait(300);
  check(/\(0 selected\)/i.test(await sheet()) && !(await p.locator('#appSheet [data-coach-toggle-int].on').count()), 'no interests are picked for him');
  await p.click('#appSheet [data-coach-toggle-int="Basketball"]'); await wait(200);
  await p.selectOption('#coachCustomArea', 'intellectual');
  await p.fill('#coachCustomInt', 'Fishing'); await p.click('#appSheet [data-coach-add-custom]'); await wait(200);
  check(await p.locator('#appSheet [data-coach-rm-custom="Fishing"]').count() === 1, 'custom interest appears as a removable chip with its area tag');
  await p.click('#appSheet [data-coach-goto="3"]'); await wait(300);
  check(await p.locator('#appSheet [data-coach-val].on').count() === 0, 'Core Values Triad starts 100% blank-slate with 0 pillars selected');
  check(await p.locator('#appSheet #coachPeakMoment').count() === 0 && await p.locator('#appSheet [data-coach-strength]').count() === 0, 'Stage 3 is de-duplicated (no repeated Crucible mirrors or CliftonStrengths)');
  await p.click('#appSheet [data-coach-val="FAITH"]'); await wait(150);
  await p.click('#appSheet [data-coach-val="ADVENTURE"]'); await wait(150);
  await p.click('#appSheet [data-coach-val="INTEGRITY"]'); await wait(150);
  check(await p.locator('#appSheet [data-coach-val].on').count() === 3, 'Core Values Triad allows picking 3 pillars');
  await p.click('#appSheet [data-coach-subval="Honest Stewardship"]'); await wait(200);
  await p.click('#appSheet [data-coach-goto="4"]'); await wait(200);
  await p.click('#appSheet [data-coach-sp="Loyal Friend"]'); await wait(200);
  await p.click('#appSheet [data-coach-finish]'); await wait(600);
  const st1 = await state(p), prof = st1.profile || {}, coach1 = (st1.pro && st1.pro.coach) || {};
  check(prof.born === '2015-04' && prof.who === 'child' && JSON.stringify(prof.interests) === '["Basketball","Fishing"]' && coach1.superpower === 'Loyal Friend' && prof.superpower === undefined
    && Array.isArray(prof.coreValues) && prof.coreValues.length === 3 && (prof.subValues || []).includes('Honest Stewardship'),
    `saved: born ${prof.born}, ${prof.who}, ${JSON.stringify(prof.interests)}, private superpower ${coach1.superpower}, values ${JSON.stringify(prof.coreValues)}`);

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
  const stCclm = await state(p), profCclm = stCclm.profile || {}, coachCclm = (stCclm.pro && stCclm.pro.coach) || {};
  check(coachCclm.cclmDrift === 'harmony' && coachCclm.cclmDomain === 'god' && profCclm.cclmDrift === undefined && (profCclm.coreValues || []).includes('WISDOM'),
    `Step 4 saves CCLM calibration privately in S.pro.coach: drift=${coachCclm.cclmDrift}, domain=${coachCclm.cclmDomain}, values=${JSON.stringify(profCclm.coreValues)}`);

  // Open Christ-Centered Leader Coach from Settings (delegates to unified 6-stage coach), generate playbook in Stage 5, audit domains in Stage 6, and seed Morning Council.
  await p.click('#setBtn'); await wait(300);
  await p.click('#appSheet [data-set-go="cclm"]'); await wait(350);
  check((await p.locator('#appSheet .coach-stage-tab').count()) === 6, 'Settings CCLM Coach opens the unified 6-stage coach');
  await p.click('#appSheet [data-coach-cclm-drift="fixer"]'); await wait(200);
  await p.click('#appSheet [data-coach-goto="5"]'); await wait(250);
  await p.click('#appSheet [data-coach-sit-who="spouse"]'); await wait(200);
  await p.click('#appSheet [data-coach-sit-what="discouraged"]'); await wait(200);
  const pbTxt = await sheet();
  check(/Stage 5: Situational Leadership Playbook/i.test(pbTxt) && /Express Love/i.test(pbTxt) && /Honor Agency/i.test(pbTxt), 'Stage 5 Situational Coach generates 5-step Christ-Centered Playbook');
  await p.click('#appSheet [data-coach-goto="6"]'); await wait(250);
  await p.fill('#coachCclmNote', 'Lead with unhurried presence before problem-solving');
  await p.click('#appSheet [data-coach-cclm-rate="self:5"]'); await wait(200);
  check((await p.inputValue('#coachCclmNote')) === 'Lead with unhurried presence before problem-solving', 'Clicking a rating button in Stage 6 preserves unsaved #coachCclmNote input');
  await p.click('#appSheet [data-coach-finish]'); await wait(300);
  const stAudit = await state(p), profAudit = stAudit.profile || {}, coachAudit = (stAudit.pro && stAudit.pro.coach) || {};
  check(coachAudit.cclmRatings && coachAudit.cclmRatings.self === 5 && coachAudit.cclmDrift === 'fixer' && /unhurried presence/.test(coachAudit.cclmNote || '') && profAudit.cclmNote === undefined && profAudit.cclmRatings === undefined, 'Stage 6 4-Domain Stewardship self-audit saves ratings, drift, and reflection note privately in S.pro.coach');

  // Verify relationship-specific playbook scripts (team vs self) and Morning Council round-trip preservation + seeded move pill.
  await p.click('#setBtn'); await wait(250);
  await p.click('#appSheet [data-set-go="cclm"]'); await wait(250);
  await p.click('#appSheet [data-coach-goto="5"]'); await wait(200);
  await p.click('#appSheet [data-coach-sit-who="team"]'); await wait(200);
  const teamPbTxt = await sheet();
  await p.click('#appSheet [data-coach-sit-who="self"]'); await wait(200);
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
  check(await p.evaluate(() => !document.activeElement || document.activeElement.id !== 'evMercies'), 'Opening Evening Return & Report does not auto-focus #evMercies');
  await p.fill('#evMercies', '');
  await p.click('#appSheet [data-ev-more] summary'); await wait(100);
  await p.fill('#evWins', '');
  await p.fill('#evImprove', 'Listen first before jumping to solutions');
  await p.fill('#evSurrender', 'Placing the project timeline into the Lord’s hands');
  await p.click('#appSheet [data-ev-save]'); await wait(350);
  const evAfterSave = Object.values((await state(p)).impressions || {}).find(x => x && x.kind === 'evening' && x.day === '2027-01-11') || {};
  check(/project timeline/.test(evAfterSave.surrender || ''), 'Evening Return & Report saves #evSurrender (Jeremiah Check)');
  await triggerEvening(); await wait(300);
  check(await p.evaluate(() => Boolean(document.querySelector('#appSheet [data-ev-more]') && document.querySelector('#appSheet [data-ev-more]').open)), 'Reopening Evening Return & Report auto-opens expander when only ev.improve is populated');
  await p.fill('#evImprove', '');
  await p.fill('#evSurrender', '');
  await p.click('#appSheet [data-ev-save]'); await wait(350);
  const evAfterClear = Object.values((await state(p)).impressions || {}).find(x => x && x.kind === 'evening' && x.day === '2027-01-11') || {};
  check((evAfterClear.surrender || '') === '', 'Clearing #evSurrender in Evening Return & Report persists empty string');

  // Slice 5: Youth streamlined Morning Council (no adult jargon by default) & Together Family Bridge card on Today.
  await p.evaluate(() => localStorage.setItem('fakeNow', '2026-10-20T12:00:00')); await p.reload(); await wait(1200);
  await p.click('#tabs [data-tab="today"]'); await wait(400);
  await p.click('#home [data-open-blueprint] >> nth=0'); await wait(300);
  const youthBpHtml = await txt(p, '#appBody');
  check(!/Wilderness 40|makrothumei/i.test(youthBpHtml) && await p.locator('#appBody [data-w40-card]').count() === 0, 'Youth Morning Council hides adult Wilderness 40 and Greek/Hebrew jargon');
  await p.click('#appClose'); await wait(250);
  check(await p.locator('#home .tsec[data-sec="goals"] [data-together-check]').count() === 1, 'Youth Today Action Plan renders Do Together with Mom or Dad card');
  await p.click('#home .tsec[data-sec="goals"] [data-together-check]'); await wait(300);
  const stAfterTogether = await state(p);
  const tgImp = Object.values(stAfterTogether.impressions || {}).find(x => x && !x.gone && x.kind === 'together' && x.day === '2026-10-20');
  check((stAfterTogether.togetherDone || {})['2026-10-20'] === 1 && tgImp && tgImp.share === true, 'Youth Together check marks togetherDone and creates shared family impression');

  // Switch to Adult mode for Slices 1, 2, 3, and 4 verification.
  await p.evaluate(() => {
    const k = Object.keys(localStorage).find(x => /v1$/.test(x) && !x.includes('@'));
    const s = JSON.parse(localStorage.getItem(k));
    s.seasonWho = 'adult';
    if (s.profile) { s.profile.who = 'adult'; s.profile.born = '1985-06'; s.profile.age = 41; }
    localStorage.setItem(k, JSON.stringify(s));
  });
  await p.reload(); await wait(1200);

  // Slice 1: Adult True Zero-XP View (HUD, Today, Go further, Games) + Honor Streak Kept.
  const hudHidden = await p.evaluate(() => ({
    levelHidden: document.getElementById('levelBtn').hidden,
    xpHidden: document.querySelector('.hud-xp').hidden,
    streakVisible: !document.getElementById('streakBtn').hidden,
    pathXpCount: document.querySelectorAll('#home .tday .pth-xp').length,
    moreHasXp: /\b\d+\s*XP\b/i.test((document.querySelector('#home details.more') || {}).textContent || '')
  }));
  check(hudHidden.levelHidden && hudHidden.xpHidden && hudHidden.streakVisible && hudHidden.pathXpCount === 0 && !hudHidden.moreHasXp, 'Adult mode hides HUD Level/XP pills and Go further XP strings while keeping Honor Streak visible');
  await p.click('#tabs [data-tab="games"]'); await wait(300);
  const gamesAudit = await p.evaluate(() => ({
    shopCount: document.querySelectorAll('#home .shop-card').length,
    hasXpText: /\b\d+\s*XP\b/i.test(document.getElementById('home').textContent || '')
  }));
  check(gamesAudit.shopCount === 0 && !gamesAudit.hasXpText, 'Adult mode hides Prize Shop card and XP labels on Games tab');
  await p.click('#tabs [data-tab="today"]'); await wait(300);

  // Adult Family Bridge ("Do Together with Youth") on Today.
  check(await p.locator('#home .tsec[data-sec="goals"] [data-together-check]').count() === 1 && /Do Together with Youth/i.test(await txt(p, '#home .tsec[data-sec="goals"] [data-together-check]')), 'Adult Today Action Plan renders Do Together with Youth Family Bridge card');
  await p.click('#home .tsec[data-sec="goals"] [data-together-check]'); await wait(250);
  check(((await state(p)).togetherDone || {})['2026-10-20'] === 0, 'Un-toggling Together check persists sync-safe 0 in S.togetherDone');

  // Slice 2 & 3: Adult Morning Council Top 3 -> S.pro.tops[day] (private) + Pace-Driven Wilderness 40.
  await p.click('#home [data-open-blueprint] >> nth=0'); await wait(350);
  check(await p.evaluate(() => !document.activeElement || document.activeElement.id !== 'bpOneThing'), 'Opening Morning Council does not auto-focus #bpOneThing');
  check(await p.locator('#appBody [data-w40-card]').count() === 1 && /Day 1/i.test(await txt(p, '#appBody [data-w40-card]')), 'Adult Morning Council renders Wilderness 40 Day 1 card');
  await p.click('#appBody .w40-details summary'); await wait(100);
  await p.click('#appBody [data-w40-step="1"]'); await wait(150);
  check(await p.evaluate(() => Boolean(document.querySelector('#appBody .w40-details') && document.querySelector('#appBody .w40-details').open)) && /Day 2 of 40/i.test(await txt(p, '#appBody [data-w40-card]')), 'Stepping Wilderness 40 day inside Morning Council keeps .w40-details expanded');
  await p.click('#appBody [data-w40-step="-1"]'); await wait(150);
  await p.click('#appBody [data-w40-complete]'); await wait(300);
  check(/Day 2/i.test(await txt(p, '#appBody [data-w40-card]')), 'Wilderness 40 advances to Day 2 on explicit completion');
  await p.fill('#bpOneThing', 'Ship quarterly architecture');
  await p.click('#appBody [data-bp-more-prios] summary'); await wait(100);
  await p.fill('#bpPrio2', 'Review shop floor metrics');
  await p.fill('#bpPrio3', 'Prepare family council');
  await p.fill('#bpUplift', '');
  await p.click('#appBody [data-bp-save]'); await wait(350);
  const stNoUplift = await state(p);
  const noUpliftBpImp = Object.values(stNoUplift.impressions || {}).find(x => x && !x.gone && x.kind === 'blueprint' && x.day === '2026-10-20');
  check(!noUpliftBpImp, 'Adult Morning Council with priorities only (no uplift) does not create an empty blueprint impression');
  await p.click('#home [data-open-blueprint] >> nth=0'); await wait(250);
  check(await p.evaluate(() => Boolean(document.querySelector('#appBody [data-bp-more-prios]') && document.querySelector('#appBody [data-bp-more-prios]').open)), 'Reopening Morning Council auto-opens Priorities #2 & #3 expander when populated');
  await p.fill('#bpUplift', 'Send encouragement note to a teammate');
  await p.click('#appBody [data-bp-save]'); await wait(400);
  const stAdultBp = await state(p);
  const adultTops = ((((stAdultBp.pro || {}).tops) || {})['2026-10-20'] || {}).items || [];
  const adultBpImp = Object.values(stAdultBp.impressions || {}).find(x => x && !x.gone && x.kind === 'blueprint' && x.day === '2026-10-20') || {};
  check(adultTops.length === 3 && adultTops[0].text === 'Ship quarterly architecture' && adultBpImp.oneThing === '' && adultBpImp.uplift === 'Send encouragement note to a teammate' && adultBpImp.share === false, 'Adult Morning Council stores Top 3 privately in S.pro.tops and keeps S.impressions oneThing empty when uplift is saved');
  check(await p.locator('#home .tsec[data-sec="goals"] [data-bp-check="top:0"]').count() === 1 && await p.locator('#home .tsec[data-sec="goals"] [data-bp-check="w40"]').count() === 1, 'Adult Today Action Plan renders interactive Top 3 and Wilderness 40 checkboxes');
  await p.click('#home .tsec[data-sec="goals"] [data-bp-check="top:0"]'); await wait(300);
  check(((((((await state(p)).pro || {}).tops || {})['2026-10-20'] || {}).items || [])[0] || {}).done === true, 'Ticking Priority #1 on Today updates S.pro.tops[day].items[0].done');

  // Verify linking Priority #2 to a Big Rock stores YYYY-MM-DD date string (not boolean true) in S.pro.rocks.
  await p.evaluate(() => {
    const k = Object.keys(localStorage).find(x => /v1$/.test(x) && !x.includes('@'));
    const s = JSON.parse(localStorage.getItem(k));
    s.pro.rocks = { rk1: { text: 'Review shop floor metrics', wk: '2026-10-19', day: '2026-10-20', done: '', upd: Date.now() } };
    s.pro.tops['2026-10-20'].items[1].rock = 'rk1';
    localStorage.setItem(k, JSON.stringify(s));
  });
  await p.reload(); await wait(800);
  await p.click('#home .tsec[data-sec="goals"] [data-bp-check="top:1"]'); await wait(300);
  check((((((await state(p)).pro || {}).rocks || {}).rk1) || {}).done === '2026-10-20', 'Ticking a Big-Rock-linked priority on Today stores YYYY-MM-DD date string on the rock');

  // Evening Return & Report shows Wilderness Day 2 prompt and Top 3 Scorecard (2/3).
  await triggerEvening(); await wait(300);
  const evAdultText = await txt(p, '#appBody');
  check(/Wilderness Day 2/i.test(evAdultText) && /Top Priorities:\s*2\/3/i.test(evAdultText), 'Adult Evening Return & Report merges Wilderness Day prompt and Top 3 Scorecard');
  await p.click('#appClose'); await wait(250);

  // Slice 4: Book of Mormon sequential resume, Scholarly Vault, Deep Study Log, Watched Video filter & Next Unread Talk.
  check(/Next:\s*1 Nephi 1/i.test(await txt(p, '#home [data-bom-open]')), 'Today Book of Mormon row displays sequential Next Unread Chapter');
  await p.click('#home [data-bom-open]'); await wait(300);
  check(await p.locator('#appBody [data-bom-resume="1 Nephi 1"]').count() === 1, 'Book of Mormon sheet displays sequential Next Unread Chapter resume button');
  await p.click('#appBody [data-bom-resume="1 Nephi 1"]'); await wait(500);
  check(await p.locator('#viewBody [data-scholarly-vault]').count() === 1, 'Chapter reader includes collapsible Scholarly Vault with commentary links');
  await p.click('#viewBack'); await wait(250);
  await p.evaluate(() => { const d = document.querySelector('#home details.more'); if (d) d.open = true; });
  await p.click('#home [data-open-deep-log]'); await wait(300);
  await p.fill('#deepStudyTitle', 'followHIM Jeremiah 1:5 study');
  await p.fill('#deepStudyNotes', 'Covenant faithfulness in tough seasons');
  await p.click('#appBody [data-save-deep-log]'); await wait(350);
  const dlImp = Object.values((await state(p)).impressions || {}).find(x => x && !x.gone && x.kind === 'deeplog' && x.day === '2026-10-20');
  check(dlImp && dlImp.title === 'followHIM Jeremiah 1:5 study' && dlImp.ref === '', 'Deep Study Log saves extra study entry with empty ref so titles with colons do not collide with verse notes');

  await p.click('#tabs [data-tab="study"]'); await wait(400);
  await p.click('#home [data-study-kind="video"]'); await wait(350);
  const totalVids = await p.locator('#home [data-watch-video]').count();
  if (totalVids > 0) {
    const firstVidId = await p.locator('#home [data-watch-video]').first().getAttribute('data-watch-video');
    await p.locator('#home [data-watch-video]').first().click(); await wait(250);
    await p.click('#home [data-filter-unwatched]'); await wait(250);
    const filteredVids = await p.locator('#home [data-watch-video]').count();
    check(Boolean(((await state(p)).watchedVideos || {})[firstVidId]) && filteredVids === totalVids - 1, 'Video shelf marks video watched and filters to unwatched only');
  }

  await p.click('#home [data-study-kind="sunday"]'); await wait(350);
  if (await p.locator('#home [data-talk]').count() > 1) {
    const firstTalkId = await p.locator('#home [data-talk]').first().getAttribute('data-talk');
    await p.locator('#home [data-talk]').first().click(); await wait(350);
    check(await p.locator('#appBody [data-next-unread-talk]').count() === 1, 'General Conference talk renders Next Unread Talk button');
    await p.locator('#appBody [data-next-unread-talk]').dispatchEvent('click'); await wait(350);
    const nextTalkBtnId = await p.locator('#appBody [data-talkdone]').getAttribute('data-talkdone');
    check(Boolean(nextTalkBtnId && nextTalkBtnId !== firstTalkId), 'Clicking Next Unread Talk advances to the next unread Conference talk');
    await p.click('#appClose'); await wait(250);
  }

  // Verify in-app Today 1-line Compass Bar, 412x780 Pixel 9 Pro above-the-fold layout, Deep Coaching & Tools sheet, & 6-Stage Coaching Workshop
  await p.setViewportSize({ width: 412, height: 780 });
  await p.click('#tabs [data-tab="today"]'); await wait(200);
  await p.evaluate(() => { document.getElementById('home').scrollTop = 0; window.scrollTo(0, 0); });
  await wait(100);
  check((await p.locator('#home [data-today-compass]').count()) === 1, 'Today tab renders compact 1-line Compass Bar');
  const compassBox = await p.locator('#home [data-today-compass]').boundingBox();
  const nextActBox = await p.locator('#home .fl-next').first().boundingBox();
  check(compassBox && compassBox.height <= 60 && nextActBox && nextActBox.y < 760, `On 412x780 Pixel 9 Pro viewport, Compass Bar is compact (${Math.round(compassBox ? compassBox.height : 0)}px) and first daily action is above the fold (y=${Math.round(nextActBox ? nextActBox.y : 999)})`);

  await p.click('#home [data-today-compass] [data-open-deep-tools]'); await wait(200);
  check((await p.locator('#appSheet [data-compass-mode]').count()) === 0 && (await p.locator('#appSheet a[href*="flow.html"], #appSheet a[href*="coaching.html"]').count()) === 0, 'Deep Coaching & Tools drawer has no Adult/Youth mode toggle or standalone mockup links');
  check((await p.locator('#appSheet [data-compass-w40-day]').count()) === 7 && (await p.locator('#appSheet [data-compass-luke]').count()) === 4, 'Deep Coaching & Tools drawer renders all 7 Wilderness 40 Movement start day pills and 4 Luke 2:52 cards');
  await p.click('#appSheet [data-compass-w40-day="27"]'); await wait(150);
  const sheetD27Txt = await p.textContent('#appSheet');
  const compassD27Txt = await p.textContent('#home [data-today-compass]');
  check(/Day 27 of 40/i.test(sheetD27Txt) && /D&C 121:46/i.test(sheetD27Txt) && /Day 27/i.test(compassD27Txt), 'Deep Coaching & Tools quick day jumper switches Wilderness 40 to Day 27');

  // Verify Live Situation Playbook button in Deep Coaching & Tools opens Stage 5 even after Stage 6 was viewed
  await p.click('#appSheet [data-open-cclm-coach="situation"]'); await wait(150);
  await p.click('#appSheet [data-coach-goto="6"]'); await wait(150);
  await p.click('#appClose'); await wait(150);
  await p.click('#home [data-today-compass] [data-open-deep-tools]'); await wait(150);
  await p.click('#appSheet [data-open-cclm-coach="situation"]'); await wait(150);
  check((await p.locator('#appSheet #cclmPlaybookOut').count()) === 1, 'Tapping Live Situation Playbook in Deep Coaching & Tools explicitly opens Stage 5 Playbook even after Stage 6 was active');
  await p.click('#appClose'); await wait(150);
  await p.click('#home [data-today-compass] [data-open-deep-tools]'); await wait(150);

  await p.click('#appSheet [data-compass-coach="1"]'); await wait(200);
  check((await p.locator('#appSheet .coach-stage-tab').count()) === 6, 'In-app Growth Coach sheet renders all 6 stage tabs');
  await p.click('#appSheet [data-coach-goto="2"]'); await wait(150);
  const peakBox = await p.locator('#coachPeakMoment').boundingBox();
  check(peakBox && peakBox.y < 450, `On 412x780 viewport, Stage 2 Crucible Reflection leads above the fold (y=${Math.round(peakBox ? peakBox.y : 999)})`);
  await p.fill('#coachPeakMoment', 'Standing with courage and bold conviction when the team felt afraid');
  await wait(100);
  check(/Courage/i.test(await p.textContent('#coachCruciblePreview')), 'In-app Stage 2 Crucible live input auto-detects matching pillar in real time without losing focus');
  await p.click('#appSheet [data-coach-seed-crucible]'); await wait(150);
  check((await p.inputValue('#coachPeakMoment')).includes('kitchen table') && /Auto-Detected Values/i.test(await p.textContent('#coachCruciblePreview')), 'In-app Stage 2 sample reflection seed populates Crucible mirrors and auto-detected pillars');
  await p.click('#appSheet [data-coach-goto="3"]'); await wait(150);
  check((await p.locator('#appSheet [data-coach-val]').count()) === 16 && (await p.locator('#appSheet [data-coach-funnel]').count()) === 16, 'In-app Stage 3 renders full 16-card Core Values deck and 16->5 winnowing funnel');
  await p.click('#appSheet [data-coach-val="COURAGE"]'); await wait(150);
  await p.click('#appSheet [data-coach-goto="5"]'); await wait(150);
  await p.click('#appSheet [data-coach-sit-who="spouse"]'); await wait(150);
  await p.click('#appSheet [data-coach-sit-what="burnout"]'); await wait(150);
  const inAppStage5Txt = await p.textContent('#appSheet');
  check(/Stage 5: Situational Leadership Playbook/i.test(inAppStage5Txt) && /spouse/i.test(inAppStage5Txt) && /COURAGE/i.test(inAppStage5Txt), 'In-app Stage 5 generates tailored Situational Leadership Playbook reflecting unsaved Stage 3 coachDraft Triad');
  await p.click('#appSheet [data-coach-goto="6"]'); await wait(150);
  await p.click('#appSheet [data-coach-cclm-rate="stewardships:5"]'); await wait(150);
  const inAppStage6Txt = await p.textContent('#appSheet');
  check(/Personal Identity & Leadership Charter/i.test(inAppStage6Txt) && /Today’s Bedrock Touchstone Question/i.test(inAppStage6Txt) && /Evening Jeremiah 1:8 Check/i.test(inAppStage6Txt), 'In-app Stage 6 renders 4-Domain Stewardship Self-Audit and 4-card Live Personal Charter');
  await p.click('#appSheet [data-coach-goto="5"]'); await wait(150);
  await p.click('#appSheet [data-cclm-seed-bp]'); await wait(250);
  const bpOneThingBox = await p.locator('#bpOneThing').boundingBox();
  check(bpOneThingBox && bpOneThingBox.y > 0 && bpOneThingBox.y < 700, `On 412x780 viewport, Morning Council #1 Priority (#bpOneThing) is visible above the fold (y=${Math.round(bpOneThingBox ? bpOneThingBox.y : 999)})`);
  const stAfterSeed = await state(p), profAfterSeedFromCoach = stAfterSeed.profile || {}, coachAfterSeed = (stAfterSeed.pro && stAfterSeed.pro.coach) || {};
  check(coachAfterSeed.cclmRatings && coachAfterSeed.cclmRatings.stewardships === 5 && profAfterSeedFromCoach.cclmRatings === undefined && (profAfterSeedFromCoach.coreValues || []).includes('COURAGE'), 'Seeding Morning Council directly from Stage 5 persists in-progress coachDraft edits to S.pro.coach and S.profile');
  await p.click('#appClose'); await wait(200);

  // Verify legacy S.profile private coaching fields are migrated to S.pro.coach on load() and survive famCopy / saveLocal()
  await p.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('treasureup.v1') || '{}');
    raw.profile = Object.assign({}, raw.profile, {
      peakMoment: 'Legacy peak moment from older version',
      cclmNote: 'Legacy private audit note',
      cclmRatings: { self: 2, spouse: 5, children: 4, stewardships: 3 }
    });
    delete raw.pro;
    localStorage.setItem('treasureup.v1', JSON.stringify(raw));
    localStorage.removeItem('treasureup.pro.v1');
  });
  await p.reload(); await wait(300);
  await p.click('#home [data-together-check]'); await wait(150);
  const legacySurvives = await state(p);
  check(
    !(legacySurvives.profile && legacySurvives.profile.peakMoment) &&
    !(legacySurvives.profile && legacySurvives.profile.cclmNote) &&
    legacySurvives.pro && legacySurvives.pro.coach && legacySurvives.pro.coach.peakMoment === 'Legacy peak moment from older version' &&
    legacySurvives.pro.coach.cclmNote === 'Legacy private audit note' &&
    legacySurvives.pro.coach.cclmRatings && legacySurvives.pro.coach.cclmRatings.self === 2,
    'Legacy S.profile private coaching fields migrate into S.pro.coach on load() and survive non-profile saves'
  );

  check(!p.errors.length, 'no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await dev.ctx.close();
}


