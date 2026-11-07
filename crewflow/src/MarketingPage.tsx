import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Cable,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  GitBranch,
  Layers3,
  ListChecks,
  Menu,
  Network,
  Play,
  Search,
  Send,
  ShieldCheck,
  Terminal,
  Users2,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'

type AgentState = 'queued' | 'running' | 'done'
type ProductTab = 'Agent Hub' | 'Workflow Studio' | 'Live Execution' | 'Memory Center'

const navItems = [
  { label: 'System', href: '#system' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Telemetry', href: '#telemetry' },
]

const workflowSteps = [
  { number: '01', title: 'Intent analysis', text: 'Parse user intent, extract constraints, and define verifiable success criteria.', icon: BrainCircuit },
  { number: '02', title: 'Plan assembly', text: 'Decompose the objective into an acyclic dependency graph of subtasks.', icon: ListChecks },
  { number: '03', title: 'Specialist routing', text: 'Assign each task node to specialized agents based on capability matrix.', icon: Users2 },
  { number: '04', title: 'Isolated execution', text: 'Run parallel agent workloads in sandboxed runtimes with telemetry streaming.', icon: Play },
  { number: '05', title: 'Deterministic check', text: 'Run automated assertions and require operator sign-off at critical gates.', icon: ShieldCheck },
  { number: '06', title: 'Artifact delivery', text: 'Package execution outputs, code diffs, and verification transcripts.', icon: CheckCircle2 },
]

const heroAgents = [
  { name: 'Research agent', id: 'agent-01', task: 'Market signal analysis', role: 'instrument', icon: Search },
  { name: 'Planner agent', id: 'agent-02', task: 'DAG execution schedule', role: 'instrument', icon: GitBranch },
  { name: 'Verifier agent', id: 'agent-03', task: 'Policy and safety review', role: 'operator', icon: ShieldCheck },
]

const capabilities: { title: string; text: string; icon: LucideIcon }[] = [
  { title: 'Deterministic orchestration', text: 'Orchestrate agents across parallel DAG workflows with clear execution contracts and isolated state.', icon: Network },
  { title: 'Fine-grained delegation', text: 'Dispatch tasks to domain-specific agents with scoped permissions, explicit toolkits, and audit trails.', icon: Users2 },
  { title: 'Observable execution', text: 'Track every token, tool invocation, and state transition in a unified streaming telemetry record.', icon: Activity },
  { title: 'Persistent shared memory', text: 'Hierarchical workspace and project memory with temporal retrieval and explicit read-write boundaries.', icon: Database },
  { title: 'Operator gates', text: 'Configurable approval checkpoints pausing execution for human authorization before high-risk actions.', icon: ShieldCheck },
  { title: 'Runtime integration', text: 'Connect OpenCode sandboxes, local toolchains, and external APIs with mutual TLS and scoped tokens.', icon: Cable },
]

const productTabs: Record<ProductTab, { label: string; description: string; rows: { name: string; status: string; detail: string; role: 'operator' | 'instrument' }[] }> = {
  'Agent Hub': {
    label: 'Managed agent fleet',
    description: 'Specialist agents configured with scoped tool access and distinct execution runtimes.',
    rows: [
      { name: 'Research agent', status: 'Active', detail: 'Worker runtime · memory read-only', role: 'instrument' },
      { name: 'Code architect', status: 'Active', detail: 'OpenCode sandbox · filesystem write', role: 'instrument' },
      { name: 'Quality verifier', status: 'Standing by', detail: 'Assertion suite · approval gate', role: 'operator' },
    ],
  },
  'Workflow Studio': {
    label: 'Visual dependency canvas',
    description: 'Directed acyclic graphs linking agent triggers, execution nodes, and validation barriers.',
    rows: [
      { name: 'Repository audit and remediate', status: 'Configured', detail: '6 nodes · 2 approval gates', role: 'operator' },
      { name: 'Continuous feature implementation', status: 'Active', detail: '4 parallel streams · sandbox isolation', role: 'instrument' },
      { name: 'Dependency security triage', status: 'Ready', detail: 'Automated scan · scheduled trigger', role: 'instrument' },
    ],
  },
  'Live Execution': {
    label: 'Live telemetry stream',
    description: 'Sub-second event streaming with execution logs, diff previews, and tool call traces.',
    rows: [
      { name: 'Task DAG compilation', status: 'Completed', detail: '34ms latency · 0 errors', role: 'instrument' },
      { name: 'Parallel agent dispatch', status: 'Running', detail: '2 workers active · 1 pending approval', role: 'operator' },
      { name: 'Output verification', status: 'Pending gate', detail: 'Operator confirmation required', role: 'operator' },
    ],
  },
  'Memory Center': {
    label: 'Structured workspace context',
    description: 'Long-term episodic and semantic memory shared across orchestration cycles.',
    rows: [
      { name: 'Architecture decisions (ADR)', status: 'Synchronized', detail: '18 records · project scope', role: 'instrument' },
      { name: 'Security policy constraints', status: 'Locked', detail: 'Mandatory verification ruleset', role: 'operator' },
      { name: 'Runtime environment profile', status: 'Loaded', detail: 'Node.js 22 · Fastify · Prisma', role: 'instrument' },
    ],
  },
}

interface MarketingPageProps {
  onSignIn: () => void
}

export default function MarketingPage({ onSignIn }: MarketingPageProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(2)
  const [activeTab, setActiveTab] = useState<ProductTab>('Agent Hub')
  const [previewRunning, setPreviewRunning] = useState(false)
  const [gateApproved, setGateApproved] = useState(false)
  const [command, setCommand] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!previewRunning) return
    const timer = window.setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= workflowSteps.length - 1) {
          setPreviewRunning(false)
          return prev
        }
        return prev + 1
      })
    }, 1400)
    return () => window.clearInterval(timer)
  }, [previewRunning])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const currentTab = productTabs[activeTab]
  const currentStep = workflowSteps[activeStep]
  const progressRatio = useMemo(() => `${Math.round(((activeStep + 1) / workflowSteps.length) * 100)}%`, [activeStep])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  const startDemo = () => {
    setActiveStep(0)
    setGateApproved(false)
    setPreviewRunning(true)
    setNotice('Sample execution triggered in sandboxed demo mode.')
  }

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!command.trim()) return
    setNotice(`Objective queued: ${command.trim()}`)
    setCommand('')
    setActiveStep(0)
    setPreviewRunning(true)
  }

  return (
    <div className="hallmark-page">
      {/* Edge-aligned header */}
      <header className="page-header">
        <div className="container header-grid">
          <a href="#top" className="brand-lockup" aria-label="Crewflow home">
            <span className="brand-glyph" aria-hidden="true" />
            <span className="brand-word">crewflow</span>
          </a>

          <nav className={`nav-links ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} onClick={(e) => { e.preventDefault(); scrollTo(item.href.slice(1)) }}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-controls">
            <button type="button" className="btn btn--subtle" onClick={onSignIn}>
              Sign in
            </button>
            <button type="button" className="btn btn--primary" onClick={onSignIn}>
              Launch workspace
            </button>
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section: Stage Posture */}
        <section className="hero-stage">
          <div className="container hero-container">
            <div className="hero-prose">
              <h1>Autonomous agents. Coordinated execution.</h1>
              <p className="lead">
                Orchestrate observable, verifiable multi-agent workflows with human approval at critical gates.
              </p>
              <div className="hero-cta-group">
                <button type="button" className="btn btn--primary" onClick={startDemo}>
                  Run sample execution <ArrowUpRight size={15} />
                </button>
                <button type="button" className="btn btn--nowrap" onClick={() => scrollTo('system')}>
                  System architecture
                </button>
              </div>
            </div>

            {/* Stage Instrument: The Real Product Working */}
            <div className="stage-instrument">
              <div className="instrument-toolbar">
                <span className="instrument-title">Execution node · dag_8f4d</span>
                <span className="instrument-meta measured">timestamp: 2026-11-07T22:45:00Z</span>
                <button
                  type="button"
                  className="telemetry-toggle measured"
                  onClick={startDemo}
                >
                  {previewRunning ? 'executing...' : 'trigger run'}
                </button>
              </div>

              <div className="instrument-body panels">
                {/* Intent definition */}
                <div className="instrument-lead-panel">
                  <span className="panel-caption">User objective</span>
                  <p className="objective-text">
                    “Execute comprehensive security and performance audit across service endpoints, assemble patch diffs, and request review.”
                  </p>
                  <div className="execution-summary">
                    <span className="summary-item measured">
                      phase: <strong>{currentStep.title}</strong>
                    </span>
                    <span className="summary-item measured">
                      progress: <strong>{progressRatio}</strong>
                    </span>
                  </div>
                </div>

                {/* Subtask DAG Sequence */}
                <div className="instrument-dag-panel">
                  <span className="panel-caption">Orchestration sequence</span>
                  <div className="dag-steps">
                    {workflowSteps.slice(0, 4).map((step, idx) => (
                      <button
                        key={step.title}
                        type="button"
                        className={`dag-step-row ${activeStep >= idx ? 'is-complete' : ''} ${activeStep === idx ? 'is-active' : ''}`}
                        onClick={() => setActiveStep(idx)}
                      >
                        <span className="step-idx measured">{step.number}</span>
                        <span className="step-name">{step.title}</span>
                        <span className="step-status measured">
                          {activeStep > idx ? 'settled' : activeStep === idx ? 'running' : 'queued'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agent Fleet telemetry */}
                <div className="instrument-fleet-panel">
                  <span className="panel-caption">Specialist fleet</span>
                  <div className="fleet-list">
                    {heroAgents.map((agent, idx) => {
                      const isDone = activeStep > idx + 1
                      const isCurrent = activeStep === idx + 1
                      return (
                        <div key={agent.id} className="fleet-row">
                          <span className={`fleet-indicator role-${agent.role}`} />
                          <div className="fleet-info">
                            <span className="fleet-name">{agent.name}</span>
                            <span className="fleet-task">{agent.task}</span>
                          </div>
                          <span className="fleet-state measured">
                            {isDone ? 'done' : isCurrent ? 'busy' : 'idle'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Operator Gate */}
                <div className="instrument-gate-panel">
                  <div className="gate-header">
                    <span className="panel-caption">Operator checkpoint</span>
                    <span className={`gate-status measured ${gateApproved ? 'is-approved' : 'is-pending'}`}>
                      {gateApproved ? 'Approved by operator' : 'Approval required'}
                    </span>
                  </div>
                  <p className="gate-description">
                    Critical action: commit changes to production database schema. Human verification barrier active.
                  </p>
                  <div className="gate-actions">
                    <button
                      type="button"
                      className={`btn btn--pill ${gateApproved ? 'btn--disabled' : 'btn--accent'}`}
                      onClick={() => {
                        setGateApproved(true)
                        setNotice('Checkpoint authorization granted. Execution resuming.')
                      }}
                      disabled={gateApproved}
                    >
                      {gateApproved ? 'Authorization logged' : 'Authorize action'}
                    </button>
                    <span className="gate-meta measured">policy: strict-audit-v2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Architecture Section */}
        <section id="system" className="section-block">
          <div className="container">
            <div className="section-header">
              <h2>Execution lifecycle</h2>
              <p className="lead">
                Deterministic coordination from request ingestion to signed artifact delivery.
              </p>
            </div>

            <div className="panels cycle-grid">
              {workflowSteps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="cycle-card">
                    <div className="card-top">
                      <span className="measured card-num">{step.number}</span>
                      <Icon size={16} className="card-icon" />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Core Capabilities Section */}
        <section id="capabilities" className="section-block section-alt">
          <div className="container">
            <div className="section-header">
              <h2>Engine capabilities</h2>
              <p className="lead">
                Engineered for engineering and operations teams that require auditable multi-agent automation.
              </p>
            </div>

            <div className="panels capabilities-grid">
              {capabilities.map((cap) => {
                const Icon = cap.icon
                return (
                  <div key={cap.title} className="capability-card">
                    <Icon size={20} className="capability-icon" />
                    <h3>{cap.title}</h3>
                    <p>{cap.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Interactive Workspace Ledger */}
        <section id="telemetry" className="section-block">
          <div className="container">
            <div className="section-header">
              <h2>Workspace telemetry</h2>
              <p className="lead">
                Explore how Crewflow maintains shared context, coordinates agents, and enforces governance.
              </p>
            </div>

            {/* Tab navigation */}
            <div className="ledger-tabs" role="tablist">
              {(Object.keys(productTabs) as ProductTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`ledger-tab ${activeTab === tab ? 'is-selected' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content panel */}
            <div className="panels ledger-content">
              <div className="ledger-summary">
                <div>
                  <h3>{currentTab.label}</h3>
                  <p>{currentTab.description}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={onSignIn}
                >
                  Open in workspace <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="ledger-table">
                <div className="table-header-row">
                  <span className="col-name">Component</span>
                  <span className="col-status">Status</span>
                  <span className="col-detail">Specification</span>
                </div>
                {currentTab.rows.map((row) => (
                  <div key={row.name} className="table-data-row">
                    <span className="col-name font-medium">{row.name}</span>
                    <span className={`col-status measured tag-${row.role}`}>
                      {row.status}
                    </span>
                    <span className="col-detail measured">{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="section-block section-cta">
          <div className="container cta-container">
            <h2>Ready to run your autonomous agent workforce?</h2>
            <p className="lead">
              Sign in with your workspace credentials to start orchestrating multi-agent tasks in seconds.
            </p>
            <div className="cta-actions">
              <button type="button" className="btn btn--primary btn--nowrap" onClick={onSignIn}>
                Launch workspace <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Mast footer */}
      <footer className="page-footer">
        <div className="container footer-content">
          <div className="footer-mast">
            <span className="brand-word">crewflow</span>
            <span className="footer-tagline">Autonomous agentic operating system</span>
          </div>

          <div className="footer-nav">
            <div className="nav-column">
              <span className="column-title">System</span>
              <a href="#system" onClick={(e) => { e.preventDefault(); scrollTo('system') }}>Lifecycle</a>
              <a href="#capabilities" onClick={(e) => { e.preventDefault(); scrollTo('capabilities') }}>Capabilities</a>
              <a href="#telemetry" onClick={(e) => { e.preventDefault(); scrollTo('telemetry') }}>Telemetry</a>
            </div>
            <div className="nav-column">
              <span className="column-title">Workspace</span>
              <button type="button" className="link-button" onClick={onSignIn}>Sign in</button>
              <button type="button" className="link-button" onClick={onSignIn}>Launch workspace</button>
              <button type="button" className="link-button" onClick={startDemo}>Sandbox preview</button>
            </div>
            <div className="nav-column">
              <span className="column-title">Documentation</span>
              <span className="measured">API v1 / Fastify</span>
              <span className="measured">OpenCode runtime</span>
              <span className="measured">Prisma ORM</span>
            </div>
          </div>

          <div className="footer-baseline">
            <span className="measured">© 2026 Crewflow</span>
            <span className="measured">Engine build 0.1.0</span>
          </div>
        </div>
      </footer>

      {/* Active notification toast */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="hallmark-toast"
            role="status"
          >
            <span className="toast-bullet" />
            <span className="toast-text">{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Natural language objective dock */}
      <div className="dock-container">
        <form onSubmit={handleCommandSubmit} className="dock-form">
          <input
            type="text"
            className="dock-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Instruct your crew to execute a verifiable objective..."
            aria-label="Direct objective prompt"
          />
          <button type="submit" className="dock-submit" aria-label="Submit instruction">
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}
