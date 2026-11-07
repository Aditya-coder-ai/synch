import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Cable,
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
import {
  endpoints,
  type ApiResult,
  type AgentRecord,
  type ApprovalRecord,
  type IntegrationRecord,
  type MemoryRecord,
  type OverviewPayload,
  type WorkflowRecord,
} from './api'

type ViewId = 'overview' | 'command' | 'agents' | 'workflows' | 'memory' | 'monitor' | 'approvals' | 'integrations'

type NavItem = { id: ViewId; label: string; icon: LucideIcon; group?: string }

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Grid2X2 },
  { id: 'command', label: 'Command center', icon: Command },
  { id: 'agents', label: 'Agent studio', icon: Bot, group: 'Configure' },
  { id: 'workflows', label: 'Workflow studio', icon: Workflow },
  { id: 'monitor', label: 'Live monitor', icon: Radio, group: 'Governance' },
  { id: 'approvals', label: 'Approval center', icon: ShieldCheck },
  { id: 'memory', label: 'Memory hub', icon: Database },
  { id: 'integrations', label: 'Integrations hub', icon: Network, group: 'System' },
]

interface AppShellProps {
  onSignOut: () => void
}

export default function AppShell({ onSignOut }: AppShellProps) {
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [overview, setOverview] = useState<ApiResult<OverviewPayload> | null>(null)
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [memories, setMemories] = useState<MemoryRecord[]>([])
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([])
  const [command, setCommand] = useState('')
  const [commandMode, setCommandMode] = useState<'autopilot' | 'approval'>('autopilot')
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<'all' | 'running' | 'idle' | 'paused'>('all')

  const activeNav = navItems.find((item) => item.id === activeView) ?? navItems[0]

  const loadAllData = async () => {
    setOverview({ state: 'loading', data: null, message: '' })
    const [ov, ag, wf, mem, app, intg] = await Promise.all([
      endpoints.overview(),
      endpoints.agents(),
      endpoints.workflows(),
      endpoints.memory(),
      endpoints.approvals(),
      endpoints.integrations(),
    ])
    setOverview(ov)
    if (ag.state === 'success') setAgents(ag.data)
    if (wf.state === 'success') setWorkflows(wf.data)
    if (mem.state === 'success') setMemories(mem.data)
    if (app.state === 'success') setApprovals(app.data)
    if (intg.state === 'success') setIntegrations(intg.data)
  }

  useEffect(() => {
    void loadAllData()
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const pendingApprovalsCount = useMemo(() => {
    return approvals.filter((a) => a.status === 'pending').length
  }, [approvals])

  const handleApprove = async (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' as const } : item))
    )
    const result = await endpoints.approveAction(id)
    setNotice(result.message || `Checkpoint ${id} authorized. Execution resumed.`)
  }

  const handleReject = async (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' as const } : item))
    )
    const result = await endpoints.rejectAction(id)
    setNotice(result.message || `Checkpoint ${id} rejected by operator. Work halted.`)
  }

  const handleToggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((ag) => {
        if (ag.id !== id) return ag
        const nextStatus = ag.status === 'running' ? 'paused' : 'running'
        setNotice(`Agent ${ag.name} set to ${nextStatus}.`)
        return { ...ag, status: nextStatus }
      })
    )
  }

  const navigate = (id: ViewId) => {
    setActiveView(id)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const overviewData = overview?.state === 'success' ? overview.data : null

  return (
    <div className="workspace-shell">
      {/* Sidebar Navigation */}
      <aside className={`workspace-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="workspace-brand-row">
          <button type="button" className="brand-lockup" onClick={() => navigate('overview')}>
            <span className="brand-glyph" aria-hidden="true" />
            <span className="brand-word">crewflow</span>
          </button>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="workspace-switcher">
          <span className="workspace-avatar">AC</span>
          <div className="switcher-info">
            <strong>Acme Enterprise Core</strong>
            <span className="measured">us-east · prod-cluster</span>
          </div>
          <ChevronDown size={14} className="switcher-arrow" />
        </div>

        {/* Navigation Items */}
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isApprovals = item.id === 'approvals'
            return (
              <div key={item.id}>
                {item.group && <span className="workspace-nav-group">{item.group}</span>}
                <button
                  type="button"
                  className={activeView === item.id ? 'is-active' : ''}
                  onClick={() => navigate(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {isApprovals && pendingApprovalsCount > 0 && (
                    <span className="nav-badge measured">{pendingApprovalsCount}</span>
                  )}
                </button>
              </div>
            )
          })}
        </nav>

        {/* Footer controls */}
        <div className="workspace-sidebar-foot">
          <button type="button" className="foot-btn" onClick={() => setNotice('Connected to cluster: fastify-node-01')}>
            <Terminal size={15} /> <span className="measured">Fastify node v0.1.0</span>
          </button>
          <button type="button" className="foot-btn" onClick={onSignOut}>
            <X size={15} /> <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="workspace-main">
        {/* Top Header Bar */}
        <header className="workspace-topbar">
          <div className="workspace-top-left">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <div className="workspace-breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>{activeNav.label}</strong>
            </div>
          </div>

          <div className="workspace-top-actions">
            <div className="workspace-search-bar">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search workspace (agents, DAGs, memory)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Quick search"
              />
              <kbd className="measured">⌘ K</kbd>
            </div>
            <div className="engine-ping measured">
              <span className="ping-dot" />
              <span>8ms latency</span>
            </div>
            <button
              type="button"
              className="btn btn--subtle btn--pill"
              onClick={onSignOut}
              title="Return to public landing"
            >
              Exit workspace
            </button>
          </div>
        </header>

        {/* Active View Container */}
        <div className="workspace-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              className="view-wrapper"
            >
              {activeView === 'overview' && (
                <OverviewView
                  overviewData={overviewData}
                  approvalsCount={pendingApprovalsCount}
                  onNavigate={navigate}
                  onRefresh={loadAllData}
                />
              )}

              {activeView === 'command' && (
                <CommandView
                  command={command}
                  setCommand={setCommand}
                  mode={commandMode}
                  setMode={setCommandMode}
                  onNotice={setNotice}
                />
              )}

              {activeView === 'agents' && (
                <AgentsView
                  agents={agents}
                  searchQuery={searchQuery}
                  filter={selectedAgentFilter}
                  setFilter={setSelectedAgentFilter}
                  onToggleAgent={handleToggleAgent}
                  onNotice={setNotice}
                />
              )}

              {activeView === 'workflows' && (
                <WorkflowsView
                  workflows={workflows}
                  onNotice={setNotice}
                />
              )}

              {activeView === 'monitor' && (
                <MonitorView
                  overviewData={overviewData}
                  onNotice={setNotice}
                />
              )}

              {activeView === 'approvals' && (
                <ApprovalsView
                  approvals={approvals}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onNotice={setNotice}
                />
              )}

              {activeView === 'memory' && (
                <MemoryView
                  memories={memories}
                  searchQuery={searchQuery}
                  onNotice={setNotice}
                />
              )}

              {activeView === 'integrations' && (
                <IntegrationsView
                  integrations={integrations}
                  onRefresh={loadAllData}
                  onNotice={setNotice}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Status Notification */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16 }}
            className="hallmark-toast"
            role="status"
          >
            <span className="toast-bullet" />
            <span className="toast-text">{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   View Components
   ========================================================================== */

function OverviewView({
  overviewData,
  approvalsCount,
  onNavigate,
  onRefresh,
}: {
  overviewData: OverviewPayload | null
  approvalsCount: number
  onNavigate: (id: ViewId) => void
  onRefresh: () => void
}) {
  const metrics = overviewData?.metrics

  return (
    <div className="overview-container">
      {/* View Header */}
      <div className="workspace-view-head">
        <div>
          <h1>Operations Overview</h1>
          <p>Real-time telemetry and execution monitoring across active agent workflows.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn--subtle" onClick={onRefresh}>
            <RefreshCw size={14} /> Refresh telemetry
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onNavigate('command')}>
            <Command size={14} /> Dispatch command
          </button>
        </div>
      </div>

      {/* Live Health Banner */}
      <div className="system-health-strip panels">
        <div className="health-card">
          <div className="health-lead">
            <span className="status-ping" />
            <div>
              <strong>{overviewData?.health?.label ?? 'Backend active'}</strong>
              <span className="health-detail">{overviewData?.health?.detail ?? 'Local Fastify node running normally'}</span>
            </div>
          </div>
          <div className="health-stats measured">
            <span>Uptime: <strong>{overviewData?.health?.uptime ?? '99.98%'}</strong></span>
            <span>Cluster: <strong>node-east-01</strong></span>
            <span>Protocol: <strong>Mutual TLS</strong></span>
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="workspace-metrics-grid">
        <div className="workspace-metric" onClick={() => onNavigate('agents')}>
          <span className="metric-label">Active agent fleet</span>
          <strong className="measured">{metrics?.activeAgents ? String(metrics.activeAgents).padStart(2, '0') : '05'}</strong>
          <small className="metric-sub measured">Specialists in runtime</small>
        </div>

        <div className="workspace-metric" onClick={() => onNavigate('monitor')}>
          <span className="metric-label">Executions in motion</span>
          <strong className="measured">{metrics?.runningExecutions ? String(metrics.runningExecutions).padStart(2, '0') : '02'}</strong>
          <small className="metric-sub measured">Parallel DAG streams</small>
        </div>

        <div className="workspace-metric" onClick={() => onNavigate('approvals')}>
          <span className="metric-label">Approval barriers</span>
          <strong className="measured tag-operator">{approvalsCount ? String(approvalsCount).padStart(2, '0') : '00'}</strong>
          <small className="metric-sub measured">Requiring authorization</small>
        </div>

        <div className="workspace-metric" onClick={() => onNavigate('memory')}>
          <span className="metric-label">Context tokens used</span>
          <strong className="measured">{metrics?.totalTokens ?? '1.42M'}</strong>
          <small className="metric-sub measured">Shared workspace memory</small>
        </div>
      </div>

      {/* Two-column workbench: Executions & Signals */}
      <div className="workspace-two-col">
        {/* Active Executions */}
        <div className="workspace-panel">
          <div className="workspace-panel-head">
            <h2>Active executions</h2>
            <button type="button" className="btn btn--subtle btn--pill" onClick={() => onNavigate('monitor')}>
              Open monitor <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="execution-ledger">
            {overviewData?.executions.map((exec) => (
              <div key={exec.id} className="execution-row">
                <div className="exec-meta">
                  <span className="exec-title">{exec.title}</span>
                  <div className="exec-sub measured">
                    <span>{exec.id}</span>
                    <span>·</span>
                    <span>{exec.agentCount} agents</span>
                    <span>·</span>
                    <span>{exec.updatedAt}</span>
                  </div>
                </div>
                <div className="exec-progress-block">
                  <div className="exec-progress-track">
                    <span style={{ width: `${exec.progress}%` }} />
                  </div>
                  <span className="exec-pct measured">{exec.progress}%</span>
                </div>
                <span className={`status-pill pill-${exec.status} measured`}>
                  {exec.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Signal Activity */}
        <div className="workspace-panel">
          <div className="workspace-panel-head">
            <h2>Agent signal audit</h2>
            <button type="button" className="btn btn--subtle btn--pill" onClick={() => onNavigate('agents')}>
              Fleet view <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="activity-ledger">
            {overviewData?.activity.map((act) => (
              <div key={act.id} className="activity-row">
                <span className={`signal-indicator role-${act.role}`} />
                <div className="activity-body">
                  <strong>{act.label}</strong>
                  <span>{act.detail}</span>
                </div>
                <span className="measured activity-time">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CommandView({
  command,
  setCommand,
  mode,
  setMode,
  onNotice,
}: {
  command: string
  setCommand: (val: string) => void
  mode: 'autopilot' | 'approval'
  setMode: (val: 'autopilot' | 'approval') => void
  onNotice: (msg: string) => void
}) {
  const [compiling, setCompiling] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<string[] | null>(null)

  const handleRun = async () => {
    if (!command.trim()) {
      onNotice('Please enter an objective before dispatching.')
      return
    }
    setCompiling(true)
    onNotice('Compiling task dependency graph and querying orchestration engine...')
    try {
      const res = await endpoints.dispatchOrchestration(command)
      setCompiling(false)
      if (res.success && res.plan) {
        setGeneratedPlan(res.plan)
        onNotice(`Execution DAG scheduled (${res.orchestrationId}).`)
      } else {
        onNotice(res.error || 'Failed to dispatch orchestration.')
      }
    } catch {
      setCompiling(false)
      onNotice('Orchestration dispatch encountered an issue.')
    }
  }

  return (
    <div className="command-view-container">
      <div className="workspace-view-head">
        <div>
          <h1>Command Center</h1>
          <p>Compose natural-language objectives into verified, executable agent DAGs.</p>
        </div>
      </div>

      <div className="command-grid">
        {/* Objective Composer */}
        <div className="workspace-panel composer-panel">
          <div className="composer-header">
            <span className="measured caption">Objective prompt</span>
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-btn ${mode === 'autopilot' ? 'is-active' : ''}`}
                onClick={() => setMode('autopilot')}
              >
                Autopilot mode
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === 'approval' ? 'is-active' : ''}`}
                onClick={() => setMode('approval')}
              >
                Approval gate mode
              </button>
            </div>
          </div>

          <textarea
            className="composer-textarea"
            rows={5}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Describe an objective (e.g. Conduct complete security audit across API endpoints, synthesize patch diffs, and generate test assertions)..."
          />

          <div className="composer-footer">
            <span className="measured composer-hint">
              Mode: {mode === 'autopilot' ? 'Continuous execution' : 'Pause before critical side-effects'}
            </span>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleRun}
              disabled={compiling}
            >
              {compiling ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
              {compiling ? 'Compiling graph...' : 'Dispatch objective'}
            </button>
          </div>
        </div>

        {/* Execution Plan Preview */}
        <div className="workspace-panel plan-panel">
          <div className="workspace-panel-head">
            <h2>Compiled execution plan</h2>
            <span className="measured tag-instrument">DAG schedule</span>
          </div>

          {generatedPlan ? (
            <div className="plan-steps-list">
              {generatedPlan.map((step, idx) => (
                <div key={step} className="plan-step-item">
                  <span className="plan-index measured">0{idx + 1}</span>
                  <span className="plan-text">{step}</span>
                  <span className="measured plan-badge">
                    {idx === 4 ? 'barrier' : idx === 0 ? 'completed' : 'scheduled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-box">
              <ListChecks size={24} className="empty-icon" />
              <strong>No active plan compiled</strong>
              <p>Enter an objective on the left and dispatch to generate the multi-agent execution sequence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AgentsView({
  agents,
  searchQuery,
  filter,
  setFilter,
  onToggleAgent,
  onNotice,
}: {
  agents: AgentRecord[]
  searchQuery: string
  filter: 'all' | 'running' | 'idle' | 'paused'
  setFilter: (f: 'all' | 'running' | 'idle' | 'paused') => void
  onToggleAgent: (id: string) => void
  onNotice: (msg: string) => void
}) {
  const filtered = useMemo(() => {
    return agents.filter((ag) => {
      const matchesFilter = filter === 'all' || ag.status === filter
      const matchesSearch =
        !searchQuery ||
        ag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ag.role.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [agents, filter, searchQuery])

  return (
    <div className="agents-view-container">
      <div className="workspace-view-head">
        <div>
          <h1>Agent Studio</h1>
          <p>Configure agent roles, execution models, tool scopes, and operational states.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onNotice('New agent configuration modal initialized.')}
        >
          <Plus size={14} /> Add specialist agent
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <div className="filter-pills">
          {(['all', 'running', 'idle', 'paused'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-pill ${filter === st ? 'is-active' : ''}`}
              onClick={() => setFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
        <span className="measured filter-count">{filtered.length} agents configured</span>
      </div>

      {/* Agent Fleet Grid */}
      <div className="agent-fleet-grid">
        {filtered.map((agent) => (
          <div key={agent.id} className="agent-card panels">
            <div className="agent-card-inner">
              <div className="agent-card-top">
                <div className="agent-id-lockup">
                  <span className={`agent-status-ring status-${agent.status}`} />
                  <div>
                    <h3>{agent.name}</h3>
                    <span className="agent-role-text">{agent.role}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn btn--pill ${agent.status === 'running' ? 'btn--accent' : 'btn--subtle'}`}
                  onClick={() => onToggleAgent(agent.id)}
                >
                  {agent.status === 'running' ? <Pause size={12} /> : <Play size={12} />}
                  {agent.status === 'running' ? 'Pause' : 'Start'}
                </button>
              </div>

              <div className="agent-spec-meta measured">
                <div>Model: <strong>{agent.model}</strong></div>
                <div>Memory: <strong>{agent.memoryScope}</strong></div>
                <div>Runtime: <strong>OpenCode isolated</strong></div>
              </div>

              <div className="agent-capabilities-list">
                {agent.capabilities.map((cap) => (
                  <span key={cap} className="cap-pill">{cap}</span>
                ))}
              </div>

              <div className="agent-card-foot">
                <span className="measured">Status: <strong className={`tag-${agent.status}`}>{agent.status}</strong></span>
                <span className="measured">Last cycle: {agent.updatedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkflowsView({
  workflows,
  onNotice,
}: {
  workflows: WorkflowRecord[]
  onNotice: (msg: string) => void
}) {
  return (
    <div className="workflows-view-container">
      <div className="workspace-view-head">
        <div>
          <h1>Workflow Studio</h1>
          <p>Compose sequential and parallel agent execution graphs with explicit verification checkpoints.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onNotice('New workflow canvas ready.')}
        >
          <Plus size={14} /> Compose workflow
        </button>
      </div>

      {/* Visual Canvas Card */}
      <div className="workspace-panel canvas-panel">
        <div className="canvas-header">
          <div className="canvas-meta">
            <Workflow size={16} className="canvas-icon" />
            <strong>Visual DAG Editor: Repository Audit & Remediation</strong>
            <span className="measured tag-instrument">6 nodes · 2 barriers</span>
          </div>
          <button
            type="button"
            className="btn btn--subtle btn--pill"
            onClick={() => onNotice('Canvas layout locked.')}
          >
            Auto-layout DAG
          </button>
        </div>

        {/* Visual Graph Nodes */}
        <div className="visual-dag-board">
          <div className="dag-node node-trigger">
            <span className="node-type measured">Trigger</span>
            <strong>Webhook Event</strong>
            <span className="node-sub measured">GitHub PR opened</span>
          </div>

          <div className="dag-connector-line" />

          <div className="dag-node node-agent">
            <span className="node-type measured">Specialist Node</span>
            <strong>Research Agent</strong>
            <span className="node-sub measured">Diff & Context Scan</span>
          </div>

          <div className="dag-connector-line" />

          <div className="dag-node node-barrier">
            <span className="node-type measured">Verification Gate</span>
            <strong>Security Sentinel</strong>
            <span className="node-sub measured">Cryptographic digest</span>
          </div>

          <div className="dag-connector-line" />

          <div className="dag-node node-agent">
            <span className="node-type measured">Execution Node</span>
            <strong>Code Architect</strong>
            <span className="node-sub measured">Synthesize Patch</span>
          </div>
        </div>
      </div>

      {/* Workflow Roster */}
      <div className="workspace-panel">
        <div className="workspace-panel-head">
          <h2>Configured workflows</h2>
          <span className="measured">{workflows.length} published</span>
        </div>
        <div className="workflows-list">
          {workflows.map((wf) => (
            <div key={wf.id} className="workflow-row">
              <div className="wf-info">
                <strong>{wf.name}</strong>
                <span className="wf-sub measured">
                  {wf.id} · Trigger: {wf.trigger} · {wf.steps} execution steps
                </span>
              </div>
              <span className={`status-pill pill-${wf.status} measured`}>
                {wf.status}
              </span>
              <button
                type="button"
                className="btn btn--subtle btn--pill"
                onClick={() => onNotice(`Workflow ${wf.name} triggered.`)}
              >
                Run now <ArrowUpRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MonitorView({
  overviewData,
  onNotice,
}: {
  overviewData: OverviewPayload | null
  onNotice: (msg: string) => void
}) {
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'approvals'>('all')

  const logs = [
    { time: '14:24:02.102', level: 'INFO', source: 'orchestrator', text: 'DAG dag-8f4d node 03 completed assertion check' },
    { time: '14:24:00.819', level: 'BARRIER', source: 'security', text: 'Operator approval required for production schema update' },
    { time: '14:23:58.411', level: 'INFO', source: 'agent-02', text: 'OpenCode sandbox emitted patch: +42 lines, -12 lines' },
    { time: '14:23:55.190', level: 'INFO', source: 'agent-01', text: 'Context retrieval fetched 18 memory records in 4ms' },
    { time: '14:23:51.020', level: 'INFO', source: 'runtime', text: 'Fastify SSE event stream connected on /api/v1/orchestrations/stream' },
  ]

  return (
    <div className="monitor-view-container">
      <div className="workspace-view-head">
        <div>
          <h1>Live Monitor</h1>
          <p>Real-time execution traces, tool call logs, and streaming event telemetry.</p>
        </div>
        <button
          type="button"
          className="btn btn--subtle"
          onClick={() => onNotice('Telemetry buffer cleared.')}
        >
          Clear buffer
        </button>
      </div>

      <div className="monitor-grid-layout">
        {/* Terminal log panel */}
        <div className="workspace-panel terminal-panel">
          <div className="terminal-top">
            <span className="terminal-title measured">telemetry_stream · live</span>
            <div className="terminal-controls">
              <button
                type="button"
                className={`filter-pill ${logFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setLogFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-pill ${logFilter === 'approvals' ? 'is-active' : ''}`}
                onClick={() => setLogFilter('approvals')}
              >
                Barriers
              </button>
            </div>
          </div>

          <div className="terminal-screen measured">
            {logs.map((log, idx) => (
              <div key={idx} className={`log-line level-${log.level.toLowerCase()}`}>
                <span className="log-time">{log.time}</span>
                <span className={`log-level level-tag-${log.level.toLowerCase()}`}>{log.level}</span>
                <span className="log-source">[{log.source}]</span>
                <span className="log-msg">{log.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected execution detail */}
        <div className="workspace-panel execution-inspector">
          <div className="workspace-panel-head">
            <h2>Active Node Inspection</h2>
            <span className="measured tag-instrument">dag-8f4d</span>
          </div>

          <div className="inspector-content">
            <div className="inspector-field">
              <span className="measured label">Target task</span>
              <p>Security and Dependency Vulnerability Audit</p>
            </div>
            <div className="inspector-field">
              <span className="measured label">Active agent</span>
              <p>Code Architect (ag-02) in OpenCode sandbox</p>
            </div>
            <div className="inspector-field">
              <span className="measured label">Verification status</span>
              <p className="tag-operator">Pending human cryptographic approval</p>
            </div>
            <div className="inspector-field">
              <span className="measured label">Streaming route</span>
              <p className="measured">GET /api/v1/orchestrations/dag-8f4d/stream</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalsView({
  approvals,
  onApprove,
  onReject,
  onNotice,
}: {
  approvals: ApprovalRecord[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onNotice: (msg: string) => void
}) {
  return (
    <div className="approvals-view-container">
      <div className="workspace-view-head">
        <div>
          <h1>Approval Center</h1>
          <p>Human-in-the-loop governance: review and authorize critical agent operations.</p>
        </div>
        <span className="measured approvals-counter">
          {approvals.filter((a) => a.status === 'pending').length} pending actions
        </span>
      </div>

      <div className="approvals-grid">
        {approvals.map((app) => (
          <div key={app.id} className={`approval-card panels risk-${app.risk}`}>
            <div className="approval-card-inner">
              <div className="approval-card-top">
                <div>
                  <span className={`risk-badge measured risk-tag-${app.risk}`}>{app.risk} risk</span>
                  <h3>{app.title}</h3>
                </div>
                <span className={`status-pill pill-${app.status} measured`}>{app.status}</span>
              </div>

              <p className="approval-description">{app.details}</p>

              <div className="approval-meta measured">
                <span>Requester: <strong>{app.requester}</strong></span>
                <span>Type: <strong>{app.actionType}</strong></span>
                <span>Time: <strong>{app.requestedAt}</strong></span>
              </div>

              {app.status === 'pending' ? (
                <div className="approval-action-bar">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onApprove(app.id)}
                  >
                    <Check size={14} /> Authorize action
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={() => onReject(app.id)}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              ) : (
                <div className="approval-resolved-bar measured">
                  Resolution logged in audit ledger: <strong>{app.status}</strong>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MemoryView({
  memories,
  searchQuery,
  onNotice,
}: {
  memories: MemoryRecord[]
  searchQuery: string
  onNotice: (msg: string) => void
}) {
  const filtered = useMemo(() => {
    return memories.filter(
      (m) =>
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [memories, searchQuery])

  return (
    <div className="memory-view-container">
      <div className="workspace-view-head">
        <div>
          <h1>Memory Hub</h1>
          <p>Hierarchical contextual memory records shared across agent orchestration cycles.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onNotice('Memory entry dialog ready.')}
        >
          <Plus size={14} /> Record memory
        </button>
      </div>

      <div className="memory-grid">
        {filtered.map((mem) => (
          <div key={mem.id} className="memory-card panels">
            <div className="memory-card-inner">
              <div className="memory-card-header">
                <div>
                  <span className="measured memory-scope tag-instrument">{mem.scope} scope · {mem.category}</span>
                  <h3>{mem.title}</h3>
                </div>
                <Database size={16} className="mem-icon" />
              </div>
              <p className="memory-content-text">{mem.content}</p>
              <div className="memory-card-foot measured">
                <span>Record ID: {mem.id}</span>
                <span>Updated: {mem.updatedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IntegrationsView({
  integrations,
  onRefresh,
  onNotice,
}: {
  integrations: IntegrationRecord[]
  onRefresh: () => void
  onNotice: (msg: string) => void
}) {
  return (
    <div className="integrations-view-container">
      <div className="workspace-view-head">
        <div>
          <h1>Integrations Hub</h1>
          <p>Connected sandboxes, message brokers, databases, and continuous delivery services.</p>
        </div>
        <button
          type="button"
          className="btn btn--subtle"
          onClick={() => {
            onRefresh()
            onNotice('Re-pinged live cluster endpoints: OpenCode, Switch, DB, CI/CD updated.')
          }}
        >
          <RefreshCw size={14} /> Run cluster diagnostics
        </button>
      </div>

      <div className="integrations-grid">
        {integrations.map((intg) => (
          <div key={intg.id} className="integration-card panels">
            <div className="integration-card-inner">
              <div className="intg-top">
                <Network size={20} className="intg-icon" />
                <span className={`status-pill pill-${intg.status} measured`}>{intg.status}</span>
              </div>
              <h3>{intg.name}</h3>
              <p>{intg.detail}</p>
              <div className="intg-foot measured">
                <span>Category: <strong>{intg.category}</strong></span>
                <span>Latency: <strong>{intg.latency}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
