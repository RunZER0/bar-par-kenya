const API = new URLSearchParams(location.search).get('api') || '';
const storage = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key, value) { try { localStorage.setItem(key, value); } catch { /* guest mode still works for this tab */ } }, remove(key) { try { localStorage.removeItem(key); } catch { /* ignore storage restrictions */ } } };
const state = { token: storage.get('barpar.token'), learner: null, subjects: [], topics: {}, flashcards: [], flashcardIndex: 0, flashcardRevealed: false, flashcardSaving: false, progress: null, discovery: [], bookmarks: [], session: null, selected: null, answered: false };
const $ = (selector) => document.querySelector(selector);

async function request(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error?.message || 'Something went wrong');
  return body?.data ?? body;
}

function setToken(data) { state.token = data.accessToken; state.learner = data.learner; storage.set('barpar.token', state.token); }
function initials(name) { return (name || 'Guest learner').split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase(); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); }
function setLoading(message) { $('#sync-status').textContent = message; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function formatDueAt(review) {
  if (!review) return 'New card';
  const due = new Date(review.dueAt).getTime();
  const remaining = due - Date.now();
  if (remaining <= 0) return 'Due now';
  const hours = Math.ceil(remaining / 3600000);
  if (hours < 24) return `Due in ${hours}h`;
  return `Due in ${Math.ceil(hours / 24)}d`;
}

async function ensureLearner() {
  if (state.token) { try { state.learner = await request('/v1/me'); return; } catch { storage.remove('barpar.token'); state.token = null; } }
  let deviceId = storage.get('barpar.device');
  if (!deviceId) { deviceId = globalThis.crypto?.randomUUID?.() || `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`; storage.set('barpar.device', deviceId); }
  setToken(await request('/v1/auth/guest', { method: 'POST', body: JSON.stringify({ deviceId }) }));
}

async function loadData() {
  setLoading('Syncing');
  await ensureLearner();
  const [subjects, progress, discovery, bookmarks, flashcards] = await Promise.all([request('/v1/subjects'), request('/v1/progress'), request('/v1/discovery'), request('/v1/bookmarks'), request('/v1/flashcards')]);
  state.subjects = subjects; state.progress = progress; state.discovery = discovery; state.bookmarks = bookmarks; state.flashcards = flashcards;
  renderShell(); renderDashboard(); renderPracticeOptions(); renderSaved(); renderFlashcards(); setLoading('Ready');
}

function renderShell() {
  const name = state.learner.displayName || 'Guest learner';
  $('#profile-name').textContent = name; $('#profile-kind').textContent = state.learner.kind === 'registered' ? 'Account synced' : 'Progress saved on this device'; $('#avatar').textContent = initials(name); $('#account-name').textContent = name; $('#account-email').textContent = state.learner.email || 'Progress is stored for this device.'; $('#account-badge').textContent = state.learner.kind === 'registered' ? 'Registered learner' : 'Guest mode';
}
function renderDashboard() {
  const progress = state.progress || { accuracy: 0, answered: 0, currentStreakDays: 0, completedSessions: 0 };
  $('#accuracy').textContent = `${progress.accuracy}%`; $('#answered').textContent = progress.answered; $('#streak').textContent = progress.currentStreakDays; $('#sidebar-streak').textContent = progress.currentStreakDays; $('#bookmark-count').textContent = state.bookmarks.length;
  const reviewed = state.flashcards.filter((item) => item.review).length; const readiness = progress.answered ? Math.min(100, Math.round((progress.accuracy * .7) + (Math.min(progress.answered, 20) / 20 * 30))) : Math.min(100, reviewed * 10);
  $('#readiness-percent').textContent = `${readiness}%`; $('#readiness-ring').textContent = `${readiness}%`; $('#readiness-detail').textContent = `${progress.answered} question${progress.answered === 1 ? '' : 's'} answered`; $('#readiness-bar-fill').style.width = `${readiness}%`;
  const previewCard = state.flashcards[0]; $('#preview-front').textContent = previewCard?.front || 'Your next recall prompt will appear here.';
  const done = state.discovery.filter((item) => item.completed).length; const pct = state.discovery.length ? Math.round(done / state.discovery.length * 100) : 0; const ring = $('#discovery-progress'); ring.textContent = `${pct}%`; ring.style.background = `conic-gradient(var(--coral) ${pct * 3.6}deg, #f0eee7 0deg)`;
  $('#discovery-list').innerHTML = state.discovery.map((item) => `<div class="discovery-item"><span class="check ${item.completed ? 'done' : ''}">${item.completed ? '✓' : ''}</span><div><strong>${item.title}</strong><span>${item.description}</span></div></div>`).join('');
  const courses = ['Civil Litigation', 'Criminal Litigation', 'Probate & Administration', 'Legal Writing & Drafting', 'Trial Advocacy', 'Professional Ethics & Practice', 'Legal Practice Management', 'Conveyancing', 'Commercial Transactions'];
  const available = new Map(state.subjects.map((subject) => [subject.name, subject]));
  $('#subject-grid').innerHTML = courses.map((name, index) => { const subject = available.get(name); return subject?.topicCount ? `<article class="subject-card" data-subject="${subject.id}" data-slug="${subject.slug}"><span class="subject-index">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(subject.description)}</p><span class="subject-status">${subject.topicCount} topic${subject.topicCount === 1 ? '' : 's'} available</span><span class="arrow">↗</span></article>` : `<article class="subject-card locked"><span class="subject-index">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(name)}</h3><p>Course materials are being prepared for publication.</p><span class="subject-status">Editorial review</span></article>`; }).join('');
  document.querySelectorAll('[data-subject]').forEach((card) => card.addEventListener('click', () => openFlashcardDeck(card.dataset.subject)));
}
function renderFlashcards() {
  const deck = $('#flashcard-deck');
  if (deck.options.length === 1) deck.innerHTML += state.subjects.map((subject) => `<option value="${subject.id}">${subject.name}</option>`).join('');
  const card = state.flashcards[state.flashcardIndex];
  const reviewed = state.flashcards.filter((item) => item.review).length;
  $('#flashcard-count').textContent = `${state.flashcards.length} card${state.flashcards.length === 1 ? '' : 's'}`;
  $('#flashcard-status').textContent = `${reviewed} reviewed · ${state.flashcards.length - reviewed} new`;
  $('#flip-card').disabled = !card || state.flashcardSaving; $('#again-card').disabled = !card || !state.flashcardRevealed || state.flashcardSaving; $('#know-card').disabled = !card || !state.flashcardRevealed || state.flashcardSaving;
  if (!card) { $('#flashcard-stage').innerHTML = '<div class="empty-state"><strong>This deck is being prepared.</strong><span>No published cards are available in this deck yet.</span></div>'; $('#flip-card').innerHTML = 'Reveal answer <span>↓</span>'; return; }
  const cardPosition = `${state.flashcardIndex + 1} / ${state.flashcards.length}`;
  const cardStatus = formatDueAt(card.review);
  $('#flashcard-stage').innerHTML = state.flashcardRevealed
    ? `<article class="flashcard revealed" aria-live="polite"><span class="flashcard-label">ANSWER · ${cardPosition}</span><span class="flashcard-review-state">${escapeHtml(cardStatus)}</span><h2 class="flashcard-answer">${escapeHtml(card.back.answer)}</h2><p>${escapeHtml(card.back.explanation)}</p></article>`
    : `<article class="flashcard" aria-live="polite"><span class="flashcard-label">PROMPT · ${cardPosition}</span><span class="flashcard-review-state">${escapeHtml(cardStatus)}</span><h2>${escapeHtml(card.front)}</h2></article>`;
  $('#flip-card').innerHTML = state.flashcardRevealed ? 'Hide answer <span>↑</span>' : 'Reveal answer <span>↓</span>';
}
async function openFlashcardDeck(subjectId = '') {
  navigate('flashcards');
  $('#flashcard-deck').value = subjectId;
  try { setLoading('Loading deck'); state.flashcards = await request(subjectId ? `/v1/flashcards?subjectId=${encodeURIComponent(subjectId)}` : '/v1/flashcards'); state.flashcardIndex = 0; state.flashcardRevealed = false; renderFlashcards(); } catch (error) { showToast(error.message); } finally { setLoading('Ready'); }
}
async function topicsFor(subject) { if (!state.topics[subject.slug]) state.topics[subject.slug] = await request(`/v1/subjects/${encodeURIComponent(subject.slug)}/topics`); return state.topics[subject.slug]; }
async function renderPracticeOptions() {
  const options = $('#practice-options'); options.innerHTML = state.subjects.map((subject, index) => `<button class="practice-option" ${subject.topicCount === 0 ? 'disabled' : ''} data-practice-subject="${subject.id}" data-practice-slug="${subject.slug}"><span class="option-meta">COURSE ${String(index + 1).padStart(2, '0')} · ${subject.topicCount ? `${subject.topicCount} TOPIC${subject.topicCount === 1 ? '' : 'S'}` : 'EDITORIAL REVIEW'}</span><h3>${escapeHtml(subject.name)}</h3><p>${subject.topicCount ? escapeHtml(subject.description) : 'Questions are being prepared for publication.'}</p></button>`).join('');
  document.querySelectorAll('[data-practice-subject]').forEach((button) => button.addEventListener('click', async () => { const subject = state.subjects.find((item) => item.id === button.dataset.practiceSubject); const topics = await topicsFor(subject); if (topics.length === 1) startSession({ topicId: topics[0].id }); else { options.innerHTML = topics.map((topic) => `<button class="practice-option" data-topic="${topic.id}"><span class="option-meta">TOPIC</span><h3>${topic.name}</h3><p>${topic.description}</p></button>`).join(''); document.querySelectorAll('[data-topic]').forEach((item) => item.addEventListener('click', () => startSession({ topicId: item.dataset.topic }))); } }));
}
function renderSaved() { const list = $('#saved-list'); if (!state.bookmarks.length) { list.innerHTML = '<div class="empty-state"><strong>Your revision bank is empty.</strong>Save questions during practice and they’ll land here.</div>'; return; } list.innerHTML = state.bookmarks.map((question, index) => `<article class="saved-card"><div class="saved-card-head"><span>QUESTION 0${index + 1}</span><span>${question.difficulty}</span></div><h3>${question.prompt}</h3><p>${question.options.map((option) => `${option.id.toUpperCase()}. ${option.text}`).join(' · ')}</p></article>`).join(''); }

async function startSession(scope) { try { setLoading('Starting set'); const count = Number($('#question-count').value); state.session = await request('/v1/practice/sessions', { method: 'POST', body: JSON.stringify({ ...scope, questionCount: count, mode: 'practice' }) }); state.answered = false; state.selected = null; $('#practice-picker').classList.add('hidden'); $('#session-panel').classList.remove('hidden'); renderSession(); } catch (error) { showToast(error.message); } finally { setLoading('Ready'); } }
function renderSession(result = null) { const session = state.session; const question = result?.nextQuestion || session.currentQuestion; if (!question) { $('#session-panel').innerHTML = `<div class="question-wrap"><p class="eyebrow">SET COMPLETE</p><h2>You showed up. That’s the rep that counts.</h2><p class="hero-subtitle">${session.correctCount} of ${session.questionCount} correct.</p><div class="session-footer"><button class="button button-dark" id="new-set">Start another set <span>→</span></button></div></div>`; $('#new-set').onclick = resetPractice; return; } state.currentQuestion = question; state.answered = false; state.selected = null; const position = session.currentIndex + 1; const percent = Math.round((session.currentIndex / session.questionCount) * 100); $('#session-panel').innerHTML = `<div class="session-top"><span class="session-label">FOCUSED PRACTICE</span><div class="session-progress"><span>${position} / ${session.questionCount}</span><span class="progress-bar"><span style="width:${percent}%"></span></span></div></div><div class="question-wrap"><span class="difficulty">${question.difficulty} recall</span><h2>${question.prompt}</h2><div class="answers">${question.options.map((option) => `<button class="answer" data-answer="${option.id}"><span class="answer-key">${option.id.toUpperCase()}</span><span>${option.text}</span></button>`).join('')}</div><div id="feedback"></div><div class="session-footer"><button class="button button-quiet" id="exit-session">← Choose another set</button><button class="button" id="submit-answer" disabled>Lock answer <span>→</span></button></div></div>`; document.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => selectAnswer(button.dataset.answer))); $('#submit-answer').onclick = submitAnswer; $('#exit-session').onclick = resetPractice; }
function selectAnswer(id) { if (state.answered) return; state.selected = id; document.querySelectorAll('[data-answer]').forEach((button) => button.classList.toggle('selected', button.dataset.answer === id)); $('#submit-answer').disabled = false; }
async function submitAnswer() { if (!state.selected || state.answered) return; const question = state.currentQuestion; try { const result = await request(`/v1/practice/sessions/${state.session.id}/answer`, { method: 'POST', body: JSON.stringify({ questionId: question.id, selectedOptionId: state.selected }) }); state.answered = true; state.session = result.session; document.querySelectorAll('[data-answer]').forEach((button) => { button.disabled = true; if (button.dataset.answer === result.correctOptionId) button.classList.add('correct'); if (button.dataset.answer === state.selected && !result.isCorrect) button.classList.add('incorrect'); }); $('#feedback').innerHTML = `<div class="feedback ${result.isCorrect ? 'correct' : 'incorrect'}"><h3>${result.isCorrect ? 'Correct. Nice retrieval.' : 'Not this time — useful signal.'}</h3><p>${result.explanation}</p></div>`; const next = $('#submit-answer'); next.disabled = false; next.innerHTML = result.nextQuestion ? 'Next question <span>→</span>' : 'See your result <span>→</span>'; next.onclick = () => result.nextQuestion ? renderSession(result) : renderSession({ nextQuestion: null }); await refreshProgress(); } catch (error) { showToast(error.message); } }
async function refreshProgress() { const [progress, discovery, bookmarks] = await Promise.all([request('/v1/progress'), request('/v1/discovery'), request('/v1/bookmarks')]); state.progress = progress; state.discovery = discovery; state.bookmarks = bookmarks; renderDashboard(); renderSaved(); }
function resetPractice() { state.session = null; $('#session-panel').classList.add('hidden'); $('#practice-picker').classList.remove('hidden'); renderPracticeOptions(); }

function navigate(view) { document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`)); document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view)); $('#page-title').textContent = ({ dashboard: 'Overview', flashcards: 'Flashcards', practice: 'Practice tests', saved: 'Saved questions', account: 'Account' })[view] || 'Overview'; if (view === 'practice' && state.session) { $('#practice-picker').classList.add('hidden'); $('#session-panel').classList.remove('hidden'); renderSession(); } }
document.addEventListener('click', (event) => { const link = event.target.closest?.('[data-view]'); if (link) { event.preventDefault(); const view = link.dataset.view; location.hash = `view-${view}`; navigate(view); return; } });
window.addEventListener('hashchange', () => navigate(location.hash.replace(/^#view-/, '') || 'dashboard'));
$('#flashcard-deck').onchange = () => openFlashcardDeck($('#flashcard-deck').value);
$('#flip-card').onclick = () => { state.flashcardRevealed = !state.flashcardRevealed; renderFlashcards(); };
document.addEventListener('keydown', (event) => {
  if (location.hash !== '#view-flashcards' || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (event.code === 'Space') { event.preventDefault(); $('#flip-card').click(); }
});
function moveFlashcard() { if (!state.flashcards.length) return; state.flashcardIndex = (state.flashcardIndex + 1) % state.flashcards.length; state.flashcardRevealed = false; renderFlashcards(); }
async function reviewFlashcard(rating) {
  const card = state.flashcards[state.flashcardIndex];
  if (!card || !state.flashcardRevealed || state.flashcardSaving) return;
  state.flashcardSaving = true; renderFlashcards(); setLoading('Saving review');
  try {
    card.review = await request(`/v1/flashcards/${encodeURIComponent(card.id)}/review`, { method: 'POST', body: JSON.stringify({ rating }) });
    showToast(rating === 'known' ? 'Saved as known · next review in 3 days' : 'Saved for another pass · due in 10 minutes');
    moveFlashcard();
  } catch (error) { showToast(error.message); }
  finally { state.flashcardSaving = false; setLoading('Ready'); renderFlashcards(); }
}
$('#again-card').onclick = () => reviewFlashcard('again');
$('#know-card').onclick = () => reviewFlashcard('known');
$('#refresh-button').onclick = () => loadData().catch((error) => showToast(error.message));
$('#register-form').onsubmit = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const message = $('#register-message'); message.textContent = ''; try { setToken(await request('/v1/auth/register', { method: 'POST', body: JSON.stringify({ displayName: form.get('displayName'), email: form.get('email'), password: form.get('password') }) })); renderShell(); message.textContent = 'Account created. Your progress is now synced to this learner.'; showToast('Progress protected'); } catch (error) { message.textContent = error.message; } };
loadData().catch((error) => { setLoading('API offline'); showToast(`Could not connect to the API: ${error.message}`); $('#subject-grid').innerHTML = '<div class="empty-state"><strong>API is offline.</strong>Start the backend with <code>npm run dev</code>, then refresh this page.</div>'; });
