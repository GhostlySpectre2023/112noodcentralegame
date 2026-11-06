'use strict';
/* ==========================================================
   Echt praten met de beller
   - Gratis: je vraag wordt herkend aan sleutelwoorden.
   - AI-modus: Claude speelt de beller (eigen API-sleutel),
     OpenAI of de browser geeft de stem.
   Sleutels blijven alleen in deze browser (localStorage).
   ========================================================== */

const AI_KEY = 'mk112_ai';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.1.0/+esm';
const AI_MODELS = {
  'claude-opus-5-5': { name: 'Claude Opus 5.5 (standaard)', in: 4, out: 20 },
  'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5 (goedkoper)', in: 2, out: 10 },
  'claude-haiku-5-5': { name: 'Claude Haiku 5.5 (goedkoopst, snelst)', in: 0.1, out: 0.5 },
};
const OA_VOICES = ['coral', 'sage', 'ash', 'ballad', 'verse', 'shimmer', 'echo', 'alloy'];

const AI = { on: false, anthKey: '', model: 'claude-opus-5-5', voice: 'browser', oaKey: '', oaCrew: false,
  usage: { replies: 0, inTok: 0, outTok: 0, ttsChars: 0 } };
function loadAI() { try { Object.assign(AI, JSON.parse(localStorage.getItem(AI_KEY) || '{}')); } catch (e) { /* */ } }
function saveAI() { try { localStorage.setItem(AI_KEY, JSON.stringify(AI)); } catch (e) { /* */ } }
loadAI();
const aiReady = () => AI.on && AI.anthKey.trim().length > 10;

// ---------- Claude-client (pas laden als de AI-modus gebruikt wordt) ----------
let anthClient = null, anthKeyUsed = '';
async function getClaude() {
  if (anthClient && anthKeyUsed === AI.anthKey) return anthClient;
  const mod = await import(SDK_URL);
  const Anthropic = mod.default || mod.Anthropic;
  anthClient = new Anthropic({ apiKey: AI.anthKey.trim(), dangerouslyAllowBrowser: true });
  anthKeyUsed = AI.anthKey;
  return anthClient;
}

// ---------- Scenario voor de AI-beller ----------
const FACT_TXT = {
  bewust: { ja: 'Het slachtoffer is wakker en praat.', nee: 'Het slachtoffer reageert helemaal niet.', half: 'Het slachtoffer is suf en verward.', nvt: 'Er is (nog) geen gewonde.' },
  adem: { ja: 'Het slachtoffer ademt normaal.', nee: 'Het slachtoffer ademt niet.', moeilijk: 'Het slachtoffer ademt heel moeilijk.', nvt: '' },
  gevaar: { ja: 'Er is brand en rook.', nee: 'Er is geen direct gevaar.', gas: 'Het ruikt sterk naar gas.', water: 'Er is water in het spel.', dader: 'Er is mogelijk een dader of agressieve persoon in de buurt.' },
};
function callerSystemPrompt(c) {
  const T = TYPE_BY_ID[c.typeId], f = c.facts || T.facts;
  if (c.fake) {
    return `Je speelt in een oefenspel voor 112-calltakers een beller die géén noodgeval heeft (verkeerd nummer, kinderstreek of een vraag die niet voor 112 is). Spreek Vlaams Nederlands, kort (1 à 2 zinnen). Geef nooit een echt noodgeval. Als de calltaker vraagt of er een noodgeval is, geef je toe van niet of verzin je een flauw excuus. Zeg nooit dat je een AI bent.`;
  }
  return `Je speelt in een oefenspel voor 112-calltakers in België de beller van een noodoproep. Blijf altijd in je rol.

Wat jij weet (de calltaker weet dit niet):
- Wat er aan de hand is: ${T.name.toLowerCase()}. Je eerste woorden waren: "${c.text}"
- Adres: ${c.addr}. Geef het adres pas als de calltaker ernaar vraagt, en verander het nooit.
- ${f.personen || ''}
- ${FACT_TXT.bewust[f.bewust] || ''} ${FACT_TXT.adem[f.adem] || ''} ${FACT_TXT.gevaar[f.gevaar] || ''}
- Ernst: ${c.sev === 'ernstig' ? 'het is kritiek, je bent in paniek' : c.sev === 'licht' ? 'het lijkt niet levensbedreigend, je bent ongerust maar vrij rustig' : 'het is dringend, je bent gestrest'}.

Hoe je antwoordt:
- Spreek Vlaams Nederlands zoals een gewone burger, niet als een hulpverlener. Gebruik geen medische vaktermen of protocolnamen.
- Antwoord kort: 1 tot 3 zinnen, zoals aan de telefoon. Geef enkel de informatie waar de calltaker om vraagt.
- Toon emotie die past bij de ernst. Als de calltaker je geruststelt, kalmeer je een beetje.
- Volg instructies van de calltaker (bv. kijken of iemand ademt, iemand op de zij leggen, reanimeren) en beschrijf kort wat je doet en ziet, in lijn met de situatie hierboven.
- Weet je iets niet, zeg dat dan. Verzin geen andere situatie dan hierboven.
- Zeg nooit dat je een AI of een spel bent.`;
}
function convoToMessages(c) {
  const msgs = [];
  for (const m of c.convo) {
    const role = m.who === 'me' ? 'user' : 'assistant';
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content += '\n' + m.text; else msgs.push({ role, content: m.text });
  }
  if (msgs.length && msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '112, wat is uw noodgeval?' });
  return msgs;
}
async function callerAI(c) {
  const client = await getClaude();
  const resp = await client.beta.messages.create({
    model: AI.model,
    max_tokens: 1024,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: callerSystemPrompt(c),
    messages: convoToMessages(c),
  });
  AI.usage.replies++; AI.usage.inTok += resp.usage?.input_tokens || 0; AI.usage.outTok += resp.usage?.output_tokens || 0; saveAI();
  if (resp.stop_reason === 'refusal') return '… (de beller valt even stil) … Hallo? Bent u daar nog?';
  const txt = resp.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
  return txt || '… Hallo?';
}

// ---------- Gratis modus: sleutelwoorden ----------
const Q_PATTERNS = { adres: /adres|waar (bent|is|zijn)|straat|locatie|welke gemeente|plaats/, wat: /gebeurd|wat is er|wat scheelt|vertel|wat is het probleem/,
  bewust: /bewust|wakker|reageert|aanspreekbaar/, adem: /adem/, personen: /hoeveel|personen|gewonden|slachtoffer|leeftijd|hoe oud/, gevaar: /brand|rook|gevaar|gas|veilig/ };
function keywordReply(c, text) {
  const t = text.toLowerCase(), hits = Object.entries(Q_PATTERNS).filter(([, re]) => re.test(t)).map(([q]) => q);
  if (hits.length) return hits.map(q => { if (!c.asked.includes(q)) c.asked.push(q); return answerFor(c, q); }).join(' ');
  if (/rustig|kalm|blijf aan de lijn|hulp is onderweg|ze komen|onderweg/.test(t)) return pick(['Oké… oké. Alstublieft, laat ze snel komen!', 'Dank u, dank u. Ik blijf bij hem.', 'Goed, ik probeer rustig te blijven.']);
  if (/zij|stabiele|reanim|druk|borst|pomp|mond/.test(t)) return pick(['Oké, ik doe het… ik doe wat u zegt.', 'Zo? Ik probeer het, maar ik ben zo bang.']);
  if (/naam|telefoon|nummer/.test(t)) return 'Ik ben de beller, mijn nummer staat op uw scherm denk ik.';
  return pick(['Sorry, wat zegt u? Ik begrijp u niet goed.', 'Wat bedoelt u?', 'Kunt u dat herhalen? Ik hoor u slecht.']);
}

// ---------- Praten ----------
let talking = false;
async function talkToCaller(text) {
  const c = currentCall; text = (text || '').trim();
  if (!c || !text || talking) return;
  addConvo(c, 'me', text);
  if (Q_PATTERNS.adres.test(text.toLowerCase()) && !c.asked.includes('adres')) c.asked.push('adres');
  renderCall();
  let reply;
  if (aiReady()) {
    talking = true; setTyping(true);
    try { reply = await callerAI(c); }
    catch (e) {
      log(`🤖 AI-beller werkt niet: ${esc(e?.message || String(e)).slice(0, 140)}. Controleer je Claude-sleutel bij ⚙️ Instellingen.`, '#ef4444');
      reply = keywordReply(c, text);
    } finally { talking = false; setTyping(false); }
    if (c.addr && reply.includes(c.addr.split(',')[0].split(' ')[0]) && !c.asked.includes('adres')) c.asked.push('adres');
  } else reply = keywordReply(c, text);
  if (currentCall !== c) return;
  addConvo(c, 'caller', reply);
  speakCaller(reply, c.voiceSeed, c.sev);
  renderCall();
}
function setTyping(on) { const el = $('#callTyping'); if (el) el.classList.toggle('hidden', !on); }

// ---------- Stemmen ----------
let audioQueue = Promise.resolve(), currentAudio = null;
function stopVoices() { try { currentAudio?.pause(); } catch (e) { /* */ } currentAudio = null; if (window.speechSynthesis) speechSynthesis.cancel(); }
async function openaiSpeech(text, voice, instructions) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI.oaKey.trim()}` },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, instructions, response_format: 'mp3' }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}`);
  AI.usage.ttsChars += text.length; saveAI();
  return URL.createObjectURL(await r.blob());
}
function playUrl(url) {
  return new Promise(res => { const a = new Audio(url); currentAudio = a; a.onended = a.onerror = () => { URL.revokeObjectURL(url); res(); }; a.play().catch(() => res()); });
}
function useOpenAI() { return S.voice && AI.voice === 'openai' && AI.oaKey.trim().length > 10; }
function speakCaller(text, seed = 0, sev = 'matig') {
  if (!S.voice) return;
  if (!useOpenAI()) { speak(text, 'caller', seed); return; }
  const mood = sev === 'ernstig' ? 'in paniek, snel en emotioneel' : sev === 'licht' ? 'ongerust maar vrij rustig' : 'gestrest en gehaast';
  const instr = `Spreek Nederlands met een Vlaams accent, als een gewone burger die 112 belt. Toon: ${mood}.`;
  const p = openaiSpeech(text, OA_VOICES[seed % OA_VOICES.length], instr).catch(e => { log(`🔊 OpenAI-stem werkt niet (${esc(e.message)}). Ik gebruik de browserstem.`, '#f59e0b'); return null; });
  audioQueue = audioQueue.then(async () => { const url = await p; if (url) await playUrl(url); else speak(text, 'caller', seed); });
}
function speakCrew(text, seed = 0) {
  if (!S.voice) return;
  if (!(useOpenAI() && AI.oaCrew)) { speak(text, 'radio', seed); return; }
  const p = openaiSpeech(text, ['ash', 'echo', 'onyx', 'verse'][seed % 4], 'Spreek Nederlands met een Vlaams accent, kort en zakelijk, als een ambulancier of brandweerman over de radio.').catch(() => null);
  audioQueue = audioQueue.then(async () => { const url = await p; if (url) await playUrl(url); else speak(text, 'radio', seed); });
}

// ---------- Instellingen ----------
function costEstimate() { const m = AI_MODELS[AI.model] || AI_MODELS['claude-opus-5-5']; return (AI.usage.inTok * m.in + AI.usage.outTok * m.out) / 1e6; }
function openSettings() {
  $('#setAi').checked = AI.on; $('#setAnthKey').value = AI.anthKey; $('#setOaKey').value = AI.oaKey;
  $('#setModel').innerHTML = Object.entries(AI_MODELS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  $('#setModel').value = AI.model; $('#setVoice').value = AI.voice; $('#setOaCrew').checked = AI.oaCrew;
  $('#setUsage').textContent = `${AI.usage.replies} AI-antwoorden · ${AI.usage.inTok + AI.usage.outTok} tokens · ongeveer $${costEstimate().toFixed(3)} bij Claude · ${AI.usage.ttsChars} tekens stem bij OpenAI`;
  show('#settingsModal');
}
function saveSettings() {
  AI.on = $('#setAi').checked; AI.anthKey = $('#setAnthKey').value.trim(); AI.oaKey = $('#setOaKey').value.trim();
  AI.model = $('#setModel').value; AI.voice = $('#setVoice').value; AI.oaCrew = $('#setOaCrew').checked;
  saveAI(); hide('#settingsModal');
  log(aiReady() ? `🤖 AI-bellers staan aan (${AI_MODELS[AI.model].name}).` : 'Bellers antwoorden op sleutelwoorden (gratis modus).', '#38bdf8');
  updateAiBadge();
}
function updateAiBadge() { const b = $('#aiBadge'); if (b) { b.textContent = aiReady() ? 'AI-beller' : 'Tekstmodus'; b.classList.toggle('on', aiReady()); } }
$('#btnSettings').onclick = openSettings;
$('#setSave').onclick = saveSettings;
$('#setCancel').onclick = $('#setX').onclick = () => hide('#settingsModal');
$('#setClear').onclick = () => { AI.anthKey = ''; AI.oaKey = ''; AI.on = false; saveAI(); openSettings(); updateAiBadge(); log('Sleutels gewist uit deze browser.', '#38bdf8'); };
$('#setTest').onclick = async () => {
  $('#setTestOut').textContent = 'Bezig met testen…';
  const prev = { ...AI }; AI.anthKey = $('#setAnthKey').value.trim(); AI.model = $('#setModel').value;
  try {
    const client = await getClaude();
    const r = await client.beta.messages.create({ model: AI.model, max_tokens: 256, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'Zeg enkel: "Hallo, 112?" in het Vlaams.' }] });
    $('#setTestOut').textContent = r.stop_reason === 'refusal' ? 'Verbonden, maar het verzoek werd geweigerd.' : 'Claude werkt ✔ ' + r.content.filter(b => b.type === 'text').map(b => b.text).join(' ').slice(0, 60);
  } catch (e) { $('#setTestOut').textContent = 'Fout: ' + (e?.message || e).toString().slice(0, 160); }
  Object.assign(AI, { anthKey: prev.anthKey, model: prev.model });
};

// ---------- Gesprek: invoer ----------
$('#callSend').onclick = () => { const v = $('#callInput').value; $('#callInput').value = ''; talkToCaller(v); };
$('#callInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#callSend').click(); } });
const callMic = $('#callMic');
callMic.addEventListener('pointerdown', e => { e.preventDefault(); pttStart(); callMic.classList.add('live'); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => callMic.addEventListener(ev, () => { pttStop(); callMic.classList.remove('live'); }));
updateAiBadge();
