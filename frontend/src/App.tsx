import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Cable,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  GitBranch,
  ListChecks,
  Menu,
  Network,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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

type AgentState = 'queued' | 'running' | 'done'
type ProductTab = 'Agent Hub' | 'Workflow Studio' | 'Task Manager' | 'Live Execution' | 'Human Approvals' | 'Memory Center'

const navItems = ['Product', 'How it works', 'Capabilities', 'Security']
const workflowSteps = [
  { number: '01', title: 'Understand', text: 'Parse intent, context, and the outcome that matters.', icon: BrainCircuit },
  { number: '02', title: 'Plan', text: 'Turn the ask into a clear, observable execution plan.', icon: ListChecks },
  { number: '03', title: 'Delegate', text: 'Match each step with the right specialist agent.', icon: Users2 },
  { number: '04', title: 'Execute', text: 'Run work in parallel with a shared source of truth.', icon: Play },
  { number: '05', title: 'Verify', text: 'Review outputs, surface risks, and ask for approval.', icon: ShieldCheck },
  { number: '06', title: 'Deliver', text: 'Package the result so your team can act on it.', icon: CheckCircle2 },
]

const heroAgents = [
  { name: 'Research', short: 'RS', task: 'Competitor signals', tone: 'blue', icon: Search },
  { name: 'Planner', short: 'PL', task: 'Comparison matrix', tone: 'sand', icon: GitBranch },
  { name: 'Reviewer', short: 'RV', task: 'Fact check + polish', tone: 'green', icon: ShieldCheck },
]

const features: { eyebrow: string; title: string; text: string; icon: LucideIcon }[] = [
  { eyebrow: '01 / ORCHESTRATE', title: 'One request. A whole crew.', text: 'Crewflow decomposes complex work and coordinates specialist agents without losing the thread.', icon: Network },
  { eyebrow: '02 / DELEGATE', title: 'The right agent for every step.', text: 'Assign work by capability, context, and availability — then see who owns the next move.', icon: Users2 },
  { eyebrow: '03 / AUTOMATE', title: 'Workflows that keep moving.', text: 'Turn repeatable processes into durable operating systems your team can improve over time.', icon: Workflow },
  { eyebrow: '04 / REMEMBER', title: 'Shared memory, by design.', text: 'Give every agent the context it needs, with clear controls for what is remembered and why.', icon: Database },
  { eyebrow: '05 / OBSERVE', title: 'Nothing happens in the dark.', text: 'Follow every handoff, decision, and output in a live execution view built for trust.', icon: Activity },
  { eyebrow: '06 / CONTROL', title: 'Human judgment, exactly where needed.', text: 'Add approvals, guardrails, and escalation paths without slowing the rest of the work down.', icon: ShieldCheck },
  { eyebrow: '07 / CONNECT', title: 'Tools that meet the work.', text: 'Bring your existing tools into the loop with clear permissions and observable actions.', icon: Cable },
]

const productTabs: Record<ProductTab, { kicker: string; title: string; text: string; icon: LucideIcon; rows: { label: string; value: string; tone: string; id?: string }[] }> = {
  'Agent Hub': {
    kicker: 'CAPABILITY / PEOPLE + AGENTS', title: 'Know your workforce at a glance.', text: 'See active agents, their responsibilities, and the work already in motion.', icon: Users2,
    rows: [
      { label: 'Coordinator Agent', value: 'Orchestrating · active', tone: 'blue' },
      { label: 'Developer Agent', value: '4 tasks · active', tone: 'sand' },
      { label: 'QA Agent', value: '2 tasks · ready', tone: 'green' },
      { label: 'Reviewer Agent', value: '1 task · ready', tone: 'green' },
    ],
  },
  'Workflow Studio': {
    kicker: 'CAPABILITY / DESIGN', title: 'Build the way work should flow.', text: 'Compose steps, handoffs, approvals, and tool calls on one clear canvas.', icon: Workflow,
    rows: [
      { label: 'Market intelligence pipeline', value: '8 steps · published', tone: 'blue' },
      { label: 'Content QA & verification loop', value: '5 steps · draft', tone: 'sand' },
      { label: 'Customer signal triage flow', value: '12 steps · published', tone: 'green' },
    ],
  },
  'Task Manager': {
    kicker: 'CAPABILITY / PRIORITIZE', title: 'Every task has a next step.', text: 'Keep human and agent work aligned with owners, status, and deadlines in view.', icon: ListChecks,
    rows: [
      { label: 'Decompose Q3 positioning brief', value: 'Completed', tone: 'green' },
      { label: 'Execute competitor capability matrix', value: 'In progress', tone: 'blue' },
      { label: 'Production release deployment', value: 'Needs approval', tone: 'sand' },
    ],
  },
  'Live Execution': {
    kicker: 'CAPABILITY / OBSERVE', title: 'Watch a plan become a result.', text: 'Trace parallel work in real time and step in only when the moment calls for it.', icon: Activity,
    rows: [
      { label: 'RUNTIME_CONNECTED: OpenCode Server v1.19.5', value: 'Complete · 00:01', tone: 'green' },
      { label: 'SESSION_INITIALIZED: Agent sandbox allocated', value: 'Complete · 00:03', tone: 'green' },
      { label: 'EXECUTION_PROGRESS: Workspace evidence verified', value: 'Running · 00:14', tone: 'blue' },
    ],
  },
  'Human Approvals': {
    kicker: 'SAFETY / GATES & PERMISSIONS', title: 'Authorized Human Governance.', text: 'Pending operations requiring human review before runtime execution.', icon: ShieldAlert,
    rows: [
      { label: 'Production Deployment: npm publish --access public', value: 'L4 · Pending Review', tone: 'sand', id: 'appr-demo-1' },
      { label: 'Schema Migration: 20261107_add_security_and_audit', value: 'L3 · Approved', tone: 'green' },
      { label: 'Environment Secret Mutation: .env.production', value: 'L4 · Pending Review', tone: 'sand', id: 'appr-demo-2' },
    ],
  },
  'Memory Center': {
    kicker: 'CAPABILITY / CONTEXT', title: 'Context that compounds.', text: 'Make decisions reusable with visible, editable memory your team can trust.', icon: Database,
    rows: [
      { label: 'PROJECT_CONTEXT: Multi-agent architecture rules', value: 'Verified · 16 references', tone: 'blue' },
      { label: 'DECISION: Default-deny permission boundaries', value: 'Verified · 9 references', tone: 'green' },
      { label: 'LESSON_LEARNED: OpenCode Basic Auth and diff evidence', value: 'Verified · 4 references', tone: 'sand' },
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

  // Probe backend on mount
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

  const currentTab = productTabs[activeTab]
  const TabIcon = currentTab.icon
  const currentWorkflow = workflowSteps[activeStep]
  const progress = useMemo(() => `${Math.max(38, 46 + activeStep * 10)}%`, [activeStep])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileOpen(false)
  }

  const runPreview = async () => {
    setActiveStep(0)
    setPreviewRunning(true)
    scrollTo('product')

    const defaultObjective = 'Research five competitors and create a comparison report for our Q3 positioning.'
    setNotice('Connecting to CrewFlow Coordinator...')

    try {
      const res = await api.startOrchestration(defaultObjective)
      setLiveOrchestration(res.data)
      setNotice(`Orchestration ${res.data.orchestrationId.slice(0, 8)}: Planned ${res.data.tasksCount} tasks across ${res.data.assignedAgents.length} agents.`)
    } catch {
      setNotice('Running local execution demonstration.')
    }
  }

  const handleCommand = async () => {
    if (!command.trim()) {
      setNotice('Enter an objective for CrewFlow (e.g., "Implement authentication module with full test suite").')
      return
    }

    const taskText = command.trim()
    setCommand('')
    setActiveStep(0)
    setPreviewRunning(true)
    setNotice(`Submitting to Coordinator: "${taskText.slice(0, 40)}..."`)
    scrollTo('product')

    try {
      const res = await api.startOrchestration(taskText)
      setLiveOrchestration(res.data)
      setNotice(`Orchestration active: ${res.data.tasksCount} tasks decomposed and scheduled.`)
      setActiveStep(1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setNotice(`Orchestrator: ${msg}. Visualizing plan simulation.`)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.approveAction(id, 'Approved by human reviewer from command center')
      setNotice('Approval granted! Resuming execution...')
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

  // Display rows: dynamically blend real backend data when available
  const displayRows: Array<{ label: string; value: string; tone: string; id?: string; isPending?: boolean }> = useMemo(() => {
    if (activeTab === 'Human Approvals' && approvals.length > 0) {
      return approvals.map(appr => ({
        label: `${appr.actionCategory}: ${appr.actionType}`,
        value: `${appr.riskLevel} · ${appr.status}`,
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
        value: `${task.suggestedRole} · ${activeStep > idx ? 'Completed' : activeStep === idx ? 'In Progress' : 'Queued'}`,
        tone: activeStep > idx ? 'green' : activeStep === idx ? 'blue' : 'sand',
        id: task.id,
      }))
    }

    if (activeTab === 'Agent Hub' && liveOrchestration?.assignedAgents) {
      return liveOrchestration.assignedAgents.map(ag => ({
        label: `${ag.name} (${ag.role})`,
        value: 'Assigned · Active',
        tone: 'blue',
        id: ag.agentId,
      }))
    }

    return currentTab.rows
  }, [activeTab, approvals, memories, liveOrchestration, activeStep, currentTab.rows])

  return (
    <div className="app-shell bg-transparent">
      <header className="site-header">
        <div className="container header-inner">
          <button className="brand" onClick={() => scrollTo('top')} aria-label="Crewflow home">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="brand-name">crewflow</span>
          </button>
          <nav className={`desktop-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
            {navItems.map((item) => (
              <button key={item} onClick={() => scrollTo(item === 'Product' ? 'product' : item === 'How it works' ? 'how-it-works' : item === 'Capabilities' ? 'capabilities' : 'security')}>
                {item}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            {backendHealth ? (
              <span className="backend-badge online" title={`Backend running in ${backendHealth.environment} mode`}>
                <span className="pulse-dot" /> API v{backendHealth.version}
              </span>
            ) : (
              <span className="backend-badge offline" title="Backend offline / local demo fallback">
                <span className="status-dot" /> Demo Mode
              </span>
            )}
            <button className="signin-button" onClick={() => setNotice('Workspace authentication active as user-admin.')}>Workspace</button>
            <button className="button button-small button-light" onClick={() => scrollTo('cta')}>Start building <ArrowUpRight size={15} /></button>
            <button className="menu-button" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-grid-lines" aria-hidden="true" />
          <div className="container hero-layout">
            <div className="hero-copy">
              <div className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> THE OPERATING SYSTEM FOR AI WORK</div>
              <h1>Your AI workforce.<br /><em>Working together.</em></h1>
              <p className="hero-lead">Turn complex requests into coordinated execution. Crewflow brings intelligent agents together to plan, collaborate, execute, and deliver real work.</p>
              <div className="hero-actions">
                <button className="button button-primary" onClick={runPreview}>Get Started <ArrowUpRight size={16} /></button>
                <button className="button button-quiet" onClick={() => scrollTo('how-it-works')}>Explore How It Works <ChevronRight size={16} /></button>
              </div>
              <div className="hero-proof"><span><Check size={13} /> DAG Dependency Scheduler</span><span><Check size={13} /> OpenCode 1.19.5 Runtime</span><span><Check size={13} /> Human Approval Gates</span></div>
            </div>
            <div className="hero-console-wrap" id="product">
              <div className="console-caption">
                <span>LIVE EXECUTION / {liveOrchestration?.orchestrationId ? `RUN_${liveOrchestration.orchestrationId.slice(0, 6)}` : 'DEMO_024'}</span>
                <button onClick={runPreview} className={previewRunning ? 'is-running' : ''}>
                  {previewRunning ? <><span className="pulse-dot" /> running</> : <><Play size={12} /> run preview</>}
                </button>
              </div>
              <div className="hero-console">
                <div className="console-topbar">
                  <div className="window-controls"><span /><span /><span /></div>
                  <span className="console-path">
                    <span className="path-accent">crewflow</span> / command-center / {liveOrchestration ? `orch-${liveOrchestration.orchestrationId.slice(0, 8)}` : 'execution-024'}
                  </span>
                  <span className="console-secure"><ShieldCheck size={13} /> secure</span>
                </div>
                <div className="request-block">
                  <div className="request-meta"><span className="request-avatar">AS</span><span>Alex Morgan</span><span className="meta-divider">·</span><span>just now</span></div>
                  <p>{liveOrchestration?.objective ? `“${liveOrchestration.objective}”` : '“Research five competitors and create a comparison report for our Q3 positioning.”'}</p>
                </div>
                <div className="plan-divider">
                  <span>CREWFLOW PLAN</span>
                  <span className="plan-id">
                    {liveOrchestration ? `PLAN_${liveOrchestration.orchestrationId.slice(-6).toUpperCase()}` : 'PLAN_8F4D'} <CircleDot size={10} />
                  </span>
                </div>
                <div className="plan-grid">
                  <div className="plan-steps">
                    {workflowSteps.slice(0, 4).map((step, index) => (
                      <button key={step.title} className={`plan-step ${activeStep >= index ? 'is-complete' : ''} ${activeStep === index ? 'is-current' : ''}`} onClick={() => setActiveStep(index)}>
                        <span className="step-number">{activeStep > index ? <Check size={12} /> : step.number}</span>
                        <span className="step-copy">
                          <strong>{step.title}</strong>
                          <small>
                            {liveOrchestration?.plan?.tasks?.[index]
                              ? liveOrchestration.plan.tasks[index].title.slice(0, 24)
                              : index === 0 ? 'Intent parsed' : index === 1 ? 'Plan assembled' : index === 2 ? 'Agents assigned' : 'Work in motion'}
                          </small>
                        </span>
                        {activeStep === index && <span className="mini-pulse" />}
                      </button>
                    ))}
                  </div>
                  <div className="agent-stack">
                    <div className="agent-stack-heading"><span>ACTIVE CREW</span><span>{liveOrchestration?.assignedAgents.length ?? heroAgents.length} agents</span></div>
                    {(liveOrchestration?.assignedAgents?.length
                      ? liveOrchestration.assignedAgents.map(ag => ({
                          name: ag.name,
                          task: `${ag.role} tasks`,
                          tone: ag.role === 'COORDINATOR' ? 'blue' : ag.role === 'DEVELOPER' ? 'sand' : 'green',
                          icon: ag.role === 'COORDINATOR' ? GitBranch : ag.role === 'DEVELOPER' ? Play : ShieldCheck,
                        }))
                      : heroAgents
                    ).map((agent, index) => {
                      const agentState: AgentState = activeStep > index + 1 ? 'done' : activeStep === index + 1 ? 'running' : 'queued'
                      const Icon = agent.icon
                      return <div className={`console-agent ${agentState}`} key={agent.name}>
                        <span className={`agent-icon ${agent.tone}`}><Icon size={14} /></span>
                        <span className="agent-copy"><strong>{agent.name} Agent</strong><small>{agent.task}</small></span>
                        <span className="agent-state">{agentState === 'done' ? <Check size={13} /> : agentState === 'running' ? <span className="status-loading" /> : 'queued'}</span>
                      </div>
                    })}
                  </div>
                </div>
                <div className="console-progress"><div className="progress-label"><span>EXECUTION PROGRESS</span><strong>{progress}</strong></div><div className="progress-track"><span style={{ width: progress }} /></div></div>
                <div className={`console-result ${activeStep >= 5 ? 'is-visible' : ''}`}>
                  <span className="result-icon"><CheckCircle2 size={16} /></span>
                  <span><strong>{activeStep >= 5 ? 'Result verified and ready.' : 'Result will appear here.'}</strong><small>{activeStep >= 5 ? 'Deliverable verified · Evidence checked · Output ready' : `Crew is ${currentWorkflow.title.toLowerCase()} the request now.`}</small></span>
                  <ArrowUpRight size={15} />
                </div>
              </div>
              <div className="console-footnote">
                <span><span className="live-indicator" /> {backendHealth ? 'connected to live backend runtime' : 'execution is transparent by default'}</span>
                <span>last synced 00:02 ago</span>
              </div>
            </div>
          </div>
          <div className="container scroll-cue"><span>SCROLL TO EXPLORE</span><span className="scroll-line" /></div>
        </section>

        <section className="signal-strip" id="security">
          <div className="container signal-inner"><span>TRUSTED BY TEAMS BUILDING WHAT'S NEXT</span><div className="signal-brands"><span>northstar</span><span>arcade</span><span>LOOM/3</span><span>praxos</span><span>signal<span className="brand-slash">/</span>labs</span></div></div>
        </section>

        <section className="story-section" id="how-it-works">
          <div className="container">
            <div className="section-heading split-heading"><div><div className="eyebrow">01 / THE LOOP</div><h2>From intention<br /><em>to impact.</em></h2></div><p>Most AI tools stop at an answer. Crewflow is built for the work in between — the planning, handoffs, checks, and decisions that make an outcome trustworthy.</p></div>
            <div className="workflow-rail">
              <div className="rail-line" />
              {workflowSteps.map((step, index) => { const Icon = step.icon; return <button key={step.title} className={`workflow-card ${activeStep === index ? 'is-active' : ''}`} onClick={() => { setActiveStep(index); setPreviewRunning(false) }}><div className="workflow-top"><span className="workflow-number">{step.number}</span><Icon size={17} /></div><h3>{step.title}</h3><p>{step.text}</p><span className="workflow-arrow"><ChevronRight size={15} /></span></button> })}
            </div>
            <div className="workflow-callout"><div className="callout-mark"><Sparkles size={18} /></div><div><strong>{currentWorkflow.title}</strong><span>{currentWorkflow.text}</span></div><button onClick={runPreview}>{previewRunning ? 'Execution in progress' : 'Watch the loop'} <Play size={14} /></button></div>
          </div>
        </section>

        <section className="capabilities-section" id="capabilities">
          <div className="container">
            <div className="section-heading capabilities-heading"><div><div className="eyebrow">02 / CAPABILITIES</div><h2>Serious leverage.<br /><em>Built into the system.</em></h2></div><p>Everything you need to move from isolated prompts to a dependable AI workforce your team can direct.</p></div>
            <div className="feature-grid">{features.map((feature, index) => { const Icon = feature.icon; return <article className={`feature-card feature-${index + 1}`} key={feature.title}><div className="feature-icon"><Icon size={18} /></div><div className="feature-eyebrow">{feature.eyebrow}</div><h3>{feature.title}</h3><p>{feature.text}</p><button onClick={() => { setActiveTab(index === 0 ? 'Agent Hub' : index === 1 ? 'Workflow Studio' : index === 2 ? 'Task Manager' : index === 4 ? 'Live Execution' : index === 5 ? 'Human Approvals' : 'Memory Center'); scrollTo('preview') }}>Explore <ArrowUpRight size={14} /></button></article> })}</div>
          </div>
        </section>

        <section className="preview-section" id="preview">
          <div className="container">
            <div className="section-heading split-heading preview-heading"><div><div className="eyebrow">03 / THE WORKSPACE</div><h2>One command center.<br /><em>Infinite ways to work.</em></h2></div><p>The interface stays calm while the system does the complex work underneath. Switch views to see how your crew comes together.</p></div>
            <div className="product-tabs" role="tablist" aria-label="Product views">{(Object.keys(productTabs) as ProductTab[]).map((tab) => <button key={tab} id={`tab-${tab.toLowerCase().replaceAll(' ', '-')}`} role="tab" aria-selected={activeTab === tab} aria-controls="product-panel" tabIndex={activeTab === tab ? 0 : -1} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
            <div className="product-frame" id="product-panel" role="tabpanel" aria-labelledby={`tab-${activeTab.toLowerCase().replaceAll(' ', '-')}`}>
              <div className="product-sidebar">
                <div className="sidebar-brand"><span className="brand-mark small"><span /><span /><span /></span> crewflow</div>
                <div className="sidebar-workspace"><span className="workspace-icon">CF</span><span><strong>CrewFlow / Core</strong><small>{backendHealth ? `v${backendHealth.version}` : 'Local workspace'}</small></span><ChevronRight size={14} /></div>
                <div className="sidebar-nav">
                  <span className="side-label">WORKSPACE</span>
                  {['Overview', 'Command center', 'Agents', 'Workflows', 'Tasks'].map((item, index) => <span className={index === (activeTab === 'Agent Hub' ? 2 : activeTab === 'Workflow Studio' ? 3 : activeTab === 'Task Manager' ? 4 : 1) ? 'active' : ''} key={item}><CircleDot size={11} /> {item}</span>)}
                  <span className="side-label second">SAFETY & GOVERNANCE</span>
                  <span className={activeTab === 'Human Approvals' ? 'active' : ''} onClick={() => setActiveTab('Human Approvals')}><ShieldAlert size={13} /> Approvals</span>
                  <span className={activeTab === 'Memory Center' ? 'active' : ''} onClick={() => setActiveTab('Memory Center')}><Database size={13} /> Memory</span>
                </div>
                <div className="sidebar-user"><span className="user-avatar">AD</span><span><strong>Alex Morgan</strong><small>Admin</small></span><ChevronRight size={14} /></div>
              </div>
              <div className="product-main">
                <div className="product-topbar">
                  <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{activeTab}</strong></div>
                  <div className="product-top-actions">
                    <span><Search size={14} /> Search <kbd>⌘ K</kbd></span>
                    <span className="top-avatar">AD</span>
                  </div>
                </div>
                <div className="product-content">
                  <div className="product-content-header">
                    <div>
                      <div className="product-kicker">{currentTab.kicker}</div>
                      <h3>{currentTab.title}</h3>
                      <p>{currentTab.text}</p>
                    </div>
                    <button className="button button-small button-dark" onClick={() => setNotice(`${activeTab} connected to backend API.`)}>
                      <Plus size={14} /> New {activeTab === 'Agent Hub' ? 'agent' : activeTab === 'Human Approvals' ? 'policy' : 'task'}
                    </button>
                  </div>
                  <div className="product-metrics">
                    <div><span>ACTIVE AGENTS</span><strong>04</strong><small><span className="metric-up">Coordinator, Dev, QA, Reviewer</span></small></div>
                    <div><span>SECURITY GATES</span><strong>15 Categories</strong><small><span className="metric-up">Default-Deny L0-L4</span></small></div>
                    <div><span>BACKEND STATUS</span><strong>{backendHealth ? 'ONLINE' : 'ACTIVE'}</strong><small><span className="metric-neutral">{backendHealth?.environment ?? 'fastify runtime'}</span></small></div>
                  </div>
                  <div className="product-table">
                    <div className="table-heading">
                      <span>{activeTab === 'Agent Hub' ? 'AGENT' : activeTab === 'Workflow Studio' ? 'WORKFLOW' : activeTab === 'Task Manager' ? 'TASK' : activeTab === 'Live Execution' ? 'EXECUTION EVENT' : activeTab === 'Human Approvals' ? 'OPERATION' : 'MEMORY ENTRY'}</span>
                      <span>STATUS</span>
                    </div>
                    {displayRows.map((row) => (
                      <div className="table-row" key={row.label}>
                        <span className="table-name">
                          <span className={`row-icon ${row.tone}`}><TabIcon size={13} /></span>
                          {row.label}
                        </span>
                        <span className={`row-status ${row.tone}`}>
                          <span className="status-dot" />
                          {row.value}
                          {Boolean(row.isPending && row.id) ? (
                            <>
                              <button className="approval-action-btn approve" onClick={() => handleApprove(row.id!)}>Approve</button>
                              <button className="approval-action-btn reject" onClick={() => handleReject(row.id!)}>Reject</button>
                            </>
                          ) : null}
                        </span>
                        <ChevronRight size={14} />
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
            <div className="cta-grid" aria-hidden="true" />
            <div className="eyebrow">04 / YOUR NEXT ADVANTAGE</div>
            <h2>Put your AI workforce<br /><em>to work.</em></h2>
            <p>Give your team a way to turn the hard parts of work into a system that gets better every time it runs.</p>
            <div className="cta-actions">
              <button className="button button-primary" onClick={() => { setNotice('Connecting to Crewflow workspace...'); scrollTo('top') }}>
                Start building with Crewflow <ArrowUpRight size={16} />
              </button>
              <button className="button button-quiet light-quiet" onClick={() => setNotice('Contact our team at hello@crewflow.ai')}>
                Talk to the team <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="brand-mark"><span /><span /><span /></span>
            <span>crewflow</span>
            <small>The operating system for AI work.</small>
          </div>
          <div className="footer-links">
            <div><span>PRODUCT</span><button onClick={() => scrollTo('product')}>Command center</button><button onClick={() => scrollTo('capabilities')}>Capabilities</button><button onClick={() => scrollTo('preview')}>Workspace</button></div>
            <div><span>COMPANY</span><button onClick={() => setNotice('About page coming soon.')}>About</button><button onClick={() => setNotice('Careers page coming soon.')}>Careers</button><button onClick={() => setNotice('Contact hello@crewflow.ai')}>Contact</button></div>
            <div><span>RESOURCES</span><button onClick={() => setNotice('Documentation available at /docs')}>Documentation</button><button onClick={() => setNotice('Security architecture available in docs/security-architecture.md')}>Security</button><button onClick={() => setNotice('API health available at /api/v1/health')}>System status</button></div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Crewflow, Inc.</span>
          <span>Made for teams with a lot to do.</span>
          <span>Privacy · Terms</span>
        </div>
      </footer>

      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={15} /> {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button>
        </div>
      )}

      <div className="command-dock">
        <div className="container command-inner">
          <div className="command-prompt">
            <span className="command-spark"><Sparkles size={15} /></span>
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleCommand() }}
              placeholder="What would you like Crewflow to accomplish? (e.g. 'Build new auth endpoint')"
              aria-label="Crewflow command"
            />
            <span className="command-hint">⌘ ↵</span>
          </div>
          <button className="command-send" onClick={handleCommand} aria-label="Send command"><Send size={16} /></button>
        </div>
      </div>
    </div>
  )
}

export default App
