import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  GitBranch,
  ListChecks,
  Menu,
  Play,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users2,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  api,
  type BackendHealth,
  type OrchestrationSummary,
  type ApprovalItem,
  type MemoryItem,
} from './api/client'

type ProductTab = 'Agent Hub' | 'Workflow Studio' | 'Task Manager' | 'Live Execution' | 'Human Approvals' | 'Memory Center'

interface DisplayRow {
  label: string
  value: string
  tone: string
  id?: string
  isPending?: boolean
}

const navItems = ['Product', 'How it works', 'Capabilities', 'Security']

const workflowSteps = [
  { number: '01', title: 'Parse', text: 'Validate user objective, project context, and operational constraints.', icon: BrainCircuit },
  { number: '02', title: 'Plan', text: 'Generate dependency-aware execution plan with topological task sorting.', icon: ListChecks },
  { number: '03', title: 'Dispatch', text: 'Bind tasks to qualified agents with capability matching.', icon: Users2 },
  { number: '04', title: 'Execute', text: 'Run commands in OpenCode sandbox with streaming verification.', icon: Play },
  { number: '05', title: 'Govern', text: 'Intercept sensitive operations with risk-calibrated approval gates.', icon: ShieldCheck },
  { number: '06', title: 'Persist', text: 'Store outcomes, decisions, and lessons in shared project memory.', icon: CheckCircle2 },
]

const heroAgents = [
  { name: 'Coordinator', role: 'Decomposition and DAG planning', tone: 'blue', icon: GitBranch },
  { name: 'Developer', role: 'Runtime execution and code synthesis', tone: 'sand', icon: Play },
  { name: 'Reviewer', role: 'Verification and policy enforcement', tone: 'green', icon: ShieldCheck },
]

const capabilityPanels: { role: string; title: string; text: string }[] = [
  {
    role: 'Orchestration',
    title: 'Decompose complex goals into dependency graphs',
    text: 'CrewFlow validates project scope, decomposes objectives into atomic tasks, and plans DAG execution.',
  },
  {
    role: 'Delegation',
    title: 'Route tasks to specialized agent capabilities',
    text: 'Selects the optimal agent role based on task constraints, required tools, and execution context.',
  },
  {
    role: 'Execution',
    title: 'Execute code inside isolated OpenCode runtimes',
    text: 'Runs agent sessions in managed sandbox workspaces with continuous stdout streaming and event logging.',
  },
  {
    role: 'Shared memory',
    title: 'Accumulate cross-session project intelligence',
    text: 'Stores decisions, technical conventions, and past run results in searchable vector and relational memory.',
  },
  {
    role: 'Observability',
    title: 'Trace execution through immutable audit trails',
    text: 'Every agent transition, tool call, and state mutation is permanently recorded in PostgreSQL.',
  },
  {
    role: 'Governance',
    title: 'Enforce human authorization for risky operations',
    text: 'Classifies actions from L0 to L4 risk, automatically blocking sensitive operations until human sign-off.',
  },
]

const defaultTabRows: Record<ProductTab, { title: string; text: string; icon: LucideIcon; rows: { label: string; value: string; tone: string; id?: string }[] }> = {
  'Agent Hub': {
    title: 'Autonomous agent registry',
    text: 'Active agent workers, capability bindings, and current execution state.',
    icon: Users2,
    rows: [
      { label: 'Coordinator Agent', value: 'Orchestrating (active)', tone: 'blue' },
      { label: 'Developer Agent', value: '4 tasks in progress', tone: 'sand' },
      { label: 'QA Agent', value: '2 tasks ready', tone: 'green' },
      { label: 'Reviewer Agent', value: '1 task ready', tone: 'green' },
    ],
  },
  'Workflow Studio': {
    title: 'Execution workflow pipelines',
    text: 'Composed task graphs, dependency ordering, and verification gates.',
    icon: Workflow,
    rows: [
      { label: 'Market intelligence pipeline', value: '8 steps (published)', tone: 'blue' },
      { label: 'Content QA and verification loop', value: '5 steps (draft)', tone: 'sand' },
      { label: 'Customer signal triage flow', value: '12 steps (published)', tone: 'green' },
    ],
  },
  'Task Manager': {
    title: 'Scheduled task tracking',
    text: 'Task queue state, dependencies, assigned agents, and outcomes.',
    icon: ListChecks,
    rows: [
      { label: 'Decompose Q3 positioning brief', value: 'Completed', tone: 'green' },
      { label: 'Execute competitor capability matrix', value: 'In progress', tone: 'blue' },
      { label: 'Production release deployment', value: 'Requires approval', tone: 'sand' },
    ],
  },
  'Live Execution': {
    title: 'Runtime telemetry stream',
    text: 'Real-time agent events, command execution, and workspace state changes.',
    icon: Activity,
    rows: [
      { label: 'RUNTIME_CONNECTED: OpenCode Server v1.19.5', value: 'Complete (00:01)', tone: 'green' },
      { label: 'SESSION_INITIALIZED: Agent sandbox allocated', value: 'Complete (00:03)', tone: 'green' },
      { label: 'EXECUTION_PROGRESS: Workspace evidence verified', value: 'Running (00:14)', tone: 'blue' },
    ],
  },
  'Human Approvals': {
    title: 'Authorized human governance',
    text: 'Pending operations requiring human review before runtime execution.',
    icon: ShieldAlert,
    rows: [
      { label: 'Production Deployment: npm publish --access public', value: 'L4 (Pending Review)', tone: 'sand', id: 'appr-demo-1' },
      { label: 'Schema Migration: 20261107_add_security_and_audit', value: 'L3 (Approved)', tone: 'green' },
      { label: 'Environment Secret Mutation: .env.production', value: 'L4 (Pending Review)', tone: 'sand', id: 'appr-demo-2' },
    ],
  },
  'Memory Center': {
    title: 'Shared intelligence store',
    text: 'Structured memory repository compounding context across project sessions.',
    icon: Database,
    rows: [
      { label: 'PROJECT_CONTEXT: Multi-agent architecture rules', value: '16 references', tone: 'blue' },
      { label: 'DECISION: Default-deny permission boundaries', value: '9 references', tone: 'green' },
      { label: 'LESSON_LEARNED: OpenCode Basic Auth and diff evidence', value: '4 references', tone: 'sand' },
    ],
  },
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [previewRunning, setPreviewRunning] = useState(false)
  const [activeStep, setActiveStep] = useState(3)
  const [activeTab, setActiveTab] = useState<ProductTab>('Agent Hub')
  const [notice, setNotice] = useState('')
  const [command, setCommand] = useState('')

  // Live Backend State
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null)
  const [liveOrchestration, setLiveOrchestration] = useState<OrchestrationSummary | null>(null)
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [memories, setMemories] = useState<MemoryItem[]>([])

  // Live Stream State (Phase 8 SSE)
  const [streamLogs, setStreamLogs] = useState<Array<{ id: string; time: string; text: string }>>([
    { id: 'log_init', time: 'ready', text: 'SSE execution stream standing by' },
  ])
  const [isStreaming, setIsStreaming] = useState(false)
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  const appendLog = (text: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setStreamLogs(prev => [...prev.slice(-25), { id: `log_${Date.now()}_${Math.random()}`, time, text }])
    setTimeout(() => {
      terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
      }
    }
  }, [])

  useEffect(() => {
    api.getHealth()
      .then(res => setBackendHealth(res.data))
      .catch(() => setBackendHealth(null))

    api.getApprovals()
      .then(res => {
        if (res.data?.length > 0) setApprovals(res.data)
      })
      .catch(() => {})

    api.getProjectMemories()
      .then(res => {
        if (res.data?.length > 0) setMemories(res.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!previewRunning) return
    const timer = window.setInterval(() => {
      setActiveStep((step) => {
        if (step >= 5) {
          setPreviewRunning(false)
          return 5
        }
        return step + 1
      })
    }, 1200)
    return () => window.clearInterval(timer)
  }, [previewRunning])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const currentTab = defaultTabRows[activeTab]
  const TabIcon = currentTab.icon

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileOpen(false)
  }

  const runPreview = async () => {
    setActiveStep(0)
    setPreviewRunning(true)
    scrollTo('product')

    const defaultObjective = 'Research competitors and create a comparison report for positioning.'
    setNotice('Connecting to CrewFlow Coordinator...')

    try {
      const res = await api.startOrchestration(defaultObjective)
      setLiveOrchestration(res.data)
      setNotice(`Orchestration active: ${res.data.tasksCount} tasks planned across ${res.data.assignedAgents.length} agents.`)

      if (streamCleanupRef.current) streamCleanupRef.current()
      setIsStreaming(true)
      appendLog(`Connecting to live stream for session ${res.data.orchestrationId}...`)

      streamCleanupRef.current = api.streamOrchestration(
        res.data.orchestrationId,
        (chunk) => {
          appendLog(chunk.message)
          if (chunk.eventType === 'orchestration:completed') {
            setIsStreaming(false)
            setActiveStep(5)
          }
        },
        () => {
          setIsStreaming(false)
        },
      )
    } catch {
      setNotice('Running local execution demonstration.')
      setIsStreaming(true)
      const simMessages = [
        'Connected to OpenCode server v1.19.5',
        'Topological scheduler allocated 4 tasks across 3 agents',
        'Task 1: Parsing competitor landscape verified in sandbox',
        'Task 2: Compiling differentiation matrix',
        'Task 3: Running fact-checking and policy verification',
        'Orchestration completed with all verification criteria met',
      ]
      simMessages.forEach((msg, idx) => {
        setTimeout(() => {
          appendLog(msg)
          if (idx === simMessages.length - 1) {
            setIsStreaming(false)
            setActiveStep(5)
          }
        }, (idx + 1) * 750)
      })
    }
  }

  const handleCommand = async () => {
    if (!command.trim()) {
      setNotice('Enter an objective (e.g., "Implement authentication module with full test suite").')
      return
    }

    const taskText = command.trim()
    setCommand('')
    setActiveStep(0)
    setPreviewRunning(true)
    setNotice('Submitting objective to Coordinator...')
    scrollTo('product')

    try {
      const res = await api.startOrchestration(taskText)
      setLiveOrchestration(res.data)
      setNotice(`Orchestration active: ${res.data.tasksCount} tasks decomposed and scheduled.`)
      setActiveStep(1)

      if (streamCleanupRef.current) streamCleanupRef.current()
      setIsStreaming(true)
      appendLog(`Connecting to live stream for session ${res.data.orchestrationId}...`)

      streamCleanupRef.current = api.streamOrchestration(
        res.data.orchestrationId,
        (chunk) => {
          appendLog(chunk.message)
          if (chunk.eventType === 'orchestration:completed') {
            setIsStreaming(false)
            setActiveStep(5)
          }
        },
        () => {
          setIsStreaming(false)
        },
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setNotice(`Orchestrator: ${msg}`)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.approveAction(id, 'Approved by human reviewer from command center')
      setNotice('Approval granted. Resuming execution...')
      const res = await api.getApprovals()
      if (res.data) setApprovals(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setNotice(`Approval error: ${msg}`)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await api.rejectAction(id, 'Rejected by human reviewer from command center')
      setNotice('Operation rejected and blocked.')
      const res = await api.getApprovals()
      if (res.data) setApprovals(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setNotice(`Rejection error: ${msg}`)
    }
  }

  const displayRows: DisplayRow[] = useMemo(() => {
    if (activeTab === 'Human Approvals' && approvals.length > 0) {
      return approvals.map(appr => ({
        label: `${appr.actionCategory}: ${appr.actionType}`,
        value: `${appr.riskLevel} (${appr.status})`,
        tone: appr.status === 'APPROVED' ? 'green' : appr.status === 'PENDING' ? 'sand' : 'blue',
        id: appr.id,
        isPending: appr.status === 'PENDING',
      }))
    }

    if (activeTab === 'Memory Center' && memories.length > 0) {
      return memories.map(mem => ({
        label: `${mem.category}: ${mem.title}`,
        value: 'Verified knowledge',
        tone: 'blue',
        id: mem.id,
      }))
    }

    if (activeTab === 'Task Manager' && liveOrchestration?.plan.tasks) {
      return liveOrchestration.plan.tasks.map((task, idx) => ({
        label: task.title,
        value: `${task.suggestedRole} (${activeStep > idx ? 'Completed' : activeStep === idx ? 'In Progress' : 'Queued'})`,
        tone: activeStep > idx ? 'green' : activeStep === idx ? 'blue' : 'sand',
        id: task.id,
      }))
    }

    if (activeTab === 'Agent Hub' && liveOrchestration?.assignedAgents) {
      return liveOrchestration.assignedAgents.map(ag => ({
        label: `${ag.name} (${ag.role})`,
        value: 'Assigned and active',
        tone: 'blue',
        id: ag.agentId,
      }))
    }

    return currentTab.rows
  }, [activeTab, approvals, memories, liveOrchestration, activeStep, currentTab.rows])

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <button className="brand" onClick={() => scrollTo('top')} aria-label="CrewFlow home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">crewflow</span>
          </button>
          <nav className={`desktop-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => scrollTo(item === 'Product' ? 'product' : item === 'How it works' ? 'how-it-works' : item === 'Capabilities' ? 'capabilities' : 'security')}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            {backendHealth ? (
              <span className="backend-badge online" title={`Backend running in ${backendHealth.environment} mode`}>
                API v{backendHealth.version}
              </span>
            ) : (
              <span className="backend-badge offline" title="Backend offline">
                Standby mode
              </span>
            )}
            <button className="button button-small button-outline" onClick={() => setNotice('Workspace authentication active as user-admin.')}>Workspace</button>
            <button className="button button-small button-primary" onClick={() => scrollTo('cta')}>Deploy crew</button>
            <button className="menu-button" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="container hero-layout">
            <div className="hero-copy">
              <h1>Autonomous AI workforce: coordinated, verified, delivered</h1>
              <p className="hero-lead">CrewFlow decomposes complex requests into observable, verified multi-agent task execution.</p>
              <div className="hero-actions">
                <button className="button button-primary" onClick={runPreview}>
                  Launch coordinator
                  <ArrowUpRight size={15} />
                </button>
                <button className="button button-outline" onClick={() => scrollTo('how-it-works')}>
                  View execution loop
                </button>
              </div>
              <div className="hero-proof">
                <span className="proof-tag">DAG task scheduler</span>
                <span className="proof-tag">OpenCode sandbox runtime</span>
                <span className="proof-tag">L0 to L4 human governance</span>
              </div>
            </div>

            <div className="hero-console-wrap" id="product">
              <div className="console-caption">
                <span>execution monitor / {liveOrchestration ? `run_${liveOrchestration.orchestrationId.slice(0, 6)}` : 'demo_024'}</span>
                <button onClick={runPreview}>
                  {previewRunning ? 'executing plan' : 'run simulation'}
                </button>
              </div>
              <div className="hero-console">
                <div className="console-topbar">
                  <div className="console-title-group">
                    <span>session:</span>
                    <span className="console-session-id">{liveOrchestration ? `orch-${liveOrchestration.orchestrationId.slice(0, 8)}` : 'orch-default'}</span>
                  </div>
                  <span className="console-status-label">{previewRunning ? 'active execution' : 'awaiting dispatch'}</span>
                </div>

                <div className="request-block">
                  <div className="request-meta">
                    <span className="request-author">Human Operator</span>
                    <span>objective input</span>
                  </div>
                  <p>
                    {liveOrchestration?.objective
                      ? liveOrchestration.objective
                      : 'Research competitors and create a comparison report for positioning.'}
                  </p>
                </div>

                <div className="plan-grid">
                  <div className="plan-steps">
                    {workflowSteps.slice(0, 4).map((step, index) => (
                      <button
                        key={step.title}
                        className={`plan-step-btn ${activeStep === index ? 'is-active' : ''}`}
                        onClick={() => setActiveStep(index)}
                      >
                        <span className="step-num">{step.number}</span>
                        <div className="step-info">
                          <strong>{step.title}</strong>
                          <small>
                            {liveOrchestration?.plan?.tasks?.[index]
                              ? liveOrchestration.plan.tasks[index].title.slice(0, 26)
                              : index === 0 ? 'Scope parsed' : index === 1 ? 'DAG planned' : index === 2 ? 'Agents bound' : 'Active runtime'}
                          </small>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="agent-stack">
                    <div className="agent-stack-title">Active agent crew</div>
                    {heroAgents.map((agent, index) => {
                      const isRunning = activeStep === index + 1
                      const isDone = activeStep > index + 1
                      return (
                        <div className="console-agent-row" key={agent.name}>
                          <div className="agent-desc">
                            <strong>{agent.name} Agent</strong>
                            <small>{agent.role}</small>
                          </div>
                          <span className={`agent-state-chip ${isDone ? 'done' : isRunning ? 'active' : ''}`}>
                            {isDone ? 'verified' : isRunning ? 'running' : 'ready'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="console-stream-panel">
                  <div className="stream-meta-row">
                    <span>stream telemetry (SSE)</span>
                    <span className={`stream-badge ${isStreaming ? 'active' : ''}`}>
                      {isStreaming ? 'streaming active' : 'stream idle'}
                    </span>
                  </div>
                  <div className="stream-log-rows" ref={terminalRef}>
                    {streamLogs.map((log) => (
                      <div key={log.id} className="stream-line">
                        <span className="stream-time">[{log.time}]</span>
                        <span className="stream-text">{log.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="console-footer-bar">
                  <span>
                    <Check size={13} />
                    {backendHealth ? 'Connected to Fastify backend' : 'Local demonstration mode'}
                  </span>
                  <span>Port 3000 / OpenCode 1.19.5</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="telemetry-strip" id="security">
          <div className="container telemetry-inner">
            <div className="telemetry-item">
              <span className="telemetry-label">Active Coordinator</span>
              <span className="telemetry-val">Deterministic planner</span>
              <span className="telemetry-note">Topological DAG generation</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">OpenCode Runtime</span>
              <span className="telemetry-val">Server v1.19.5</span>
              <span className="telemetry-note">Workspace isolated execution</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Security Boundaries</span>
              <span className="telemetry-val">15 Action categories</span>
              <span className="telemetry-note">Default-deny risk calibration</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Audit Engine</span>
              <span className="telemetry-val">Append-only log</span>
              <span className="telemetry-note">SHA-256 bound verification</span>
            </div>
          </div>
        </section>

        <section className="story-section" id="how-it-works">
          <div className="container">
            <div className="section-head">
              <h2>From objective to verified delivery</h2>
              <p>CrewFlow coordinates specialist AI agents through planning, handoffs, checks, and human approvals.</p>
            </div>
            <div className="workflow-rail">
              {workflowSteps.map((step, index) => (
                <button
                  key={step.title}
                  className={`workflow-card ${activeStep === index ? 'is-active' : ''}`}
                  onClick={() => { setActiveStep(index); setPreviewRunning(false) }}
                >
                  <div className="workflow-card-top">
                    <span className="workflow-card-num">{step.number}</span>
                    <step.icon size={16} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="capabilities-section" id="capabilities">
          <div className="container">
            <div className="section-head">
              <h2>Structured execution engine for specialized agents</h2>
              <p>Replace isolated prompt chains with a durable, observable AI workforce.</p>
            </div>
            <div className="panels">
              {capabilityPanels.map((panel, index) => (
                <article className="panel-card" key={panel.title}>
                  <span className="panel-role">{panel.role}</span>
                  <h3>{panel.title}</h3>
                  <p>{panel.text}</p>
                  <button
                    className="button button-small button-outline"
                    onClick={() => { setActiveTab(index === 0 ? 'Agent Hub' : index === 1 ? 'Workflow Studio' : index === 2 ? 'Task Manager' : index === 4 ? 'Live Execution' : index === 5 ? 'Human Approvals' : 'Memory Center'); scrollTo('preview') }}
                  >
                    Explore
                    <ArrowUpRight size={13} />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="preview-section" id="preview">
          <div className="container">
            <div className="section-head">
              <h2>Real-time command center for autonomous agents</h2>
              <p>Observe state, review operations, and manage shared memory across all active agents.</p>
            </div>

            <div className="product-tabs" role="tablist" aria-label="Command center views">
              {(Object.keys(defaultTabRows) as ProductTab[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? 'is-active' : ''}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="product-frame" id="product-panel">
              <div className="product-sidebar">
                <div>
                  <div className="sidebar-title">Workspace</div>
                  <div className="sidebar-nav-list">
                    {(['Agent Hub', 'Workflow Studio', 'Task Manager', 'Live Execution'] as ProductTab[]).map((tab) => (
                      <button
                        key={tab}
                        className={`sidebar-nav-item ${activeTab === tab ? 'is-active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="sidebar-title">Governance and memory</div>
                  <div className="sidebar-nav-list">
                    <button
                      className={`sidebar-nav-item ${activeTab === 'Human Approvals' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('Human Approvals')}
                    >
                      Human Approvals
                    </button>
                    <button
                      className={`sidebar-nav-item ${activeTab === 'Memory Center' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('Memory Center')}
                    >
                      Memory Center
                    </button>
                  </div>
                </div>
              </div>

              <div className="product-main">
                <div className="product-content">
                  <div className="product-content-head">
                    <div>
                      <h3>{currentTab.title}</h3>
                      <p>{currentTab.text}</p>
                    </div>
                    <button
                      className="button button-small button-outline"
                      onClick={() => setNotice(`${activeTab} connected to backend API.`)}
                    >
                      <Plus size={13} />
                      New action
                    </button>
                  </div>

                  <div className="product-metrics">
                    <div className="metric-cell">
                      <span>Active agents</span>
                      <strong>04 specialist roles</strong>
                    </div>
                    <div className="metric-cell">
                      <span>Security coverage</span>
                      <strong>15 categories (L0 to L4)</strong>
                    </div>
                    <div className="metric-cell">
                      <span>Backend connection</span>
                      <strong>{backendHealth ? 'Online (Fastify)' : 'Standby mode'}</strong>
                    </div>
                  </div>

                  <div className="product-table">
                    <div className="table-header-row">
                      <span>Entity / Operation</span>
                      <span>Status</span>
                    </div>

                    {displayRows.map((row) => (
                      <div className="table-row" key={row.label}>
                        <div className="row-entity">
                          <TabIcon size={14} />
                          <span>{row.label}</span>
                        </div>
                        <div className={`row-status-group ${row.tone}`}>
                          <span>{row.value}</span>
                          {Boolean(row.isPending && row.id) ? (
                            <>
                              <button
                                className="approval-action-btn approve"
                                onClick={() => handleApprove(row.id!)}
                              >
                                Approve
                              </button>
                              <button
                                className="approval-action-btn reject"
                                onClick={() => handleReject(row.id!)}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          <ChevronRight size={13} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section" id="cta">
          <div className="container cta-inner">
            <h2>Deploy coordinated agents with human governance</h2>
            <p>Connect your team to an execution engine with verified outputs and strict permission controls.</p>
            <div className="cta-actions">
              <button
                className="button button-primary"
                onClick={() => { setNotice('Connecting to Crewflow workspace...'); scrollTo('top') }}
              >
                Start building
                <ArrowUpRight size={15} />
              </button>
              <button
                className="button button-outline"
                onClick={() => setNotice('Contact our team at hello@crewflow.ai')}
              >
                Contact team
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span>crewflow</span>
            <small>Autonomous agent orchestration and execution engine.</small>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <span className="footer-col-title">Architecture</span>
              <button onClick={() => scrollTo('product')}>Command center</button>
              <button onClick={() => scrollTo('capabilities')}>Capabilities</button>
              <button onClick={() => scrollTo('preview')}>Workspace</button>
              <button onClick={() => scrollTo('security')}>Governance</button>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Company</span>
              <button onClick={() => setNotice('About page coming soon.')}>About</button>
              <button onClick={() => setNotice('Careers page coming soon.')}>Careers</button>
              <button onClick={() => setNotice('Contact hello@crewflow.ai')}>Contact</button>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Resources</span>
              <button onClick={() => setNotice('API health available at /api/v1/health')}>System health</button>
              <button onClick={() => setNotice('Documentation available at /docs')}>Documentation</button>
              <button onClick={() => setNotice('Security architecture available in docs/security-architecture.md')}>Security</button>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>CrewFlow Systems</span>
          <span>OpenCode runtime integration</span>
          <span>PostgreSQL persistent state</span>
        </div>
      </footer>

      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={15} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="command-dock">
        <div className="container command-inner">
          <div className="command-prompt">
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCommand()
              }}
              placeholder="Enter an objective (e.g., 'Decompose authentication service into tasks')"
              aria-label="CrewFlow command prompt"
            />
            <span className="command-hint">Enter</span>
          </div>
          <button className="command-send" onClick={handleCommand} aria-label="Dispatch objective">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
