
import { useEffect, useRef, useState, type MouseEvent } from "react";
import "./App.css";

type WitnessEvent = {
  id: number;
  title: string;
  type: string;
  time: string;
  x: number;
  y: number;
};

const initialEvents: WitnessEvent[] = [
  { id: 1, title: "Session initialized", type: "SYSTEM", time: "00:00.000", x: 12, y: 18 },
  { id: 2, title: "Viewport established", type: "SYSTEM", time: "00:00.124", x: 32, y: 25 },
  { id: 3, title: "Interaction layer ready", type: "SYSTEM", time: "00:00.286", x: 50, y: 44 },
];

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function App() {
  const [events, setEvents] = useState<WitnessEvent[]>(initialEvents);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeEvent, setActiveEvent] = useState(0);
  const [sessionName, setSessionName] = useState("Untitled session");
  const [notice, setNotice] = useState("System ready. Awaiting interaction.");
  const [showSecret, setShowSecret] = useState(false);

  const startedAt = useRef<number | null>(null);
  const playbackTimer = useRef<number | null>(null);
  const elapsedTimer = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(4);

  useEffect(() => {
    if (!recording) return;

    elapsedTimer.current = window.setInterval(() => {
      if (startedAt.current !== null) {
        setElapsed(Date.now() - startedAt.current);
      }
    }, 50);

    return () => {
      if (elapsedTimer.current !== null) window.clearInterval(elapsedTimer.current);
    };
  }, [recording]);

  useEffect(() => {
    return () => {
      if (playbackTimer.current !== null) window.clearInterval(playbackTimer.current);
      if (elapsedTimer.current !== null) window.clearInterval(elapsedTimer.current);
    };
  }, []);

  function startRecording() {
    setEvents([]);
    nextId.current = 1;
    setElapsed(0);
    setActiveEvent(-1);
    startedAt.current = Date.now();
    setRecording(true);
    setPlaying(false);
    setNotice("Recording started. Interact with the stage.");
  }

  function stopRecording() {
    setRecording(false);
    if (startedAt.current !== null) {
      setElapsed(Date.now() - startedAt.current);
    }
    startedAt.current = null;
    setNotice("Recording stopped. Session captured locally.");
  }

  function recordAction(title: string, type: string, x: number, y: number) {
    if (!recording) {
      setNotice("Start recording to capture interactions.");
      return;
    }

    const stage = stageRef.current;
    const px = stage ? Math.round((x / stage.clientWidth) * 100) : 50;
    const py = stage ? Math.round((y / stage.clientHeight) * 100) : 50;

    const event: WitnessEvent = {
      id: nextId.current++,
      title,
      type,
      time: formatTime(Date.now() - (startedAt.current ?? Date.now())),
      x: Math.max(0, Math.min(100, px)),
      y: Math.max(0, Math.min(100, py)),
    };

    setEvents((previous) => [...previous, event]);
    setActiveEvent(event.id);
    setNotice(`Captured: ${title}`);
  }

  function handleStageClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const interactive = target.closest<HTMLElement>("[data-witness]");

    if (!interactive) return;

    const rect = stageRef.current?.getBoundingClientRect();
    const x = rect ? event.clientX - rect.left : 0;
    const y = rect ? event.clientY - rect.top : 0;

    recordAction(
      interactive.dataset.witness ?? "Interaction",
      interactive.dataset.type ?? "CLICK",
      x,
      y,
    );

    if (interactive.dataset.witness === "Open secret record") {
      setShowSecret((value) => !value);
    }
  }

  function reconstruct() {
    if (recording) stopRecording();
    if (events.length === 0) {
      setNotice("No events to reconstruct. Record a session first.");
      return;
    }

    if (playbackTimer.current !== null) window.clearInterval(playbackTimer.current);

    setPlaying(true);
    setActiveEvent(events[0].id);
    setNotice("Reconstructing recorded interaction sequence...");

    let index = 0;
    playbackTimer.current = window.setInterval(() => {
      index += 1;

      if (index >= events.length) {
        if (playbackTimer.current !== null) window.clearInterval(playbackTimer.current);
        playbackTimer.current = null;
        setPlaying(false);
        setActiveEvent(events[events.length - 1].id);
        setNotice("Reconstruction complete.");
        return;
      }

      setActiveEvent(events[index].id);
    }, 700);
  }

  function pausePlayback() {
    if (playbackTimer.current !== null) window.clearInterval(playbackTimer.current);
    playbackTimer.current = null;
    setPlaying(false);
    setNotice("Reconstruction paused.");
  }

  function clearSession() {
    if (playbackTimer.current !== null) window.clearInterval(playbackTimer.current);
    playbackTimer.current = null;
    startedAt.current = null;
    setRecording(false);
    setPlaying(false);
    setEvents([]);
    setElapsed(0);
    setActiveEvent(-1);
    setShowSecret(false);
    nextId.current = 1;
    setNotice("Session cleared. Ready for a new capture.");
  }

  const selectedEvent = events.find((event) => event.id === activeEvent);
  const pathPoints = events.map((event) => `${event.x},${event.y}`).join(" ");
  const highCount = events.filter((event) => event.type === "DISCOVERY").length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Witness home">
          <span className="brand-mark"><span /></span>
          <span>WITNESS<span className="brand-period">.</span></span>
        </a>

        <div className="side-label">WORKSPACE</div>
        <button className="nav-item active" onClick={() => setNotice("Current workspace selected.")}>
          <span className="nav-icon">◈</span> Session lab
          <span className="nav-count">01</span>
        </button>
        <button className="nav-item" onClick={() => setNotice("Local archive — no saved sessions yet.")}>
          <span className="nav-icon">▤</span> Archive
        </button>
        <button className="nav-item" onClick={() => setNotice("Settings are coming in a future version.")}>
          <span className="nav-icon">⌘</span> Settings
        </button>

        <div className="sidebar-bottom">
          <div className="local-card">
            <div className="local-indicator"><span /> LOCAL ENVIRONMENT</div>
            <p>Your sessions stay on this device.</p>
            <div className="local-footer"><span>NO CLOUD SYNC</span><span>● SECURE</span></div>
          </div>
          <div className="profile-row">
            <div className="avatar">W</div>
            <div><strong>Local operator</strong><span>Personal workspace</span></div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <section className="main-content" id="top">
        <header className="topbar">
          <div className="breadcrumbs"><span>WORKSPACE</span><span className="crumb-slash">/</span> SESSION LAB</div>
          <div className="topbar-right">
            <span className="privacy-tag"><span /> LOCAL ONLY</span>
            <span className="version-tag">BUILD 0.1.0</span>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> BROWSER FORENSICS / 001</div>
              <h1>Session <span>reconstruction.</span></h1>
              <p className="page-subtitle">Capture the sequence. Reconstruct the evidence.</p>
            </div>
            <div className="session-title">
              <span>SESSION NAME</span>
              <input
                aria-label="Session name"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                maxLength={48}
              />
              <span className="edit-mark">↗</span>
            </div>
          </section>

          <section className="metrics-grid">
            <article className="metric-card">
              <div className="metric-label">CAPTURED EVENTS <span>↗</span></div>
              <div className="metric-value">{String(events.length).padStart(2, "0")}<small> events</small></div>
              <div className="metric-foot"><span className="metric-dot lime" /> {recording ? "LIVE CAPTURE" : "SESSION EVENTS"}</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">SESSION DURATION <span>◷</span></div>
              <div className="metric-value mono">{formatTime(elapsed)}</div>
              <div className="metric-foot"><span className="metric-dot" /> ELAPSED TIME</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">DISCOVERIES <span>⌖</span></div>
              <div className="metric-value">{String(highCount).padStart(2, "0")}<small> flagged</small></div>
              <div className="metric-foot"><span className="metric-dot violet" /> MANUAL INTERACTIONS</div>
            </article>
            <article className="metric-card status-metric">
              <div className="metric-label">ENGINE STATUS <span>◉</span></div>
              <div className="engine-status"><span className={recording ? "pulse" : ""} />{recording ? "RECORDING" : playing ? "RECONSTRUCTING" : "STANDBY"}</div>
              <div className="metric-foot">WITNESS CORE / ACTIVE</div>
            </article>
          </section>

          <section className="lab-grid">
            <article className="panel reconstruction-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">01 / VISUAL TRACE</div>
                  <h2>Reconstruction stage</h2>
                </div>
                <span className={`state-pill ${recording ? "recording-pill" : ""}`}><span />{recording ? "CAPTURING" : playing ? "REPLAYING" : "STANDBY"}</span>
              </div>

              <div className="stage" ref={stageRef} onClick={handleStageClick}>
                <div className="stage-grid" />
                <div className="stage-coordinates"><span>Y: 000</span><span>X: 000</span></div>
                <div className="stage-watermark">W / TRACE MAP</div>

                <svg className="trace-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Recorded interaction path">
                  {events.length > 1 && <polyline className="trace-line" points={pathPoints} />}
                  {events.map((event) => (
                    <circle
                      key={event.id}
                      className={`trace-point ${event.id === activeEvent ? "selected-point" : ""}`}
                      cx={event.x}
                      cy={event.y}
                      r={event.id === activeEvent ? 1.7 : 0.9}
                    />
                  ))}
                </svg>

                {selectedEvent && (
                  <div
                    className="trace-tooltip"
                    style={{
                      left: `${Math.min(74, Math.max(2, selectedEvent.x))}%`,
                      top: `${Math.min(83, Math.max(10, selectedEvent.y))}%`,
                    }}
                  >
                    <span>EVENT #{String(selectedEvent.id).padStart(3, "0")}</span>
                    <strong>{selectedEvent.title}</strong>
                  </div>
                )}

                <div className="stage-center">
                  <div className="target-ring"><div className="target-core" /></div>
                  <span>INTERACTION CANVAS</span>
                  <small>{recording ? "CAPTURE IN PROGRESS" : playing ? "REPLAYING SEQUENCE" : "AWAITING INPUT"}</small>
                </div>

                <div className="stage-actions">
                  <button data-witness="Primary action clicked" data-type="CLICK" className="demo-primary">Execute action <span>↗</span></button>
                  <button data-witness="Secondary action clicked" data-type="CLICK" className="demo-secondary">Inspect target</button>
                  <button data-witness="Open secret record" data-type="DISCOVERY" className="demo-secondary secret-button">Toggle hidden record</button>
                </div>

                {showSecret && (
                  <div className="secret-record">
                    <span>RECORD FOUND / 004</span>
                    <strong>Hidden record revealed.</strong>
                    <p>This demo interaction was captured in the local session.</p>
                  </div>
                )}

                <div className="stage-footer"><span>VIEWPORT / 1280 × 720</span><span>TRACE MODE / 2D</span></div>
              </div>

              <div className="reconstruction-controls">
                <button className="control-button primary-control" onClick={recording ? stopRecording : startRecording} disabled={playing}>
                  <span className={recording ? "stop-square" : "record-dot"} />{recording ? "STOP RECORDING" : "START RECORDING"}
                </button>
                <button className="control-button replay-control" onClick={playing ? pausePlayback : reconstruct} disabled={recording || events.length === 0}>
                  <span>{playing ? "Ⅱ" : "▶"}</span>{playing ? "PAUSE REPLAY" : "RECONSTRUCT"}
                </button>
                <button className="control-button clear-control" onClick={clearSession}>↺ <span>CLEAR</span></button>
              </div>
              <div className="stage-caption"><span className="caption-dot" /> {notice}</div>
            </article>

            <article className="panel timeline-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">02 / EVENT INTELLIGENCE</div>
                  <h2>Interaction log <span className="heading-count">{events.length}</span></h2>
                </div>
                <button className="icon-button" aria-label="Clear session" onClick={clearSession}>↻</button>
              </div>

              <div className="timeline-summary">
                <div><span>EVENT STREAM</span><strong>{recording ? "LIVE" : "LOCAL BUFFER"}</strong></div>
                <div><span>ORDER</span><strong>CHRONOLOGICAL ↓</strong></div>
              </div>

              <div className="event-list">
                {events.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">⌁</div>
                    <strong>No events captured</strong>
                    <p>Start recording, then interact with the reconstruction stage.</p>
                  </div>
                ) : (
                  events.map((event, index) => (
                    <button
                      key={event.id}
                      className={`event-row ${activeEvent === event.id ? "event-active" : ""}`}
                      onClick={() => {
                        setActiveEvent(event.id);
                        setPlaying(false);
                        if (playbackTimer.current !== null) window.clearInterval(playbackTimer.current);
                        playbackTimer.current = null;
                        setNotice(`Selected event #${event.id}: ${event.title}`);
                      }}
                    >
                      <span className={`event-index ${event.type === "DISCOVERY" ? "discovery-index" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                      <span className="event-details">
                        <strong>{event.title}</strong>
                        <span>{event.type} <i>·</i> X:{event.x} Y:{event.y}</span>
                      </span>
                      <span className="event-time">{event.time}</span>
                      <span className="event-arrow">↗</span>
                    </button>
                  ))
                )}
              </div>

              <div className="timeline-footer">
                <div className="buffer-info"><span className="buffer-dot" /><span>LOCAL EVENT BUFFER</span></div>
                <span>{events.length} / ∞</span>
              </div>
            </article>
          </section>

          <footer className="page-footer">
            <span>WITNESS <i>©</i> 2026 — SESSION RECONSTRUCTION LAB</span>
            <span><span className="footer-status" /> ALL PROCESSING LOCAL <span className="footer-divider">/</span> NO TELEMETRY</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default App;
