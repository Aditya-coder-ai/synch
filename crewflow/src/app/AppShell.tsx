import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  Database,
  FileClock,
  GitBranch,
  Grid2X2,
  Inbox,
  KeyRound,
  Layers3,
  LifeBuoy,
  ListChecks,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Network,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Users2,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'
import { endpoints, type ApiResult, type AgentRecord, type ApprovalRecord, type IntegrationRecord, type MemoryRecord, type OverviewPayload, type WorkflowRecord } from './api'

type ViewId = 'overview' | 'command' | 'agents' | 'workflows' | 'memory' | 'monitor' | 'approvals' | 'integrations'

type NavItem = { id: ViewId; label: string; icon: LucideIcon; group?: string }

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Grid2X2 },
  { id: 'command', label: 'Command center', icon: Command },
  { id: 'agents', label: 'Agent studio', icon: Bot, group: 'Build' },
  { id: 'workflows', label: 'Workflow studio', icon: Workflow },
  { id: 'memory', label: 'Memory hub', icon: Database, group: 'Observe' },
  { id: 'monitor', label: 'Live monitor', icon: Radio },
  { id: 'approvals', label: 'Approval center', icon: ShieldCheck },
  { id: 'integrations', label: 'Integrations hub', icon: Network, group: 'System' },
]

const CableIcon = Network

function DataState({ result, label, action }: { result: ApiResult<unknown> | null; label: string; action?: () => void }) {
  if (!result || result.state === 'loading') return <div className="workspace-state is-loading"><RefreshCw size={17} /><span>Loading {label}…</span></div>
  if (result.state === 'success') return null
  const icon = result.state === 'error' ? <AlertTriangle size={18} /> : result.state === 'empty' ? <Inbox size={18} /> : <KeyRound size={18} />
  return <div className={`workspace-state is-${result.state}`}><span className="state-icon">{icon}</span><strong>{result.state === 'unavailable' ? 'Backend connection required' : result.state === 'empty' ? `No ${label} yet` : 'Could not load this view'}</strong><span>{result.message}</span>{action && <button onClick={action}><RefreshCw size={13} /> Retry</button>}</div>
}

function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue' }) {
  return <span className={`status-pill ${tone}`}><span className="status-pill-dot" />{label}</span>
}

function Metric({ label, value, detail, tone = 'neutral' }: { label: string; value: string; detail: string; tone?: 'neutral' | 'success' | 'warning' }) {
  return <div className="workspace-metric"><span className="workspace-label">{label}</span><strong>{value}</strong><small className={tone}>{detail}</small></div>
}

function Panel({ title, eyebrow, action, children, className = '' }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`workspace-panel ${className}`}><div className="workspace-panel-head"><div><span className="workspace-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div>{children}</section>
}

function AppShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [overview, setOverview] = useState<ApiResult<OverviewPayload> | null>(null)
  const [viewData, setViewData] = useState<ApiResult<unknown> | null>(null)
  const [command, setCommand] = useState('')
  const [commandMode, setCommandMode] = useState<'autopilot' | 'approval'>('autopilot')
  const [notice, setNotice] = useState('')

  const activeNav = navItems.find((item) => item.id === activeView) ?? navItems[0]
  const ActiveIcon = activeNav.icon
  const isOverview = activeView === 'overview'

  const loadOverview = async () => {
    setOverview({ state: 'loading', data: null, message: '' })
    setOverview(await endpoints.overview())
  }

  const loadView = async () => {
    if (isOverview || activeView === 'command' || activeView === 'monitor') {
      setViewData(null)
      return
    }
    setViewData({ state: 'loading', data: null, message: '' })
    const loaders: Partial<Record<ViewId, () => Promise<ApiResult<unknown>>>> = {
      agents: async () => endpoints.agents() as Promise<ApiResult<unknown>>,
      workflows: async () => endpoints.workflows() as Promise<ApiResult<unknown>>,
      memory: async () => endpoints.memory() as Promise<ApiResult<unknown>>,
      approvals: async () => endpoints.approvals() as Promise<ApiResult<unknown>>,
      integrations: async () => endpoints.integrations() as Promise<ApiResult<unknown>>,
    }
    setViewData(await (loaders[activeView]?.() ?? Promise.resolve({ state: 'empty', data: null, message: 'No data source is configured for this view.' })))
  }

  useEffect(() => { void loadOverview() }, [])
  useEffect(() => { void loadView() }, [activeView])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3600); return () => window.clearTimeout(timer) }, [notice])

  const navigate = (id: ViewId) => { setActiveView(id); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const overviewData = overview?.state === 'success' ? overview.data : null
  const metrics = overviewData?.metrics
  const commandPlaceholder = commandMode === 'autopilot' ? 'Ask Crewflow to accomplish something…' : 'Describe a task that requires your approval…'

  const submitCommand = () => {
    if (!command.trim()) { setNotice('Add a task description before sending.'); return }
    setNotice('Execution requests require a configured CrewFlow API. Nothing was sent.')
  }

  return <div className="workspace-shell">
    <aside className={`workspace-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <div className="workspace-brand-row"><button className="workspace-brand" onClick={() => navigate('overview')}><span className="brand-mark"><span /><span /><span /></span><span>crewflow</span></button><button className="workspace-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
      <button className="workspace-switcher"><span className="workspace-avatar">AM</span><span><strong>Acme / Strategy</strong><small>Workspace</small></span><ChevronDown size={14} /></button>
      <nav className="workspace-nav" aria-label="Workspace navigation">
        {navItems.map((item) => { const Icon = item.icon; return <div key={item.id}>{item.group && <span className="workspace-nav-group">{item.group}</span>}<button className={activeView === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)}><Icon size={16} /><span>{item.label}</span>{item.id === 'approvals' && overviewData?.metrics?.pendingApprovals ? <b>{overviewData.metrics.pendingApprovals}</b> : null}</button></div> })}
      </nav>
      <div className="workspace-sidebar-foot"><button onClick={() => setNotice('Workspace settings require an authenticated backend session.')}><Settings2 size={16} /> Settings</button><button onClick={() => setNotice('Help center is not connected to this project yet.')}><LifeBuoy size={16} /> Help & support</button><div className="workspace-profile"><span className="workspace-avatar">AM</span><span><strong>Preview workspace</strong><small>No session provider</small></span><MoreHorizontal size={16} /></div></div>
    </aside>

    <div className="workspace-main">
      <header className="workspace-topbar"><div className="workspace-top-left"><button className="workspace-menu" onClick={() => setSidebarOpen(true)} aria-label="Open workspace navigation"><Menu size={19} /></button><div className="workspace-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav.label}</strong></div></div><div className="workspace-top-actions"><button className="workspace-search" onClick={() => navigate('command')}><Search size={15} /><span>Search workspace</span><kbd>⌘ K</kbd></button><button className="workspace-top-icon" onClick={() => setNotice('Notifications require a connected workspace session.')}><Inbox size={17} /></button><button className="workspace-top-avatar" onClick={() => setNotice('This preview has no authenticated profile.')}>AM</button></div></header>
      <div className="workspace-content">
        <div className="workspace-session-note"><span><CircleDot size={12} /> Frontend workspace preview</span><span>Live data is disabled until VITE_CREWFLOW_API_BASE_URL is configured.</span><button onClick={onSignOut}>Return to site</button></div>
        {activeView === 'overview' && <OverviewView overview={overview} overviewData={overviewData} onRetry={loadOverview} navigate={navigate} />}
        {activeView === 'command' && <CommandView command={command} setCommand={setCommand} mode={commandMode} setMode={setCommandMode} onSubmit={submitCommand} />}
        {activeView === 'agents' && <AgentsView result={viewData as ApiResult<AgentRecord[]> | null} onRetry={loadView} onNotice={setNotice} />}
        {activeView === 'workflows' && <WorkflowsView result={viewData as ApiResult<WorkflowRecord[]> | null} onRetry={loadView} onNotice={setNotice} />}
        {activeView === 'memory' && <MemoryView result={viewData as ApiResult<MemoryRecord[]> | null} onRetry={loadView} />}
        {activeView === 'monitor' && <MonitorView overview={overview} onNavigate={navigate} />}
        {activeView === 'approvals' && <ApprovalsView result={viewData as ApiResult<ApprovalRecord[]> | null} onRetry={loadView} onNotice={setNotice} />}
        {activeView === 'integrations' && <IntegrationsView result={viewData as ApiResult<IntegrationRecord[]> | null} onRetry={loadView} onNotice={setNotice} />}
      </div>
    </div>
    {notice && <div className="workspace-toast"><CheckCircle2 size={15} />{notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}
  </div>
}

function ViewHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="workspace-view-head"><div><span className="workspace-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function OverviewView({ overview, overviewData, onRetry, navigate }: { overview: ApiResult<OverviewPayload> | null; overviewData: OverviewPayload | null; onRetry: () => void; navigate: (id: ViewId) => void }) {
  const metrics = overviewData?.metrics
  return <div className="workspace-view"><ViewHeader eyebrow="COMMAND CENTER / OVERVIEW" title={`Good morning${overviewData?.workspace?.memberName ? `, ${overviewData.workspace.memberName}` : ''}.`} description="A clear view of the systems, work, and decisions that need your attention." action={<button className="workspace-button primary" onClick={() => navigate('command')}><Command size={15} /> New command</button>} />
    <div className="workspace-health-row"><div className="workspace-health"><span className="health-orbit"><Activity size={18} /></span><div><span className="workspace-label">SYSTEM HEALTH</span><strong>{overviewData?.health?.label ?? 'Awaiting connection'}</strong><small>{overviewData?.health?.detail ?? 'Health signals will appear when the API is connected.'}</small></div><StatusPill label={overviewData?.health?.status === 'healthy' ? 'Operational' : 'Not connected'} tone={overviewData?.health?.status === 'healthy' ? 'success' : 'neutral'} /></div><div className="workspace-integration-summary"><div className="summary-icon"><CableIcon size={17} /></div><div><span className="workspace-label">INTEGRATIONS</span><strong>{overviewData ? 'Connected services reported by API' : 'No integration data'}</strong><small>Open Integrations Hub to inspect connections.</small></div><button onClick={() => navigate('integrations')}><ArrowUpRight size={15} /></button></div></div>
    <DataState result={overview} label="overview data" action={onRetry} />
    <div className="workspace-metrics-grid"><Metric label="ACTIVE AGENTS" value={metrics?.activeAgents != null ? String(metrics.activeAgents).padStart(2, '0') : '—'} detail={metrics ? 'reported by workspace' : 'awaiting API'} tone="success" /><Metric label="RUNNING EXECUTIONS" value={metrics?.runningExecutions != null ? String(metrics.runningExecutions).padStart(2, '0') : '—'} detail={metrics ? 'reported by workspace' : 'awaiting API'} /><Metric label="COMPLETED TASKS" value={metrics?.completedTasks != null ? String(metrics.completedTasks) : '—'} detail={metrics ? 'reported by workspace' : 'awaiting API'} tone="success" /><Metric label="PENDING APPROVALS" value={metrics?.pendingApprovals != null ? String(metrics.pendingApprovals).padStart(2, '0') : '—'} detail={metrics ? 'reported by workspace' : 'awaiting API'} tone="warning" /></div>
    <div className="workspace-two-col"><Panel title="Recent executions" eyebrow="WORK IN MOTION" action={<button className="panel-action" onClick={() => navigate('monitor')}>Open monitor <ArrowUpRight size={13} /></button>}><DataState result={overview?.state === 'success' ? (overviewData?.executions?.length ? { state: 'success', data: overviewData.executions } : { state: 'empty', data: null, message: 'The API returned no recent executions.' }) : overview} label="executions" />{overviewData?.executions?.length ? <div className="execution-list">{overviewData.executions.map((execution) => <div className="execution-row" key={execution.id}><span className="execution-state"><CircleDot size={14} /></span><span><strong>{execution.title}</strong><small>{execution.id} · {execution.agentCount ?? '—'} agents</small></span><StatusPill label={execution.status} tone={execution.status === 'completed' ? 'success' : execution.status === 'failed' ? 'danger' : 'blue'} /><ChevronRight size={15} /></div>)}</div> : null}</Panel><Panel title="Agent activity" eyebrow="RECENT SIGNALS" action={<button className="panel-action" onClick={() => navigate('agents')}>View agents <ArrowUpRight size={13} /></button>}><DataState result={overview?.state === 'success' ? (overviewData?.activity?.length ? { state: 'success', data: overviewData.activity } : { state: 'empty', data: null, message: 'The API returned no recent activity.' }) : overview} label="activity" />{overviewData?.activity?.length ? <div className="activity-list">{overviewData.activity.map((item) => <div className="activity-row" key={item.id}><span className="activity-dot" /><span><strong>{item.label}</strong><small>{item.detail}</small></span><time>{item.timestamp ?? '—'}</time></div>)}</div> : null}</Panel></div>
  </div>
}

function CommandView({ command, setCommand, mode, setMode, onSubmit }: { command: string; setCommand: (value: string) => void; mode: 'autopilot' | 'approval'; setMode: (mode: 'autopilot' | 'approval') => void; onSubmit: () => void }) {
  return <div className="workspace-view"><ViewHeader eyebrow="COMMAND CENTER / NATURAL LANGUAGE" title="Give the crew a direction." description="Describe an outcome. Crewflow will turn it into a plan, assign agents, and keep the execution observable." /><div className="command-layout"><div className="command-composer workspace-panel"><div className="composer-top"><span className="command-orb"><BrainCircuit size={20} /></span><span><strong>New request</strong><small>Draft only until the API accepts the request.</small></span><span className="composer-status">LOCAL DRAFT</span></div><textarea value={command} onChange={(event) => setCommand(event.target.value)} placeholder="e.g. Compare our five closest competitors and draft a positioning brief…" /><div className="composer-tools"><button><Plus size={15} /> Attach context</button><button><SlidersHorizontal size={15} /> Advanced options</button><button className="workspace-button primary" onClick={onSubmit}><Send size={15} /> Run request</button></div></div><div className="execution-mode workspace-panel"><div className="workspace-panel-head"><div><span className="workspace-eyebrow">EXECUTION CONTROL</span><h2>Choose a mode</h2></div><Settings2 size={16} /></div><button className={mode === 'autopilot' ? 'mode-option is-active' : 'mode-option'} onClick={() => setMode('autopilot')}><span className="mode-radio" /><span><strong>Autopilot</strong><small>Agents proceed within configured guardrails.</small></span></button><button className={mode === 'approval' ? 'mode-option is-active' : 'mode-option'} onClick={() => setMode('approval')}><span className="mode-radio" /><span><strong>Approval gates</strong><small>Pause before actions that need your review.</small></span></button><div className="mode-note"><ShieldCheck size={14} /> Permission policy is enforced by the backend.</div></div></div><div className="workspace-two-col command-lower"><Panel title="Execution plan" eyebrow="STRUCTURE BEFORE MOTION"><div className="plan-empty"><ListChecks size={20} /><strong>Your plan will appear here.</strong><span>Send a request to the configured API to generate a plan and agent assignment.</span></div></Panel><Panel title="Result" eyebrow="VERIFIED OUTPUT"><div className="plan-empty"><FileClock size={20} /><strong>No output yet.</strong><span>Completed work will appear here with source references and verification status.</span></div></Panel></div></div>
}

function AgentsView({ result, onRetry, onNotice }: { result: ApiResult<AgentRecord[]> | null; onRetry: () => void; onNotice: (message: string) => void }) {
  const agents = result?.state === 'success' ? result.data : null
  return <div className="workspace-view"><ViewHeader eyebrow="BUILD / AGENT STUDIO" title="Your workforce, configured with intent." description="Define roles, permissions, tools, and operating boundaries for every agent in the crew." action={<button className="workspace-button primary" onClick={() => onNotice('Agent creation requires a connected backend endpoint.')}><Plus size={15} /> Create agent</button>} /><div className="workspace-filter-row"><div className="workspace-search large"><Search size={15} /><input placeholder="Search agents" /><kbd>/</kbd></div><button className="filter-button"><SlidersHorizontal size={14} /> All statuses <ChevronDown size={14} /></button></div><Panel title="Agent roster" eyebrow="CONFIGURED AGENTS"><DataState result={result} label="agents" action={onRetry} />{agents?.length ? <div className="agent-roster">{agents.map((agent) => <div className="agent-row" key={agent.id}><span className="agent-avatar"><Bot size={17} /></span><span><strong>{agent.name}</strong><small>{agent.role ?? 'Role not provided'} · {agent.id}</small></span><span className="agent-capabilities">{agent.capabilities?.slice(0, 3).join(' · ') ?? 'Capabilities not reported'}</span><StatusPill label={agent.status} tone={agent.status === 'running' ? 'blue' : agent.status === 'idle' ? 'success' : agent.status === 'failed' ? 'danger' : 'warning'} /><div className="agent-controls"><button onClick={() => onNotice(`Control action for ${agent.name} requires backend permission.`)}>{agent.status === 'running' ? <Pause size={15} /> : <Play size={15} />}</button><button><MoreHorizontal size={15} /></button></div></div>)}</div> : null}</Panel></div>
}

function WorkflowsView({ result, onRetry, onNotice }: { result: ApiResult<WorkflowRecord[]> | null; onRetry: () => void; onNotice: (message: string) => void }) {
  const workflows = result?.state === 'success' ? result.data : null
  return <div className="workspace-view"><ViewHeader eyebrow="BUILD / WORKFLOW STUDIO" title="Make the handoffs visible." description="Compose sequential and parallel work without losing the shape of the system." action={<button className="workspace-button primary" onClick={() => onNotice('Workflow creation requires a connected backend endpoint.')}><Plus size={15} /> New workflow</button>} /><div className="workflow-studio-layout"><div className="workflow-canvas workspace-panel"><div className="canvas-toolbar"><span><Workflow size={15} /> Untitled workflow</span><span><button><UndoIcon /></button><button><RedoIcon /></button><button><MoreHorizontal size={15} /></button></span></div><div className="workflow-empty"><div className="workflow-empty-grid" /><span className="workflow-node"><Network size={18} /></span><strong>Build the first connection.</strong><span>Add agents and connect their outputs to create a real execution graph.</span><button className="workspace-button" onClick={() => onNotice('Adding nodes requires a connected backend endpoint.')}><Plus size={14} /> Add agent node</button></div></div><div className="workflow-templates workspace-panel"><div className="workspace-panel-head"><div><span className="workspace-eyebrow">STARTING POINTS</span><h2>Templates</h2></div><Grid2X2 size={16} /></div><div className="template-list"><button onClick={() => onNotice('Templates require a connected backend endpoint.')}><span className="template-icon"><GitBranch size={16} /></span><span><strong>Sequential review</strong><small>Agent → human approval → delivery</small></span><ChevronRight size={15} /></button><button onClick={() => onNotice('Templates require a connected backend endpoint.')}><span className="template-icon"><Layers3 size={16} /></span><span><strong>Parallel research</strong><small>Split a request across specialist agents</small></span><ChevronRight size={15} /></button><button onClick={() => onNotice('Templates require a connected backend endpoint.')}><span className="template-icon"><ShieldCheck size={16} /></span><span><strong>Guardrailed action</strong><small>Pause before external side effects</small></span><ChevronRight size={15} /></button></div></div></div><Panel title="Saved workflows" eyebrow="WORKFLOW LIBRARY"><DataState result={result} label="workflows" action={onRetry} />{workflows?.length ? <div className="simple-list">{workflows.map((workflow) => <div key={workflow.id}><span><strong>{workflow.name}</strong><small>{workflow.steps ?? '—'} steps · {workflow.id}</small></span><StatusPill label={workflow.status ?? 'unknown'} /><ChevronRight size={15} /></div>)}</div> : null}</Panel></div>
}

function MemoryView({ result, onRetry }: { result: ApiResult<MemoryRecord[]> | null; onRetry: () => void }) {
  const memories = result?.state === 'success' ? result.data : null
  return <div className="workspace-view"><ViewHeader eyebrow="OBSERVE / MEMORY HUB" title="Context with a clear owner." description="Search, inspect, edit, and remove the durable context your agents are allowed to use." action={<button className="workspace-button" disabled><Plus size={15} /> Add memory</button>} /><div className="workspace-search large memory-search"><Search size={15} /><input placeholder="Search memory records" /><kbd>⌘ K</kbd></div><Panel title="Memory records" eyebrow="PERSISTENT CONTEXT"><DataState result={result} label="memory records" action={onRetry} />{memories?.length ? <div className="simple-list">{memories.map((memory) => <div key={memory.id}><span className="memory-list-item"><span className="memory-icon"><Database size={15} /></span><span><strong>{memory.title}</strong><small>{memory.scope ?? 'Scope not provided'} · {memory.preview ?? memory.id}</small></span></span><time>{memory.updatedAt ?? '—'}</time><MoreHorizontal size={15} /></div>)}</div> : null}</Panel></div>
}

function MonitorView({ overview, onNavigate }: { overview: ApiResult<OverviewPayload> | null; onNavigate: (id: ViewId) => void }) {
  return <div className="workspace-view"><ViewHeader eyebrow="OBSERVE / LIVE MONITOR" title="See the work as it moves." description="Follow execution steps, agent logs, tool calls, and recovery events from one timeline." action={<button className="workspace-button" onClick={() => onNavigate('command')}><Command size={15} /> New execution</button>} /><div className="monitor-grid"><Panel title="Execution timeline" eyebrow="REAL-TIME STREAM"><DataState result={overview?.state === 'success' && overview.data?.executions?.length ? { state: 'success', data: overview.data.executions } : overview} label="live executions" /><div className="monitor-empty"><Radio size={20} /><strong>No execution selected.</strong><span>Choose an execution from Overview once the backend reports live work.</span></div></Panel><Panel title="Agent logs" eyebrow="TOOL CALLS + EVENTS"><div className="log-console"><div><span className="log-dot green" /><span>Awaiting an execution stream</span></div><div><span className="log-dot" /><span>EventSource will connect at /api/executions/:id/events</span></div><div><span className="log-dot" /><span>Logs remain empty until the API sends events.</span></div></div></Panel></div><Panel title="Task output" eyebrow="VERIFIED RESULT"><div className="monitor-empty horizontal"><FileClock size={20} /><span><strong>No task output selected.</strong><small>Outputs will be rendered with their verification and source metadata.</small></span></div></Panel></div>
}

function ApprovalsView({ result, onRetry, onNotice }: { result: ApiResult<ApprovalRecord[]> | null; onRetry: () => void; onNotice: (message: string) => void }) {
  const approvals = result?.state === 'success' ? result.data : null
  return <div className="workspace-view"><ViewHeader eyebrow="CONTROL / APPROVAL CENTER" title="Decisions, not interruptions." description="Review risky actions with enough context to approve or reject them confidently." /><div className="approval-layout"><Panel title="Pending actions" eyebrow="AWAITING YOUR DECISION"><DataState result={result} label="pending approvals" action={onRetry} />{approvals?.length ? <div className="approval-list">{approvals.map((approval) => <div key={approval.id} className="approval-card"><div><StatusPill label={`${approval.risk ?? 'unknown'} risk`} tone={approval.risk === 'high' ? 'danger' : approval.risk === 'medium' ? 'warning' : 'neutral'} /><h3>{approval.title}</h3><p>{approval.requester ?? 'Requester not provided'} · {approval.id}</p></div><div className="approval-actions"><button onClick={() => onNotice('Approve action requires backend permission.')}><Check size={14} /> Approve</button><button onClick={() => onNotice('Reject action requires backend permission.')}><X size={14} /> Reject</button></div></div>)}</div> : null}</Panel><Panel title="Approval policy" eyebrow="GUARDRAILS"><div className="policy-card"><ShieldCheck size={18} /><div><strong>Backend-owned permissions</strong><span>Risk levels, action details, and approval history are read from the connected workspace. This frontend never approves a side effect locally.</span></div></div></Panel></div></div>
}

function IntegrationsView({ result, onRetry, onNotice }: { result: ApiResult<IntegrationRecord[]> | null; onRetry: () => void; onNotice: (message: string) => void }) {
  const integrations = result?.state === 'success' ? result.data : null
  return <div className="workspace-view"><ViewHeader eyebrow="SYSTEM / INTEGRATIONS HUB" title="Connect the tools that do the work." description="Inspect connections, OpenCode runtime health, and diagnostics without hiding the state of the system." action={<button className="workspace-button primary" onClick={() => onNotice('Connection setup requires a connected backend endpoint.')}><Plus size={15} /> Connect tool</button>} /><div className="runtime-card workspace-panel"><div className="runtime-icon"><Terminal size={19} /></div><div><span className="workspace-eyebrow">RUNTIME</span><h2>OpenCode runtime</h2><p>Status is not inferred locally. The backend must report the active runtime, version, and diagnostics.</p></div><StatusPill label="Not connected" /></div><Panel title="Connected tools" eyebrow="SERVICE CONNECTIONS"><DataState result={result} label="integrations" action={onRetry} />{integrations?.length ? <div className="simple-list">{integrations.map((integration) => <div key={integration.id}><span className="integration-list-item"><span className="integration-icon"><CableIcon size={15} /></span><span><strong>{integration.name}</strong><small>{integration.detail ?? integration.id}</small></span></span><StatusPill label={integration.status} tone={integration.status === 'connected' ? 'success' : integration.status === 'degraded' ? 'warning' : 'danger'} /><button className="list-icon" onClick={() => onNotice('Diagnostics require a connected backend endpoint.')}><ArrowUpRight size={15} /></button></div>)}</div> : null}</Panel><div className="diagnostic-strip"><AlertTriangle size={16} /><span><strong>Diagnostics stay honest.</strong> No connection status is shown as healthy until the backend confirms it.</span><button onClick={() => onNotice('Connection diagnostics require a connected backend endpoint.')}>Run diagnostics <ArrowUpRight size={14} /></button></div></div>
}

function UndoIcon() { return <ArrowDownLeft size={15} /> }
function RedoIcon() { return <ArrowUpRight size={15} /> }

export default AppShell
