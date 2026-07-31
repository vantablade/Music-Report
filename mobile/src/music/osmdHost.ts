/**
 * HTML document hosted inside the ScorePlayer WebView.
 *
 * Responsibilities:
 *  - Render MusicXML with OpenSheetMusicDisplay (OSMD).
 *  - Drive the OSMD cursor and a self-contained WebAudio synth from the parsed timeline
 *    (one timeline event == one cursor step, so they stay in sync). No soundfont asset is
 *    needed for the monophonic MVP.
 *  - Bridge with React Native:
 *      RN -> Web:  window.SMT.handle(msg)   (injected by ScorePlayer)
 *      Web -> RN:  window.ReactNativeWebView.postMessage(JSON.stringify(evt))
 *
 * Message types (RN -> Web): load | play | pause | seek | setRate | feedback
 * Event types  (Web -> RN):  ready | position | ended | error
 *
 * OSMD is loaded from a CDN for dev convenience. For production/offline, bundle the OSMD
 * UMD build as an app asset and point OSMD_SRC at it (the CSP-free WebView can load a
 * file:// or bundled asset). See docs/phase-2.md.
 */
const OSMD_SRC =
  "https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.7/build/opensheetmusicdisplay.min.js";

export function buildOsmdHtml(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: #ffffff; }
  #osmd { padding: 16px 14px; }
  #err { color: #b00020; font: 14px sans-serif; padding: 16px; display: none; }
</style>
</head>
<body>
<div id="err"></div>
<div id="osmd"></div>
<script src="${OSMD_SRC}"></script>
<script>
(function () {
  var osmd = null;
  var timeline = [];
  var rate = 1.0;          // playback speed multiplier (uiTempo / scoreTempo)
  var playing = false;
  var startedAt = 0;       // audioContext time when playback started
  var startIndex = 0;
  var audio = null;
  var rafId = null;

  function post(evt) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(evt));
    }
  }
  function showError(msg) {
    var e = document.getElementById("err");
    e.textContent = msg; e.style.display = "block";
    post({ type: "error", message: msg });
  }

  function ac() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    return audio;
  }
  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function playNote(midi, atTime, durSec) {
    if (midi == null) return;
    var ctx = ac();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq(midi);
    var end = atTime + Math.max(0.05, durSec * 0.95);
    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.exponentialRampToValueAtTime(0.2, atTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(atTime);
    osc.stop(end + 0.02);
  }

  function cursorTo(index) {
    if (!osmd || !osmd.cursor) return;
    osmd.cursor.reset();
    osmd.cursor.show();
    for (var i = 0; i < index; i++) osmd.cursor.next();
  }

  function render(musicxml) {
    return osmd.load(musicxml).then(function () {
      osmd.render();
      osmd.cursor.show();
      osmd.cursor.reset();
      post({ type: "ready", noteCount: timeline.length });
    });
  }

  function schedule() {
    // Pre-schedule synth notes relative to the audio clock; advance the visual cursor
    // in a rAF loop by comparing elapsed audio time to each event's start.
    var ctx = ac();
    var base = timeline[startIndex] ? timeline[startIndex].startSec : 0;
    startedAt = ctx.currentTime + 0.06;
    for (var i = startIndex; i < timeline.length; i++) {
      var ev = timeline[i];
      var at = startedAt + (ev.startSec - base) / rate;
      playNote(ev.midi, at, ev.durSec / rate);
    }
    var lastPosted = -1;
    function tick() {
      if (!playing) return;
      var elapsed = (ctx.currentTime - startedAt) * rate + base;
      var idx = startIndex;
      while (idx + 1 < timeline.length && timeline[idx + 1].startSec <= elapsed) idx++;
      if (idx !== lastPosted) {
        cursorTo(idx);
        post({ type: "position", index: idx });
        lastPosted = idx;
      }
      var end = timeline.length ? timeline[timeline.length - 1] : null;
      if (end && elapsed >= end.startSec + end.durSec) {
        stop(true);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (!osmd || playing || !timeline.length) return;
    ac().resume && ac().resume();
    playing = true;
    schedule();
  }
  function stop(ended) {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (ended) post({ type: "ended" });
  }

  window.SMT = {
    handle: function (msg) {
      try {
        switch (msg.type) {
          case "load":
            timeline = msg.timeline || [];
            startIndex = 0;
            if (!osmd) {
              if (!window.opensheetmusicdisplay) { showError("Notation engine failed to load"); return; }
              osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmd", {
                autoResize: true, drawingParameters: "default", followCursor: true,
                cursorsOptions: [{ type: 0, color: "#FFD60A", alpha: 0.45, follow: true }],
              });
              // Sheet-music look: keep default's spacious engraving but drop the header cruft.
              // The OCR title is garbage (the app header already shows the real name) and there's
              // a single part, so its name/abbreviation only wastes horizontal space.
              var r = osmd.EngravingRules;
              if (r) {
                r.RenderTitle = false;
                r.RenderSubtitle = false;
                r.RenderComposer = false;
                r.RenderLyricist = false;
                r.RenderPartNames = false;
                r.RenderPartAbbreviations = false;
              }
            }
            render(msg.musicxml).catch(function (e) { showError("Could not render score: " + e); });
            break;
          case "play": play(); break;
          case "pause": stop(false); break;
          case "seek":
            startIndex = Math.max(0, Math.min(msg.index | 0, timeline.length - 1));
            cursorTo(startIndex);
            post({ type: "position", index: startIndex });
            break;
          case "setRate": rate = msg.rate > 0 ? msg.rate : 1.0; break;
          case "feedback":
            // Phase 3 hook: tint the cursor by comparison result.
            if (osmd && osmd.cursor && osmd.cursor.cursorElement) {
              var color = msg.status === "correct" ? "#1FA55C"
                        : msg.status === "wrong" ? "#D9503F" : "#77766B";
              osmd.cursor.cursorElement.style.backgroundColor = color;
            }
            break;
        }
      } catch (e) { showError(String(e)); }
    },
  };

  post({ type: "boot" });
})();
</script>
</body>
</html>`;
}
