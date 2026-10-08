'use strict';
const $ = id => document.getElementById(id);
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
let active = null, audio = null, ringTimer = null, serverOffset = 0;
const pad = n => String(n).padStart(2, '0');
$('zone').textContent = zone.replaceAll('_', ' ');
const initial = new Date(Date.now() + 3600000);
$('alarm-time').value = `${pad(initial.getHours())}:${pad(initial.getMinutes())}`;
function feedback(message, error = false) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('error', error);
}
async function unlockAudio() {
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') await audio.resume();
}
function chime(sound) {
  if (!audio || audio.state !== 'running' || sound === 'silent') return;
  const notes = sound === 'pulse' ? [880, 880, 880] : [523.25, 659.25, 783.99];
  notes.forEach((frequency, i) => {
    const osc = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + i * .25;
    osc.type = 'sine'; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(.13, start + .02);
    gain.gain.exponentialRampToValueAtTime(.001, start + .65);
    osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + .7);
  });
}
function stopSound() { clearInterval(ringTimer); ringTimer = null; }
function renderState() {
  $('cancel').hidden = !active;
  $('set-button').textContent = active ? 'Update alarm' : 'Set alarm';
  $('badge').textContent = active ? 'ARMED' : 'STANDBY';
  $('status-title').textContent = active ? active.label : 'Your time is yours.';
  if (!active) $('countdown').textContent = 'Set an alarm when you’re ready.';
}
function ring() {
  if (!active || active.ringing) return;
  active.ringing = true;
  $('ring-label').textContent = active.label;
  $('badge').textContent = 'RINGING';
  $('countdown').textContent = 'Your alarm is ringing.';
  $('ring-dialog').showModal();
  chime(active.sound);
  ringTimer = setInterval(() => chime(active?.sound || 'silent'), 1800);
  // Avoid an unattended alarm sounding indefinitely.
  setTimeout(() => { if (active?.ringing) stopSound(); }, 60000);
}
function tick() {
  const now = new Date();
  $('clock').replaceChildren(document.createTextNode(`${pad(now.getHours())}:${pad(now.getMinutes())}`));
  const seconds = document.createElement('span'); seconds.className = 'seconds'; seconds.textContent = `:${pad(now.getSeconds())}`; $('clock').append(seconds);
  $('date').textContent = now.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
  $('weekday').textContent = now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  $('hour-hand').style.transform = `rotate(${(now.getHours()%12)*30+now.getMinutes()/2}deg)`;
  $('minute-hand').style.transform = `rotate(${now.getMinutes()*6+now.getSeconds()/10}deg)`;
  $('second-hand').style.transform = `rotate(${now.getSeconds()*6}deg)`;
  if (active && !active.ringing) {
    const remaining = Math.ceil((active.target - Date.now() - serverOffset) / 1000);
    if (remaining <= 0) { ring(); return; }
    const hours = Math.floor(remaining / 3600), minutes = Math.floor(remaining%3600/60), secs = remaining%60;
    $('countdown').textContent = `Rings in ${hours ? hours+'h ' : ''}${minutes}m ${pad(secs)}s`;
  }
}
$('alarm-form').addEventListener('submit', async event => {
  event.preventDefault();
  const selectedSound = $('sound').value;
  $('set-button').disabled = true;
  feedback('Setting your alarm…');
  try {
    if (selectedSound !== 'silent') await unlockAudio();
    const start = Date.now();
    const response = await fetch('/api/alarm', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({time:$('alarm-time').value, timezone:zone}), signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not set your alarm.');
    serverOffset = data.server_ms - ((start + Date.now()) / 2);
    stopSound();
    active = {target:data.target_ms, label:$('alarm-label').value.trim() || 'Time for your next moment.', sound:selectedSound, ringing:false};
    renderState(); tick();
    feedback('Alarm set for '+new Date(active.target).toLocaleString([], {weekday:'short', hour:'2-digit', minute:'2-digit'})+'.');
  } catch (error) { feedback(error.name === 'TimeoutError' ? 'Connection timed out. Please try again.' : (error.message || 'Unable to set alarm. Please try again.'), true); }
  finally { $('set-button').disabled = false; }
});
$('test-sound').addEventListener('click', async () => {
  if ($('sound').value === 'silent') { feedback('Silent alert selected. A message will appear without sound.'); return; }
  try { await unlockAudio(); chime($('sound').value); feedback('Sound preview played. Check your device volume.'); }
  catch { feedback('Audio is unavailable. Select Silent alert to continue.', true); }
});
$('cancel').addEventListener('click', () => { stopSound(); active = null; renderState(); feedback('Alarm cancelled.'); });
function dismiss() { stopSound(); active = null; $('ring-dialog').close(); renderState(); feedback('Alarm dismissed.'); }
$('dismiss').addEventListener('click', dismiss);
$('ring-dialog').addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
$('snooze').addEventListener('click', async () => {
  stopSound(); active.target = Date.now() + serverOffset + 300000; active.ringing = false;
  $('ring-dialog').close(); renderState(); tick(); feedback('Snoozed for 5 minutes.');
  if (active.sound !== 'silent') { try { await unlockAudio(); } catch { feedback('Snoozed. Audio unavailable; visual alert remains enabled.', true); } }
});
document.addEventListener('visibilitychange', tick);
tick(); setInterval(tick, 250);
