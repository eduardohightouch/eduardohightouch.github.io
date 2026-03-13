/* ── Hightouch Implementation Guide — App ── */
const { useState, useMemo } = React;

// ── Constants ──
const PHASES = [
  { id:"readiness", label:"Readiness", icon:"🔍", color:"var(--ht-green3)", bg:"var(--ht-green1)", timeline:"1–4 weeks" },
  { id:"integration", label:"Integration", icon:"⚙️", color:"var(--ht-blue3)", bg:"var(--ht-blue1)", timeline:"1–5 weeks" },
  { id:"activation", label:"Activation", icon:"🚀", color:"var(--ht-purple-accent)", bg:"var(--ht-purple1)", timeline:"2–5 weeks" },
];

const PRODUCTS = [
  { id:"events", label:"Events", icon:"⚡", desc:"Collect and activate events in real time and batch" },
  { id:"idr", label:"Identity Resolution", icon:"🔗", desc:"Build unified customer profiles from fragmented data" },
  { id:"papi", label:"Personalization API", icon:"🎯", desc:"Serve real-time personalized data via API" },
  { id:"matchbooster", label:"MatchBooster", icon:"📈", desc:"Amplify match rates with enriched identifiers" },
  { id:"journeys", label:"Journeys", icon:"🗺️", desc:"Orchestrate multi-touch cross-channel campaigns" },
];

const STATUS_OPTIONS = [
  { v:"not_started", l:"Not Started", c:"var(--ht-gray3)", bg:"var(--ht-gray1)" },
  { v:"in_progress", l:"In Progress", c:"var(--ht-amber)", bg:"var(--ht-amber-bg)" },
  { v:"complete", l:"Complete", c:"var(--ht-green3)", bg:"var(--ht-green1)" },
  { v:"blocked", l:"Blocked", c:"var(--ht-red)", bg:"var(--ht-red-bg)" },
  { v:"na", l:"N/A", c:"var(--ht-gray3)", bg:"var(--ht-gray1)" },
];
const getS = v => STATUS_OPTIONS.find(s => s.v === v) || STATUS_OPTIONS[0];

// ── Master Template (from Google Sheet "✅ to-dos" tab) ──
const MASTER = [
  // READINESS
  {id:"r1",phase:"readiness",product:null,task:"Kick-Off call",desc:"Get started with your onboarding.",resource:"🎴 KO deck",link:"",team:"",opt:false,workshop:true},
  {id:"r2",phase:"readiness",product:null,task:"Define project team",desc:"Identify all necessary team members and assign them tasks.",resource:"▶️ Your team",link:"",team:"CDP lead",opt:false},
  {id:"r3",phase:"readiness",product:null,task:"Define your first use cases",desc:"Define your use cases and their priorities in the use cases tab.",resource:"▶️ First use cases",link:"",team:"Marketing",opt:false},
  {id:"r4",phase:"readiness",product:null,task:"Invite team members",desc:"If you're not using SSO, invite your team members and check they've accepted their invitations.",resource:"📋 Workspace mgmt",link:"https://hightouch.com/docs/workspace-management/overview",team:"CDP lead",opt:false},
  {id:"r5",phase:"readiness",product:null,task:"Governance workshop",desc:"Learn how to manage users, roles, and workspace settings. Check the deck and ask for a dedicated session if needed.",resource:"🎴 Governance deck",link:"",team:"CDP lead / Marketing",opt:true,workshop:true},
  {id:"r6",phase:"readiness",product:null,task:"Set up login with SSO/SCIM",desc:"Set up workspace access via an IdP such as Okta or Azure ID.",resource:"📋 SSO setup guide",link:"https://hightouch.com/docs/workspace-management/sso",team:"IT",opt:true},
  // INTEGRATION core
  {id:"i1",phase:"integration",product:null,task:"Hightouch 101 workshop",desc:"Learn how Hightouch models, syncs, and secures your data.",resource:"🎴 HT 101 deck / 📋 Getting started",link:"",team:"Marketing / Data / IT",opt:false,workshop:true},
  {id:"i2",phase:"integration",product:null,task:"Connect your data warehouse",desc:"A source is where your business data lives. Add a source from Integration > Sources.",resource:"📋 Connect a source",link:"https://hightouch.com/docs/getting-started/create-your-first-sync#connect-a-source",team:"Data",opt:false},
  {id:"i3",phase:"integration",product:null,task:"Set up Lightning Sync Engine",desc:"Grant us write access to your WH for large data syncing.",resource:"📋 Lightning sync engine",link:"https://hightouch.com/docs/syncs/lightning-sync-engine",team:"Data",opt:false},
  {id:"i4",phase:"integration",product:null,task:"Set up a tunnel / private link",desc:"Connect to your warehouse in your private network or VPC.",resource:"📋 Architecture overview",link:"https://hightouch.com/docs/security/overview#architecture-overview",team:"Data",opt:true},
  {id:"i5",phase:"integration",product:null,task:"Whitelist our IPs",desc:"Add Hightouch's IP addresses to your firewall allowlist.",resource:"📋 IP addresses",link:"https://hightouch.com/docs/security/networking#ip-addresses",team:"Data / IT",opt:true},
  {id:"i6",phase:"integration",product:null,task:"Set up Warehouse Sync Logs",desc:"Write sync metadata back into your data warehouse.",resource:"📋 Warehouse sync logs",link:"https://hightouch.com/docs/syncs/warehouse-sync-logs",team:"Data",opt:false},
  {id:"i7",phase:"integration",product:null,task:"Bring your own bucket",desc:"Store your query results within your own external bucket. Ensure your customer data exists solely within your cloud.",resource:"📋 Self-hosted storage",link:"https://hightouch.com/docs/security/storage#self-hosted-storage",team:"Data / IT",opt:false},
  {id:"i8",phase:"integration",product:null,task:"Connect your destinations",desc:"A destination is any tool or service you want to send data to. Add a destination from Integration > Destinations.",resource:"📋 Connect a destination",link:"https://hightouch.com/docs/getting-started/create-your-first-sync#connect-a-destination",team:"Marketing",opt:false},
  // Events
  {id:"ie1",phase:"integration",product:"events",task:"Events workshop",desc:"Learn how to collect and activate events in real time and batch.",resource:"🎴 Events deck / 📋 Events overview",link:"",team:"Data / IT",opt:false,workshop:true},
  {id:"ie2",phase:"integration",product:"events",task:"Define events to track",desc:"List events to collect specifying their types and parameters.",resource:"📋 Tracking spec",link:"https://hightouch.com/docs/events/event-spec",team:"Data / IT",opt:false},
  {id:"ie3",phase:"integration",product:"events",task:"Connect event sources",desc:"Install SDKs or connect your sources to start capturing events. Use the debugger to confirm event reception and payloads.",resource:"📋 Event sources",link:"https://hightouch.com/docs/events/get-started#2-connect-event-sources-to-start-collecting-events",team:"Data / IT",opt:false},
  {id:"ie4",phase:"integration",product:"events",task:"Load to your warehouse",desc:"Set up and sync an event storage destination.",resource:"📋 Write to warehouse",link:"https://hightouch.com/docs/events/warehouses/warehouse",team:"Data",opt:false},
  {id:"ie5",phase:"integration",product:"events",task:"Push real-time to destinations",desc:"Set up and sync your event forwarding destinations.",resource:"📋 Event streaming",link:"https://hightouch.com/docs/events/event-streaming",team:"Data",opt:false},
  {id:"ie6",phase:"integration",product:"events",task:"Set up data contracts",desc:"Define rules for structure, naming, and format of your events.",resource:"📋 Managing contracts",link:"https://hightouch.com/docs/events/contracts/management",team:"Data",opt:true},
  {id:"ie7",phase:"integration",product:"events",task:"Define event functions",desc:"Transform event data before syncing it to a destination.",resource:"📋 Functions",link:"https://hightouch.com/docs/events/functions/overview",team:"Data",opt:true},
  {id:"ie8",phase:"integration",product:"events",task:"Set up first-party tracking",desc:"Proxy events through your domain and mitigate Safari ITP.",resource:"📋 First-party tracking",link:"https://hightouch.com/docs/events/first-party-tracking",team:"Data",opt:true},
  {id:"ie9",phase:"integration",product:"events",task:"Validate your events",desc:"Review event flow and compare with your previous system.",resource:"📋 Migrate to Events",link:"https://hightouch.com/docs/events/migration-guide/overview",team:"Data",opt:false},
  // IDR
  {id:"ii1",phase:"integration",product:"idr",task:"Identity Resolution workshop",desc:"Learn to build unified customer profiles from fragmented data.",resource:"🎴 IDR deck / 📋 IDR overview",link:"",team:"Data",opt:false,workshop:true},
  {id:"ii2",phase:"integration",product:"idr",task:"Set up pIDR bucket",desc:"Grant our service account access to your external bucket.",resource:"📋 Custom instructions",link:"",team:"Data",opt:false},
  {id:"ii3",phase:"integration",product:"idr",task:"Select models and identifiers",desc:"Select models to reference and map their columns to identifiers.",resource:"📋 Model configuration",link:"https://hightouch.com/docs/identity-resolution/model-configuration",team:"Data",opt:false},
  {id:"ii4",phase:"integration",product:"idr",task:"Define matching logic",desc:"Set identifier rules to control how profiles are stitched.",resource:"📋 Identifier rules",link:"https://hightouch.com/docs/identity-resolution/identifier-rules",team:"Data",opt:false},
  {id:"ii5",phase:"integration",product:"idr",task:"Set up Golden Record",desc:"Generate a parent model in CS using survivorship rules.",resource:"📋 Golden record",link:"https://hightouch.com/docs/identity-resolution/golden-record",team:"Data",opt:false},
  {id:"ii6",phase:"integration",product:"idr",task:"Output your identity graph",desc:"Check unique profiles and output tables in your warehouse.",resource:"📋 Graph usage",link:"https://hightouch.com/docs/identity-resolution/usage",team:"Data",opt:false},
  // PAPI
  {id:"ip1",phase:"integration",product:"papi",task:"Create a PAPI destination",desc:"Set up the Personalization API destination in the closest region.",resource:"📋 Getting started",link:"https://hightouch.com/docs/real-time/personalization-api#getting-started",team:"Data",opt:false},
  {id:"ip2",phase:"integration",product:"papi",task:"Set up syncs to PAPI",desc:"Define which data to store in the Hightouch-managed cache.",resource:"📋 Sync configuration",link:"https://hightouch.com/docs/real-time/personalization-api#sync-configuration",team:"Data",opt:false},
  {id:"ip3",phase:"integration",product:"papi",task:"Access data",desc:"Create an API key and get your data with an HTTP request.",resource:"📋 Access data",link:"https://hightouch.com/docs/real-time/personalization-api#access-data",team:"Data / IT",opt:false},
  // Schema core
  {id:"is1",phase:"integration",product:null,task:"Schema builder workshop",desc:"Learn to make your data available for building audiences.",resource:"🎬 Schema video / 🎴 Schema deck",link:"",team:"Data",opt:false,workshop:true},
  {id:"is2",phase:"integration",product:null,task:"Set up your schema",desc:"Set up your schema by defining parent models, related models and events in Customer Studio > Schema.",resource:"📋 Define data schema",link:"https://hightouch.com/docs/customer-studio/schema",team:"Data",opt:false},
  // ACTIVATION core
  {id:"a1",phase:"activation",product:null,task:"Customer Studio workshop",desc:"Learn to build audiences and sync them to destinations.",resource:"🎬 CS video / 🎴 CS deck",link:"",team:"Marketing",opt:false,workshop:true},
  {id:"a2",phase:"activation",product:null,task:"Build your audiences",desc:"Build the audiences for your first use cases.",resource:"📋 Create audiences",link:"https://hightouch.com/docs/customer-studio/usage",team:"Marketing",opt:false},
  {id:"a3",phase:"activation",product:null,task:"Set up manual syncs",desc:"Decide how audience data is delivered to destinations.",resource:"📋 Syncs audiences",link:"https://hightouch.com/docs/customer-studio/syncs",team:"Marketing",opt:false},
  {id:"a4",phase:"activation",product:null,task:"Test your syncs",desc:"Run a manual sync and validate data in your destination.",resource:"📋 Run details",link:"https://hightouch.com/docs/syncs/overview#run-details",team:"Marketing",opt:false},
  {id:"a5",phase:"activation",product:null,task:"Schedule your syncs",desc:"Schedule your sync to run automatically.",resource:"📋 Schedule",link:"https://hightouch.com/docs/syncs/overview#schedule",team:"Marketing",opt:false},
  // MatchBooster
  {id:"am1",phase:"activation",product:"matchbooster",task:"MatchBooster 101 workshop",desc:"Learn how MatchBooster amplifies your match rates.",resource:"📋 MB overview",link:"https://hightouch.com/docs/match-booster/overview",team:"Marketing",opt:false,workshop:true},
  {id:"am2",phase:"activation",product:"matchbooster",task:"Agree MB configuration",desc:"Set baseline syncs, target match rates, matching preferences.",resource:"⚙️ Typically run in POC",link:"",team:"Marketing",opt:false},
  {id:"am3",phase:"activation",product:"matchbooster",task:"Enrich your models",desc:"Select the identifiers from our data partners and set a schedule.",resource:"📋 Model configuration",link:"https://hightouch.com/docs/match-booster/implementation#model-configuration",team:"Marketing",opt:false},
  {id:"am4",phase:"activation",product:"matchbooster",task:"Set up boosted syncs",desc:"Map your enriched identifiers to your supported destinations.",resource:"📋 Sync configuration",link:"https://hightouch.com/docs/match-booster/implementation#sync-configuration",team:"Marketing",opt:false},
  // Journeys
  {id:"aj1",phase:"activation",product:"journeys",task:"Journeys workshop",desc:"Learn to orchestrate multi-touch cross-channel campaigns.",resource:"🎴 Journeys deck",link:"",team:"Marketing",opt:false,workshop:true},
  {id:"aj2",phase:"activation",product:"journeys",task:"Set up your journeys",desc:"Design your automated flow with the drag-and-drop builder.",resource:"📋 Set up journeys",link:"https://hightouch.com/docs/customer-studio/journeys",team:"Marketing",opt:false},
  {id:"aj3",phase:"activation",product:"journeys",task:"Test your journeys",desc:"Before launching your journey run a test. No data will be sent to any destinations. Time delays will be skipped.",resource:"📋 Simulating a journey",link:"https://hightouch.com/docs/customer-studio/journeys#test-a-journey",team:"Marketing",opt:false},
  // Activation core continued
  {id:"ax1",phase:"activation",product:null,task:"Set alerts",desc:"Set alerts for sync issues via SMS, Slack, email or PagerDuty. For advanced monitoring, integrate with DataDog.",resource:"📋 Alerting",link:"https://hightouch.com/docs/syncs/alerting",team:"Marketing",opt:true},
  {id:"ax2",phase:"activation",product:null,task:"Set up Git Sync",desc:"Use Git Sync to version control your Hightouch workspace.",resource:"📋 Git sync",link:"https://hightouch.com/docs/extensions/git-sync",team:"IT",opt:true},
  {id:"ax3",phase:"activation",product:null,task:"Sign-off",desc:"After deploying first use cases and learning the platform.",resource:"",link:"",team:"CDP lead",opt:false},
];

// ── Helpers ──
const LS_KEY = "ht_impl_projects";
function loadProjects() { try { const d = localStorage.getItem(LS_KEY); return d ? JSON.parse(d) : []; } catch (e) { return []; } }
function saveProjects(p) { try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch (e) {} }
function gid() { return Math.random().toString(36).slice(2, 10); }
function phLabel(phaseId) { const p = PHASES.find(x => x.id === phaseId); return p ? p.icon + " " + p.label : phaseId; }
function prodLabel(prodId) { if (!prodId) return "Core"; const p = PRODUCTS.find(x => x.id === prodId); return p ? p.icon + " " + p.label : ""; }

// ── Overview Intelligence ──
function computeOverview(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "complete").length;
  const inProg = tasks.filter(t => t.status === "in_progress").length;
  const blocked = tasks.filter(t => t.status === "blocked").length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const phaseProgress = PHASES.map(ph => {
    const pt = tasks.filter(t => t.phase === ph.id);
    const pd = pt.filter(t => t.status === "complete" || t.status === "na").length;
    return { ...ph, total: pt.length, done: pd, pct: pt.length ? Math.round(pd / pt.length * 100) : 0 };
  });
  const activePhase = phaseProgress.find(p => p.pct < 100) || phaseProgress[phaseProgress.length - 1];
  return {
    total, done, inProg, blocked, pct, phaseProgress, activePhase,
    nextUp: tasks.filter(t => t.status !== "complete" && t.status !== "na" && !t.opt).slice(0, 3),
    wip: tasks.filter(t => t.status === "in_progress").slice(0, 3),
    blockedItems: tasks.filter(t => t.status === "blocked").slice(0, 3),
    workshops: tasks.filter(t => t.workshop && t.status !== "complete" && t.status !== "na").slice(0, 3),
    recentlyDone: tasks.filter(t => t.status === "complete").slice(-3).reverse(),
    allDone: pct === 100,
  };
}

// ── Components ──

function StatusBadge({ status, onChange, editable }) {
  const s = getS(status);
  if (!editable) return <span className="badge" style={{ background: s.bg, color: s.c }}>{s.l}</span>;
  return <select className="status-select" value={status} onChange={e => onChange(e.target.value)} style={{ background: s.bg, color: s.c }}>
    {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>;
}

function OverviewPanel({ tasks }) {
  const o = useMemo(() => computeOverview(tasks), [tasks]);

  if (o.allDone) return <div className="banner-complete fade-in">
    <div style={{ fontSize: 32, marginBottom: 6 }}>🎉</div>
    <div className="fw-800 text-2xl" style={{ color: "#166534" }}>Implementation Complete!</div>
    <div className="text-md mt-4" style={{ color: "var(--ht-green3)" }}>All {o.total} tasks are done. Time to transition to ongoing support.</div>
  </div>;

  const OverviewItem = ({ items, icon, label, colorClass, renderItem }) => (
    <div className={"overview__cell" + (items._borderR ? " overview__cell--border-r" : "") + (items._borderB ? " overview__cell--border-b" : "")}>
      <div className={"overview__label " + colorClass}>{icon} {label}</div>
      {items.data.length === 0
        ? <div className="text-sm text-light">{items.empty}</div>
        : items.data.map((t, i) => <div key={t.id} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < items.data.length - 1 ? 8 : 0 }}>{renderItem(t, i)}</div>)
      }
    </div>
  );

  const hasBl = o.blockedItems.length > 0;
  const hasWs = o.workshops.length > 0;
  const showBottom = hasBl || hasWs;

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
        {o.phaseProgress.filter(p => p.total > 0).map(p => (
          <div key={p.id} className={"phase-pill" + (p.pct === 100 ? " phase-pill--done" : "") + (p.id === o.activePhase.id ? " phase-pill--active" : "")}
            style={p.id === o.activePhase.id ? { borderColor: p.color, background: p.bg } : {}}>
            <div className="flex flex--between flex--center">
              <span className="text-sm fw-600" style={{ color: p.pct === 100 ? "#166534" : "var(--ht-text)" }}>{p.icon} {p.label}</span>
              <span className="text-xs fw-700" style={{ color: p.pct === 100 ? "var(--ht-green3)" : p.color }}>{p.pct}%</span>
            </div>
            <div className="progress progress--small mt-4" style={{ background: "var(--ht-gray2)" }}>
              <div className="progress__fill" style={{ background: p.pct === 100 ? "var(--ht-green3)" : p.color, width: p.pct + "%", borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="overview__grid">
      {/* Next Up */}
      <div className={"overview__cell overview__cell--border-r" + (showBottom ? " overview__cell--border-b" : "")}>
        <div className="overview__label overview__label--green">⏭️ Next Up</div>
        {o.nextUp.length === 0 ? <div className="text-sm text-light">Nothing pending — all caught up!</div> :
          o.nextUp.map((t, i) => <div key={t.id} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.nextUp.length - 1 ? 8 : 0 }}>
            <div className={"num-circle " + (i === 0 ? "num-circle--primary" : "num-circle--muted")}>{i + 1}</div>
            <div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}{t.product ? " · " + prodLabel(t.product) : ""}{t.team ? " · " + t.team : ""}</div></div>
          </div>)}
      </div>
      {/* In Progress */}
      <div className={"overview__cell" + (showBottom ? " overview__cell--border-b" : "")}>
        <div className="overview__label overview__label--amber">🔄 In Progress</div>
        {o.wip.length === 0 ? <div className="text-sm text-light">No tasks currently in progress.</div> :
          o.wip.map((t, i) => <div key={t.id} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.wip.length - 1 ? 8 : 0 }}>
            <div className="dot dot--amber" /><div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}{t.owner ? " · " + t.owner : ""}</div></div>
          </div>)}
      </div>
      {/* Blocked */}
      {hasBl && <div className="overview__cell overview__cell--border-r">
        <div className="overview__label overview__label--red">🚨 Blocked</div>
        {o.blockedItems.map((t, i) => <div key={t.id} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.blockedItems.length - 1 ? 8 : 0 }}>
          <div className="dot dot--red" /><div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{t.owner ? t.owner + " · " : ""}{phLabel(t.phase)}</div></div>
        </div>)}
      </div>}
      {/* Workshops */}
      {hasWs && <div className={"overview__cell" + (!hasBl ? " overview__cell--border-r" : "")}>
        <div className="overview__label overview__label--purple">🎓 Upcoming Workshops</div>
        {o.workshops.map((t, i) => <div key={t.id} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.workshops.length - 1 ? 8 : 0 }}>
          <div className="dot dot--purple" /><div><div className="text-md fw-600 text-main">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}{t.product ? " · " + prodLabel(t.product) : ""}</div></div>
        </div>)}
      </div>}
      {/* Recently completed (shown if no blocked + no workshops) */}
      {o.recentlyDone.length > 0 && !hasBl && !hasWs && <div className="overview__cell overview__cell--border-r overview__cell--border-t">
        <div className="overview__label overview__label--green">✅ Recently Completed</div>
        {o.recentlyDone.map((t, i) => <div key={t.id} className="flex gap-8" style={{ alignItems: "flex-start", marginBottom: i < o.recentlyDone.length - 1 ? 8 : 0 }}>
          <div className="dot dot--green-light" /><div><div className="text-md fw-500 text-light text-strike">{t.task}</div><div className="text-xs text-light">{phLabel(t.phase)}</div></div>
        </div>)}
      </div>}
    </div>
  </div>;
}

function TaskRow({ task, onUpdate, editable }) {
  const [exp, setExp] = useState(false);
  return <div className="task-row__border">
    <div className="task-row">
      <div>
        <div className="fw-500 text-main flex flex--center gap-4 flex--wrap">
          {task.opt && <span className="badge--small badge--optional">OPTIONAL</span>}
          {task.workshop && <span className="badge--small badge--workshop">WORKSHOP</span>}
          {task.task}
        </div>
        <div className="text-xs text-light mt-2" style={{ lineHeight: 1.3 }}>{task.desc}</div>
      </div>
      <div className="text-xs text-mid">{task.resource && (task.link ? <a href={task.link} target="_blank" rel="noreferrer" className="link">{task.resource}</a> : <span>{task.resource}</span>)}</div>
      <input placeholder="Owner" value={task.owner || ""} disabled={!editable} onChange={e => onUpdate({ ...task, owner: e.target.value })} className={"input--small" + (!editable ? " input--disabled" : "")} />
      <input type="date" value={task.targetDate || ""} disabled={!editable} onChange={e => onUpdate({ ...task, targetDate: e.target.value })} className={"input--date" + (!editable ? " input--disabled" : "")} />
      <StatusBadge status={task.status} editable={editable} onChange={v => onUpdate({ ...task, status: v })} />
      <button onClick={() => setExp(!exp)} className={"task-row__expand" + (exp ? " task-row__expand--open" : "")}>▶</button>
    </div>
    {exp && <div className="task-detail">
      <div style={{ flex: 1, minWidth: 160 }}>
        <label className="task-detail__label">Notes</label>
        <textarea placeholder="Add notes..." value={task.notes || ""} disabled={!editable} onChange={e => onUpdate({ ...task, notes: e.target.value })} rows={2}
          style={{ width: "100%", border: "1px solid var(--ht-gray2)", borderRadius: 6, padding: "4px 6px", fontSize: 12, resize: "vertical", background: editable ? "#fff" : "var(--ht-gray1)", boxSizing: "border-box" }} />
      </div>
      <div style={{ minWidth: 100 }}>
        <label className="task-detail__label">Recommended team</label>
        <div className="text-sm text-mid mt-2">{task.team || "—"}</div>
      </div>
    </div>}
  </div>;
}

function PhaseSection({ phase, tasks, onUpdate, editable }) {
  const [collapsed, setCollapsed] = useState(false);
  const ph = PHASES.find(p => p.id === phase);
  const done = tasks.filter(t => t.status === "complete").length;
  const coreTasks = tasks.filter(t => !t.product);
  const prodGroups = PRODUCTS.map(pr => ({ pr, items: tasks.filter(t => t.product === pr.id) })).filter(x => x.items.length > 0);

  return <div className="phase">
    <div className={"phase__header" + (collapsed ? " phase__header--collapsed" : "")} onClick={() => setCollapsed(!collapsed)} style={{ background: ph.bg }}>
      <span className={"phase__arrow" + (!collapsed ? " phase__arrow--open" : "")} style={{ color: ph.color }}>▶</span>
      <span style={{ fontSize: 18 }}>{ph.icon}</span>
      <div style={{ flex: 1 }}><span className="fw-700 text-lg text-main">{ph.label}</span><span className="text-sm text-mid ml-8">{ph.timeline}</span></div>
      <span className="text-sm text-mid fw-500">{done}/{tasks.length} done</span>
    </div>
    {!collapsed && <div>
      <div className="task-grid"><span>Task</span><span>Resource</span><span>Owner</span><span>Due</span><span>Status</span><span /></div>
      {coreTasks.map(t => <TaskRow key={t.id} task={t} onUpdate={onUpdate} editable={editable} />)}
      {prodGroups.map(({ pr, items }) => <div key={pr.id}>
        <div className="product-group-header">
          <span>{pr.icon}</span> {pr.label}
          <span className="text-xxs text-light fw-400 ml-4">{items.filter(x => x.status === "complete").length}/{items.length}</span>
        </div>
        {items.map(t => <TaskRow key={t.id} task={t} onUpdate={onUpdate} editable={editable} />)}
      </div>)}
    </div>}
  </div>;
}

function ProductSelector({ selected, onToggle }) {
  return <div className="product-grid">
    {PRODUCTS.map(pr => {
      const on = selected.has(pr.id);
      const count = MASTER.filter(t => t.product === pr.id).length;
      return <div key={pr.id} onClick={() => onToggle(pr.id)} className={"product-card" + (on ? " product-card--selected" : "")}>
        <div className="flex flex--center flex--between mb-4">
          <span style={{ fontSize: 20 }}>{pr.icon}</span>
          <div className={"product-card__check" + (on ? " product-card__check--on" : "")}>
            {on && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
        </div>
        <div className="fw-700 text-md text-main">{pr.label}</div>
        <div className="text-xs text-mid mt-2" style={{ lineHeight: 1.3 }}>{pr.desc}</div>
        <div className="text-xxs text-light mt-4">{count} steps</div>
      </div>;
    })}
  </div>;
}

// ── Main App ──
const LIST = "list", DETAIL = "detail", CREATE = "create";

function App() {
  const [view, setView] = useState(LIST);
  const [projects, setProjectsRaw] = useState(() => loadProjects());
  const [active, setActive] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [newName, setNewName] = useState("");
  const [selProducts, setSelProducts] = useState(new Set());
  const [keyInput, setKeyInput] = useState("");

  const setProjects = fn => { setProjectsRaw(prev => { const next = typeof fn === "function" ? fn(prev) : fn; saveProjects(next); return next; }); };
  const toggleProd = id => setSelProducts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const coreCount = MASTER.filter(t => !t.product).length;

  const createProject = () => {
    if (!newName.trim()) return;
    const key = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + gid().slice(0, 4);
    const tasks = MASTER.filter(t => !t.product || selProducts.has(t.product)).map(t => ({ ...t, id: gid(), status: "not_started", owner: "", targetDate: "", notes: "" }));
    const p = { id: gid(), name: newName.trim(), shareKey: key, tasks, products: [...selProducts], createdAt: new Date().toISOString().slice(0, 10) };
    setProjects(prev => [...prev, p]);
    setActive(p.id); setIsAdmin(true); setView(DETAIL);
    setNewName(""); setSelProducts(new Set());
  };

  const updateTask = (projId, updated) => setProjects(prev => prev.map(p => p.id === projId ? { ...p, tasks: p.tasks.map(t => t.id === updated.id ? updated : t) } : p));
  const deleteProject = projId => { if (confirm("Delete this project? This cannot be undone.")) { setProjects(prev => prev.filter(p => p.id !== projId)); } };
  const openProj = (id, admin) => { setActive(id); setIsAdmin(admin); setView(DETAIL); };
  const accessByKey = () => { const p = projects.find(x => x.shareKey === keyInput.trim()); if (p) { openProj(p.id, false); setKeyInput(""); } else alert("Project not found. Check the share key."); };

  const proj = projects.find(p => p.id === active);

  // ── HOME / CREATE ──
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
          <input className="input" placeholder="Enter share key (e.g. acme-a1b2)" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === "Enter" && accessByKey()} />
          <button className="btn btn--primary" onClick={accessByKey}>Open Plan</button>
        </div>
      </div>
      {/* Admin header */}
      <div className="flex flex--between flex--center mb-14">
        <div className="text-xl fw-700 text-main">All Projects (Admin)</div>
        <button className="btn btn--primary" onClick={() => setView(CREATE)}>+ New Project</button>
      </div>
      {/* Create form */}
      {view === CREATE && <div className="card mb-18" style={{ padding: 20 }}>
        <div className="text-xl fw-700 text-main mb-4">Create New Client Project</div>
        <div className="text-sm text-light mb-14">{coreCount} core steps are always included. Select which product modules apply to this client.</div>
        <input className="input mb-14" placeholder="Client name (e.g. Acme Corp)" value={newName} onChange={e => setNewName(e.target.value)} style={{ fontSize: 14 }} />
        <div className="text-md fw-600 text-main mb-8">Product modules for this client:</div>
        <ProductSelector selected={selProducts} onToggle={toggleProd} />
        <div className="summary-chip">This project will include <strong className="text-main">{MASTER.filter(t => !t.product || selProducts.has(t.product)).length} total steps</strong>: {coreCount} core + {MASTER.filter(t => t.product && selProducts.has(t.product)).length} from {selProducts.size} module{selProducts.size !== 1 ? "s" : ""}.</div>
        <div className="flex gap-8 flex--end mt-14">
          <button className="btn btn--secondary" onClick={() => { setView(LIST); setNewName(""); setSelProducts(new Set()); }}>Cancel</button>
          <button className={"btn " + (newName.trim() ? "btn--primary" : "btn--disabled")} onClick={createProject} disabled={!newName.trim()}>Create Project</button>
        </div>
      </div>}
      {/* Project list */}
      {projects.length === 0 && view === LIST && <div className="empty-state">No projects yet. Create your first one above.</div>}
      {projects.map(p => {
        const d = p.tasks.filter(t => t.status === "complete").length;
        const pct = p.tasks.length ? Math.round(d / p.tasks.length * 100) : 0;
        return <div key={p.id} className="project-card">
          <div className="flex flex--center gap-14 flex--1" style={{ cursor: "pointer" }} onClick={() => openProj(p.id, true)}>
            <div className="project-card__avatar">{p.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fw-700 text-md text-main">{p.name}</div>
              <div className="flex gap-4 flex--wrap mt-3">
                {(p.products || []).map(pid => { const pr = PRODUCTS.find(x => x.id === pid); return pr ? <span key={pid} className="badge--small badge--product">{pr.icon} {pr.label}</span> : null; })}
                {(!p.products || p.products.length === 0) && <span className="text-xxs text-light">Core only</span>}
              </div>
              <div className="text-xs text-light mt-2">Share key: <code>{p.shareKey}</code></div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="text-2xl fw-800" style={{ color: pct === 100 ? "var(--ht-green3)" : "var(--ht-blue3)" }}>{pct}%</div>
            <div className="text-xs text-light">{d}/{p.tasks.length}</div>
          </div>
          <button className="btn--delete" onClick={e => { e.stopPropagation(); deleteProject(p.id); }} title="Delete project">✕</button>
        </div>;
      })}
    </div>
  </div>;

  // ── DETAIL ──
  if (!proj) return null;
  const editable = isAdmin;
  const phaseGroups = PHASES.map(ph => ({ phase: ph.id, tasks: proj.tasks.filter(t => t.phase === ph.id) })).filter(g => g.tasks.length > 0);

  return <div className="page-wrap">
    <div className="container--wide">
      <div className="flex flex--center gap-10 mb-20 flex--wrap">
        <button className="btn--back" onClick={() => { setView(LIST); setActive(null); }}>← Back</button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="text-3xl fw-800 text-main">{proj.name}</div>
          <div className="text-xs text-light flex gap-6 flex--center flex--wrap">
            <span>{isAdmin ? "Admin View" : "Client View"}</span><span>·</span><span>{proj.tasks.length} tasks</span>
            {(proj.products || []).map(pid => { const pr = PRODUCTS.find(x => x.id === pid); return pr ? <span key={pid} className="badge--small badge--product">{pr.icon} {pr.label}</span> : null; })}
          </div>
        </div>
        {isAdmin && <div className="share-key">Share key: <code>{proj.shareKey}</code></div>}
      </div>
      <OverviewPanel tasks={proj.tasks} />
      {phaseGroups.map(({ phase, tasks }) => <PhaseSection key={phase} phase={phase} tasks={tasks} editable={editable} onUpdate={t => updateTask(proj.id, t)} />)}
    </div>
  </div>;
}

// ── Mount ──
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
