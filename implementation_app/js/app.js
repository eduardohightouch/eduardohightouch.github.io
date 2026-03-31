/* ══════════════════════════════════════════════════════════════
   Hightouch Implementation Guide — Web App
   v2: Google Sheets backend via Apps Script API
   ══════════════════════════════════════════════════════════════ */
const { useState, useMemo, useEffect, useCallback } = React;

// ┌─────────────────────────────────────────────────────────────┐
// │ CONFIGURATION — paste your Apps Script deployment URL here  │
// └─────────────────────────────────────────────────────────────┘
const API_URL = "https://script.google.com/macros/s/AKfycbyOPHirWX00nfmU5psbwRjGlLWVv41IbkSc6L0LnuhcvVpqvrilA8u6WylHEzooCYwV0w/exec";


// ── API Helper ──
// All calls go through GET for Apps Script CORS reliability.
// Write actions encode their JSON payload in the ?data= param.
async function api(action, params) {
  var url = API_URL + "?action=" + action;
  if (params) {
    if (typeof params === "string") {
      url += "&key=" + encodeURIComponent(params);
    } else {
      url += "&data=" + encodeURIComponent(JSON.stringify(params));
    }
  }
  var res = await fetch(url);
  var json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}


// ── Constants ──
const PHASES = [
  { id: "readiness", label: "Readiness", icon: "🔍", color: "var(--ht-green3)", bg: "var(--ht-green1)", timeline: "1–4 weeks" },
  { id: "integration", label: "Integration", icon: "⚙️", color: "var(--ht-blue3)", bg: "var(--ht-blue1)", timeline: "1–5 weeks" },
  { id: "activation", label: "Activation", icon: "🚀", color: "var(--ht-purple-accent)", bg: "var(--ht-purple1)", timeline: "2–5 weeks" },
];

const PRODUCT_META = {
  "Events": { icon: "⚡", desc: "Collect and activate events in real time and batch" },
  "IDR": { icon: "🔗", desc: "Build unified customer profiles from fragmented data", children: ["pIDR"] },
  "pIDR": { icon: "🔗", desc: "Probabilistic identity resolution (add-on to IDR)", parent: "IDR" },
  "PAPI": { icon: "🎯", desc: "Serve real-time personalized data via API" },
  "Customer Studio": { icon: "🎨", desc: "Build audiences and sync them to destinations" },
  "Match Booster": { icon: "📈", desc: "Amplify match rates with enriched identifiers" },
  "Journeys": { icon: "🗺️", desc: "Orchestrate multi-touch cross-channel campaigns" },
};

const STATUS_OPTIONS = [
  { v: "not_started", l: "Not started", c: "var(--ht-gray3)", bg: "var(--ht-gray1)" },
  { v: "to_start", l: "To start", c: "var(--ht-blue3)", bg: "var(--ht-blue1)" },
  { v: "scheduled", l: "Scheduled", c: "var(--ht-purple-accent)", bg: "var(--ht-purple1)" },
  { v: "in_progress", l: "In progress", c: "var(--ht-amber)", bg: "var(--ht-amber-bg)" },
  { v: "complete", l: "Complete", c: "var(--ht-green3)", bg: "var(--ht-green1)" },
  { v: "blocked", l: "Blocked", c: "var(--ht-red)", bg: "var(--ht-red-bg)" },
  { v: "out_of_scope", l: "Out of scope", c: "var(--ht-gray3)", bg: "var(--ht-gray1)" },
];
const getS = v => STATUS_OPTIONS.find(s => s.v === v) || STATUS_OPTIONS[0];

function phLabel(phaseId) { var p = PHASES.find(x => x.id === phaseId); return p ? p.icon + " " + p.label : phaseId; }
function prodLabel(prodId) { if (!prodId || prodId === "Core") return "Core"; var m = PRODUCT_META[prodId]; return m ? m.icon + " " + prodId : prodId; }

// ── Date normalisation ──
// Converts whatever format Google Sheets returns into YYYY-MM-DD for <input type="date">.
// Handles: YYYY-MM-DD (pass-through), M/D/YYYY, MM/DD/YYYY, and Sheets serial numbers.
function parseToISO(val) {
  if (!val && val !== 0) return "";
  // ISO datetime string (e.g. "2026-03-31T07:00:00.000Z") — extract date portion directly
  // from the string to avoid timezone conversion shifting the day
  if (typeof val === "string" && val.indexOf("T") !== -1) {
    val = val.split("T")[0];
  }
  // Already YYYY-MM-DD (including the result of the split above)
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // M/D/YYYY or MM/DD/YYYY
  if (typeof val === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
    var parts = val.split("/");
    return parts[2] + "-" + parts[0].padStart(2, "0") + "-" + parts[1].padStart(2, "0");
  }
  // Google Sheets serial number (integer days since Dec 30, 1899)
  if (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val))) {
    var serial = Number(val);
    if (serial > 59) serial -= 1; // Sheets incorrectly treats 1900 as a leap year
    var date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return date.toISOString().slice(0, 10);
  }
  return "";
}
function normalizeTaskDates(task) {
  return Object.assign({}, task, {
    target_date: parseToISO(task.target_date),
    completed_date: parseToISO(task.completed_date),
  });
}


// ── Loading Spinner ──
function Spinner({ text }) {
  return React.createElement("div", { className: "empty-state fade-in", style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12 } },
    React.createElement("div", { style: { width: 28, height: 28, border: "3px solid var(--ht-gray2)", borderTopColor: "var(--ht-green3)", borderRadius: "50%", animation: "spin 0.8s linear infinite" } }),
    React.createElement("div", null, text || "Loading...")
  );
}


// ── Overview Intelligence ──
function computeOverview(tasks) {
  var total = tasks.length;
  var done = tasks.filter(function(t) { return t.status === "complete"; }).length;
  var inProg = tasks.filter(function(t) { return t.status === "in_progress"; }).length;
  var blocked = tasks.filter(function(t) { return t.status === "blocked"; }).length;
  var pct = total ? Math.round(done / total * 100) : 0;
  var phaseProgress = PHASES.map(function(ph) {
    var pt = tasks.filter(function(t) { return t.phase === ph.id; });
    var pd = pt.filter(function(t) { return t.status === "complete" || t.status === "out_of_scope"; }).length;
    return Object.assign({}, ph, { total: pt.length, done: pd, pct: pt.length ? Math.round(pd / pt.length * 100) : 0 });
  });
  var activePhase = phaseProgress.find(function(p) { return p.pct < 100; }) || phaseProgress[phaseProgress.length - 1];
  return {
    total: total, done: done, inProg: inProg, blocked: blocked, pct: pct,
    phaseProgress: phaseProgress, activePhase: activePhase,
    nextUp: tasks.filter(function(t) { return t.status !== "complete" && t.status !== "out_of_scope" && (Number(t.is_optional) !== 1); }).slice(0, 3),
    wip: tasks.filter(function(t) { return t.status === "in_progress"; }).slice(0, 3),
    blockedItems: tasks.filter(function(t) { return t.status === "blocked"; }).slice(0, 3),
    workshops: tasks.filter(function(t) { return Number(t.is_workshop) === 1 && t.status !== "complete" && t.status !== "out_of_scope"; }).slice(0, 3),
    recentlyDone: tasks.filter(function(t) { return t.status === "complete"; }).slice(-3).reverse(),
    allDone: pct === 100,
  };
}


// ── Components ──

function StatusBadge({ status, onChange, editable }) {
  var s = getS(status);
  if (!editable) return <span className="badge" style={{ background: s.bg, color: s.c }}>{s.l}</span>;
  return <select className="status-select" value={status} onChange={function(e) { onChange(e.target.value); }} style={{ background: s.bg, color: s.c }}>
    {STATUS_OPTIONS.map(function(o) { return <option key={o.v} value={o.v}>{o.l}</option>; })}
  </select>;
}

function OverviewPanel({ tasks }) {
  var o = useMemo(function() { return computeOverview(tasks); }, [tasks]);

  if (o.allDone) return <div className="banner-complete fade-in">
    <div style={{ fontSize: 32, marginBottom: 6 }}>🎉</div>
    <div className="fw-800 text-2xl" style={{ color: "#166534" }}>Implementation Complete!</div>
    <div className="text-md mt-4" style={{ color: "var(--ht-green3)" }}>All {o.total} tasks are done. Time to transition to ongoing support.</div>
  </div>;

  var hasBl = o.blockedItems.length > 0;
  var hasWs = o.workshops.length > 0;
  var showBottom = hasBl || hasWs;

  return <div className="overview fade-in">
    <div className="overview__header">
      <div className="flex flex--center flex--between mb-8">
        <div className="fw-700 text-lg text-main">Implementation Overview</div>
        <div className="flex gap-12 text-sm text-mid">
          <span><strong className="text-green">{o.done}</strong> done</span>
          <span><strong style={{ color: "var(--ht-amber)" }}>{o.inProg}</strong> in progress</span>
          {o.blocked > 0 && <span><strong style={{ color: "var(--ht-red)" }}>{o.blocked}</strong> blocked</span>}
        </div>
      </div>
      <div className="progress">
        {o.done > 0 && <div className="progress__fill progress__fill--green" style={{ width: (o.done / o.total * 100) + "%" }} />}
        {o.inProg > 0 && <div className="progress__fill progress__fill--amber" style={{ width: (o.inProg / o.total * 100) + "%" }} />}
        {o.blocked > 0 && <div className="progress__fill progress__fill--red" style={{ width: (o.blocked / o.total * 100) + "%" }} />}
      </div>
      <div className="phase-pills">
        {o.phaseProgress.filter(function(p) { return p.total > 0; }).map(function(p) {
          return <div key={p.id} className={"phase-pill" + (p.pct === 100 ? " phase-pill--done" : "") + (p.id === o.activePhase.id ? " phase-pill--active" : "")}
            style={p.id === o.activePhase.id ? { borderColor: p.color, background: p.bg } : {}}>
            <div className="flex flex--between flex--center">
              <span className="text-sm fw-600" style={{ color: p.pct === 100 ? "#166534" : "var(--ht-text)" }}>{p.icon} {p.label}</span>
              <span className="text-xs fw-700" style={{ color: p.pct === 100 ? "var(--ht-green3)" : p.color }}>{p.pct}%</span>
            </div>
            <div className="progress progress--small mt-4" style={{ background: "var(--ht-gray2)" }}>
              <div className="progress__fill" style={{ background: p.pct === 100 ? "var(--ht-green3)" : p.color, width: p.pct + "%", borderRadius: 2 }} />
            </div>
          </div>;
        })}
      </div>
    </div>
    <div className="overview__grid">
      <div className={"overview__cell overview__cell--border-r" + (showBottom ? " overview__cell--border-b" : "")}>
        <div className="overview__label overview__label--green">⏭️ Next Up</div>
        {o.nextUp.length === 0 ? <div className="text-sm text-light">Nothing pending!</div> :
        o.nextUp.map(function(t, i) { return <div key={t.task_id || i} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.nextUp.length - 1 ? 8 : 0 }}>
          <div className={"num-circle " + (i === 0 ? "num-circle--primary" : "num-circle--muted")}>{i + 1}</div>
          <div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}{t.product && t.product !== "Core" ? " · " + prodLabel(t.product) : ""}{t.recommended_team ? " · " + t.recommended_team : ""}</div></div>
        </div>; })}
      </div>
      <div className={"overview__cell" + (showBottom ? " overview__cell--border-b" : "")}>
        <div className="overview__label overview__label--amber">🔄 In Progress</div>
        {o.wip.length === 0 ? <div className="text-sm text-light">No tasks currently in progress.</div> :
        o.wip.map(function(t, i) { return <div key={t.task_id || i} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.wip.length - 1 ? 8 : 0 }}>
          <div className="dot dot--amber" /><div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}{t.owner ? " · " + t.owner : ""}</div></div>
        </div>; })}
      </div>
      {hasBl && <div className="overview__cell overview__cell--border-r">
        <div className="overview__label overview__label--red">🚨 Blocked</div>
        {o.blockedItems.map(function(t, i) { return <div key={t.task_id || i} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.blockedItems.length - 1 ? 8 : 0 }}>
          <div className="dot dot--red" /><div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{t.owner ? t.owner + " · " : ""}{phLabel(t.phase)}</div></div>
        </div>; })}
      </div>}
      {hasWs && <div className={"overview__cell" + (!hasBl ? " overview__cell--border-r" : "")}>
        <div className="overview__label overview__label--purple">🎓 Upcoming Workshops</div>
        {o.workshops.map(function(t, i) { return <div key={t.task_id || i} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.workshops.length - 1 ? 8 : 0 }}>
          <div className="dot dot--purple" /><div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}{t.product && t.product !== "Core" ? " · " + prodLabel(t.product) : ""}</div></div>
        </div>; })}
      </div>}
      {o.recentlyDone.length > 0 && !hasBl && !hasWs && <div className="overview__cell overview__cell--border-r overview__cell--border-t">
        <div className="overview__label overview__label--green">✅ Recently Completed</div>
        {o.recentlyDone.map(function(t, i) { return <div key={t.task_id || i} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.recentlyDone.length - 1 ? 8 : 0 }}>
          <div className="dot dot--green-light" /><div><div className="text-md fw-500 text-light text-strike">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}</div></div>
        </div>; })}
      </div>}
    </div>
  </div>;
}

function TaskRow({ task, onUpdate, editable }) {
  var [exp, setExp] = useState(false);
  var [saving, setSaving] = useState(false);
  var isOpt = Number(task.is_optional) === 1;
  var isWs = Number(task.is_workshop) === 1;

  var handleUpdate = function(field, value) {
    setSaving(true);
    var updates = { task_id: task.task_id };
    updates[field] = value;
    var localMerge = Object.assign({}, updates);
    if (field === "status") {
      if (value === "complete" && !task.completed_date) {
        localMerge.completed_date = new Date().toISOString().slice(0, 10);
      } else if (value !== "complete") {
        localMerge.completed_date = "";
      }
    }
    api("updateTask", updates).then(function() {
      onUpdate(Object.assign({}, task, localMerge));
    }).catch(function(err) {
      alert("Failed to save: " + err.message);
    }).finally(function() {
      setSaving(false);
    });
  };

  return <div className="task-row__border" style={{ opacity: saving ? 0.6 : 1, transition: "opacity .2s" }}>
    <div className="task-row">
      <div>
        <div className="fw-500 text-main flex flex--center gap-4 flex--wrap">
          {isOpt && <span className="badge--small badge--optional">OPTIONAL</span>}
          {isWs && <span className="badge--small badge--workshop">WORKSHOP</span>}
          {task.task}
        </div>
        <div className="text-xs text-light mt-2" style={{ lineHeight: 1.3 }}>{task.description}</div>
      </div>
      <div className="text-xs text-mid">{task.resource_label && (task.resource_url ? <a href={task.resource_url} target="_blank" rel="noreferrer" className="link">{task.resource_label}</a> : <span>{task.resource_label}</span>)}</div>
      <input placeholder="Owner" defaultValue={task.owner || ""} disabled={!editable} onBlur={function(e) { if (e.target.value !== (task.owner || "")) handleUpdate("owner", e.target.value); }} className={"input--small" + (!editable ? " input--disabled" : "")} />
      <input type="date" value={task.target_date || ""} disabled={!editable} onChange={function(e) { handleUpdate("target_date", e.target.value); }} className={"input--date" + (!editable ? " input--disabled" : "")} />
      <input type="date" value={task.completed_date || ""} disabled={!editable} onChange={function(e) { handleUpdate("completed_date", e.target.value); }} className={"input--date" + (!editable ? " input--disabled" : "")} />
      <StatusBadge status={task.status || "not_started"} editable={editable} onChange={function(v) { handleUpdate("status", v); }} />
      <button onClick={function() { setExp(!exp); }} className={"task-row__expand" + (exp ? " task-row__expand--open" : "")}>▶</button>
    </div>
    {exp && <div className="task-detail">
      <div style={{ flex: 1, minWidth: 160 }}>
        <label className="task-detail__label">Notes</label>
        <textarea placeholder="Add notes..." defaultValue={task.notes || ""} disabled={!editable} onBlur={function(e) { if (e.target.value !== (task.notes || "")) handleUpdate("notes", e.target.value); }} rows={2}
          style={{ width: "100%", border: "1px solid var(--ht-gray2)", borderRadius: 6, padding: "4px 6px", fontSize: 12, resize: "vertical", background: editable ? "#fff" : "var(--ht-gray1)", boxSizing: "border-box" }} />
      </div>
      <div style={{ minWidth: 100 }}>
        <label className="task-detail__label">Recommended team</label>
        <div className="text-sm text-mid mt-2">{task.recommended_team || "—"}</div>
      </div>
    </div>}
  </div>;
}

function PhaseSection({ phase, tasks, onUpdate, editable }) {
  var [collapsed, setCollapsed] = useState(false);
  var ph = PHASES.find(function(p) { return p.id === phase; });
  var done = tasks.filter(function(t) { return t.status === "complete"; }).length;
  var coreTasks = tasks.filter(function(t) { return String(t.product) === "Core"; });
  var productNames = [];
  tasks.forEach(function(t) { var p = String(t.product || ""); if (p && p !== "Core" && p !== "pIDR" && productNames.indexOf(p) === -1) productNames.push(p); });
  var prodGroups = productNames.map(function(name) {
    var items = tasks.filter(function(t) { return String(t.product) === name; });
    if (name === "IDR") {
      var pidrTasks = tasks.filter(function(t) { return String(t.product) === "pIDR"; });
      if (pidrTasks.length > 0) {
        var insertIdx = items.findIndex(function(t) { return t.task === "Identity Resolution workshop"; });
        var after = insertIdx >= 0 ? insertIdx + 1 : items.length;
        items = items.slice(0, after).concat(pidrTasks).concat(items.slice(after));
      }
    }
    return { name: name, items: items };
  });

  return <div className="phase">
    <div className={"phase__header" + (collapsed ? " phase__header--collapsed" : "")} onClick={function() { setCollapsed(!collapsed); }} style={{ background: ph.bg }}>
      <span className={"phase__arrow" + (!collapsed ? " phase__arrow--open" : "")} style={{ color: ph.color }}>▶</span>
      <span style={{ fontSize: 18 }}>{ph.icon}</span>
      <div style={{ flex: 1 }}><span className="fw-700 text-lg text-main">{ph.label}</span><span className="text-sm text-mid ml-8">{ph.timeline}</span></div>
      <span className="text-sm text-mid fw-500">{done}/{tasks.length} done</span>
    </div>
    {!collapsed && <div>
      <div className="task-grid"><span>Task</span><span>Resource</span><span>Owner</span><span>Target date</span><span>Completed date</span><span>Status</span><span /></div>
      {phase !== "activation" && coreTasks.map(function(t) { return <TaskRow key={t.task_id} task={t} onUpdate={onUpdate} editable={editable} />; })}
      {prodGroups.map(function(g) { return <div key={g.name}>
        <div className="product-group-header">
          <span>{(PRODUCT_META[g.name] || {}).icon || "📦"}</span> {g.name}
          <span className="text-xxs text-light fw-400 ml-4">{g.items.filter(function(x) { return x.status === "complete"; }).length}/{g.items.length}</span>
        </div>
        {g.items.map(function(t) { return <TaskRow key={t.task_id} task={t} onUpdate={onUpdate} editable={editable} />; })}
      </div>; })}
      {phase === "activation" && coreTasks.map(function(t) { return <TaskRow key={t.task_id} task={t} onUpdate={onUpdate} editable={editable} />; })}
    </div>}
  </div>;
}

function ProductSelector({ products, selected, onToggle }) {
  return <div className="product-grid">
    {products.filter(function(p) { return !(PRODUCT_META[p.id] || {}).parent; }).map(function(pr) {
      var on = selected.has(pr.id);
      var meta = PRODUCT_META[pr.id] || {};
      var children = meta.children || [];
      return <div key={pr.id}>
        <div onClick={function() { onToggle(pr.id); }} className={"product-card" + (on ? " product-card--selected" : "")}>
          <div className="flex flex--center flex--between mb-4">
            <span style={{ fontSize: 20 }}>{meta.icon || "📦"}</span>
            <div className={"product-card__check" + (on ? " product-card__check--on" : "")}>
              {on && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
          </div>
          <div className="fw-700 text-md text-main">{pr.id}</div>
          <div className="text-xs text-mid mt-2" style={{ lineHeight: 1.3 }}>{meta.desc || ""}</div>
          <div className="text-xxs text-light mt-4">{pr.count} steps</div>
        </div>
        {on && children.length > 0 && children.map(function(childId) {
          var childProd = products.find(function(p) { return p.id === childId; });
          if (!childProd) return null;
          var childOn = selected.has(childId);
          var childMeta = PRODUCT_META[childId] || {};
          return <div key={childId} onClick={function() { onToggle(childId); }} style={{ marginTop: 4, marginLeft: 16, padding: "8px 12px", border: "1.5px solid " + (childOn ? "var(--ht-green3)" : "var(--ht-gray2)"), borderRadius: 8, cursor: "pointer", background: childOn ? "var(--ht-green1)" : "#fff", display: "flex", alignItems: "center", gap: 8, transition: ".15s" }}>
            <div className={"product-card__check" + (childOn ? " product-card__check--on" : "")} style={{ width: 16, height: 16, borderRadius: 4 }}>
              {childOn && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <div><div className="text-sm fw-600 text-main">{childId}</div><div className="text-xxs text-mid">{childMeta.desc || ""} ({childProd.count} steps)</div></div>
          </div>;
        })}
      </div>;
    })}
  </div>;
}


// ── Main App ──
var LIST = "list", DETAIL = "detail", CREATE = "create";

function App() {
  var [view, setView] = useState(LIST);
  var [projects, setProjects] = useState([]);
  var [activeProject, setActiveProject] = useState(null);
  var [activeTasks, setActiveTasks] = useState([]);
  var [isAdmin, setIsAdmin] = useState(true);
  var [newName, setNewName] = useState("");
  var [htOwner, setHtOwner] = useState("");
  var [clientLead, setClientLead] = useState("");
  var [selProducts, setSelProducts] = useState(new Set());
  var [keyInput, setKeyInput] = useState("");
  var [templateProducts, setTemplateProducts] = useState([]);
  var [templateCoreCount, setTemplateCoreCount] = useState(0);
  var [loading, setLoading] = useState(false);
  var [loadingMsg, setLoadingMsg] = useState("");
  var [error, setError] = useState(null);

  // Load project list on mount
  useEffect(function() {
    setLoading(true);
    setLoadingMsg("Loading projects...");
    api("listProjects").then(function(data) {
      setProjects(data.projects || []);
    }).catch(function(err) {
      setError("Failed to load projects: " + err.message);
    }).finally(function() {
      setLoading(false);
    });
  }, []);

  // Load template when entering create mode
  var loadTemplate = function() {
    setLoading(true);
    setLoadingMsg("Loading template registry...");
    api("getTemplate").then(function(data) {
      setTemplateProducts(data.products || []);
      setTemplateCoreCount(data.coreCount || 0);
      setView(CREATE);
    }).catch(function(err) {
      alert("Failed to load template: " + err.message);
    }).finally(function() {
      setLoading(false);
    });
  };

  var toggleProd = function(id) {
    setSelProducts(function(prev) {
      var n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        // If parent is deselected, remove children too
        var meta = PRODUCT_META[id] || {};
        (meta.children || []).forEach(function(c) { n.delete(c); });
      } else {
        n.add(id);
        // If child is selected, ensure parent is too
        var cm = PRODUCT_META[id] || {};
        if (cm.parent && !n.has(cm.parent)) n.add(cm.parent);
      }
      return n;
    });
  };

  var selectedStepCount = useMemo(function() {
    var count = templateCoreCount;
    templateProducts.forEach(function(p) {
      if (selProducts.has(p.id)) count += p.count;
    });
    return count;
  }, [selProducts, templateProducts, templateCoreCount]);

  var createProject = function() {
    if (!newName.trim()) return;
    setLoading(true);
    setLoadingMsg("Creating project...");
    api("createProject", {
      client_name: newName.trim(),
      products: Array.from(selProducts),
      ht_owner: htOwner.trim(),
      client_cdp_lead: clientLead.trim()
    }).then(function(data) {
      alert("Project created!\n\nShare key: " + data.share_key + "\nTasks: " + data.task_count + "\n\nShare this key with the client.");
      // Reload project list
      return api("listProjects");
    }).then(function(data) {
      setProjects(data.projects || []);
      setView(LIST);
      setNewName(""); setHtOwner(""); setClientLead("");
      setSelProducts(new Set());
    }).catch(function(err) {
      alert("Failed to create project: " + err.message);
    }).finally(function() {
      setLoading(false);
    });
  };

  var openProject = function(shareKey, admin) {
    setLoading(true);
    setLoadingMsg("Loading project plan...");
    setError(null);
    api("getProject", shareKey).then(function(data) {
      setActiveProject(data.project);
      setActiveTasks((data.tasks || []).map(normalizeTaskDates));
      setIsAdmin(admin);
      setView(DETAIL);
    }).catch(function(err) {
      if (admin) {
        setError("Failed to load project: " + err.message);
      } else {
        alert("Project not found. Check the share key and try again.");
      }
    }).finally(function() {
      setLoading(false);
    });
  };

  var handleTaskUpdate = function(updatedTask) {
    setActiveTasks(function(prev) {
      return prev.map(function(t) { return t.task_id === updatedTask.task_id ? updatedTask : t; });
    });
  };

  var accessByKey = function() {
    if (!keyInput.trim()) return;
    openProject(keyInput.trim(), false);
    setKeyInput("");
  };

  // ── HOME / CREATE VIEW ──
  if (view === LIST || view === CREATE) return <div className="page-wrap">
    <div className="container">
      <div className="header">
        <div className="header__logo">H</div>
        <div><div className="header__title">Hightouch Implementation</div><div className="header__sub">Client Onboarding Project Plans</div></div>
      </div>

      {/* Client access */}
      <div className="card">
        <div className="card__title">Client Access</div>
        <div className="flex gap-8">
          <input className="input" placeholder="Enter share key (e.g. acme-a1b2)" value={keyInput} onChange={function(e) { setKeyInput(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") accessByKey(); }} />
          <button className="btn btn--primary" onClick={accessByKey}>Open Plan</button>
        </div>
      </div>

      {/* Admin section */}
      <div className="flex flex--between flex--center mb-14">
        <div className="text-xl fw-700 text-main">All Projects (Admin)</div>
        <button className="btn btn--primary" onClick={loadTemplate}>+ New Project</button>
      </div>

      {error && <div style={{ padding: "12px 16px", background: "var(--ht-red-bg)", borderRadius: 8, color: "var(--ht-red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Create form */}
      {view === CREATE && <div className="card mb-18 fade-in" style={{ padding: 20 }}>
        <div className="text-xl fw-700 text-main mb-4">Create New Client Project</div>
        <div className="text-sm text-light mb-14">{templateCoreCount} core steps are always included. Select which product modules apply to this client.</div>

        <div className="flex gap-8 mb-14">
          <input className="input" placeholder="Client name (e.g. Acme Corp)" value={newName} onChange={function(e) { setNewName(e.target.value); }} style={{ flex: 2, fontSize: 14 }} />
        </div>
        <div className="flex gap-8 mb-14">
          <input className="input" placeholder="Hightouch owner (e.g. Sarah Chen)" value={htOwner} onChange={function(e) { setHtOwner(e.target.value); }} style={{ flex: 1 }} />
          <input className="input" placeholder="Client CDP lead (e.g. Mike Johnson)" value={clientLead} onChange={function(e) { setClientLead(e.target.value); }} style={{ flex: 1 }} />
        </div>

        <div className="text-md fw-600 text-main mb-8">Product modules for this client:</div>
        <ProductSelector products={templateProducts} selected={selProducts} onToggle={toggleProd} />

        <div className="summary-chip">
          This project will include <strong className="text-main">{selectedStepCount} total steps</strong>: {templateCoreCount} core + {selectedStepCount - templateCoreCount} from {selProducts.size} module{selProducts.size !== 1 ? "s" : ""}.
        </div>

        <div className="flex gap-8 flex--end mt-14">
          <button className="btn btn--secondary" onClick={function() { setView(LIST); setNewName(""); setHtOwner(""); setClientLead(""); setSelProducts(new Set()); }}>Cancel</button>
          <button className={"btn " + (newName.trim() ? "btn--primary" : "btn--disabled")} onClick={createProject} disabled={!newName.trim()}>Create Project</button>
        </div>
      </div>}

      {/* Loading state */}
      {loading && <Spinner text={loadingMsg} />}

      {/* Project list */}
      {!loading && projects.length === 0 && view === LIST && <div className="empty-state">No projects yet. Create your first one above.</div>}
      {!loading && projects.map(function(p) {
        return <div key={p.project_id} className="project-card">
          <div className="flex flex--center gap-14 flex--1" style={{ cursor: "pointer" }} onClick={function() { openProject(p.share_key, true); }}>
            <div className="project-card__avatar">{(p.client_name || "?").charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fw-700 text-md text-main">{p.client_name}</div>
              <div className="flex gap-4 flex--wrap mt-3">
                {(p.products || "").split(",").filter(Boolean).map(function(pid) {
                  return <span key={pid} className="badge--small badge--product">{(PRODUCT_META[pid] || {}).icon || "📦"} {pid}</span>;
                })}
                {(!p.products || p.products === "") && <span className="text-xxs text-light">Core only</span>}
              </div>
              <div className="text-xs text-light mt-2">
                Share key: <code>{p.share_key}</code>
                {p.ht_owner && <span> · {p.ht_owner}</span>}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="text-2xl fw-800" style={{ color: p.pct === 100 ? "var(--ht-green3)" : "var(--ht-blue3)" }}>{p.pct}%</div>
            <div className="text-xs text-light">{p.tasks_complete}/{p.task_count}</div>
          </div>
        </div>;
      })}
    </div>
  </div>;

  // ── DETAIL VIEW ──
  if (loading) return <div className="page-wrap"><div className="container--wide"><Spinner text={loadingMsg} /></div></div>;
  if (!activeProject) return null;

  var editable = isAdmin;
  var phaseGroups = PHASES.map(function(ph) {
    return { phase: ph.id, tasks: activeTasks.filter(function(t) { return t.phase === ph.id; }) };
  }).filter(function(g) { return g.tasks.length > 0; });

  return <div className="page-wrap">
    <div className="container--wide">
      <div className="flex flex--center gap-10 mb-20 flex--wrap">
        <button className="btn--back" onClick={function() { setView(LIST); setActiveProject(null); setActiveTasks([]); }}>← Back</button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="text-3xl fw-800 text-main">{activeProject.client_name}</div>
          <div className="text-xs text-light flex gap-6 flex--center flex--wrap">
            <span>{isAdmin ? "Admin View" : "Client View"}</span>
            <span>·</span>
            <span>{activeTasks.length} tasks</span>
            {activeProject.ht_owner && <React.Fragment><span>·</span><span>{activeProject.ht_owner}</span></React.Fragment>}
            {(activeProject.products || "").split(",").filter(Boolean).map(function(pid) {
              return <span key={pid} className="badge--small badge--product">{(PRODUCT_META[pid] || {}).icon || "📦"} {pid}</span>;
            })}
          </div>
        </div>
        {isAdmin && <div className="share-key">Share key: <code>{activeProject.share_key}</code></div>}
      </div>

      <OverviewPanel tasks={activeTasks} />

      {phaseGroups.map(function(g) {
        return <PhaseSection key={g.phase} phase={g.phase} tasks={g.tasks} editable={editable} onUpdate={handleTaskUpdate} />;
      })}
    </div>
  </div>;
}

// ── Mount ──
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
