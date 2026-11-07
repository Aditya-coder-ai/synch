import { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Clock,
  Key,
  Filter,
} from 'lucide-react';
import { Badge, type BadgeTone } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import type { ApprovalItem } from '../../api/client';

interface ApprovalCenterViewProps {
  approvals: ApprovalItem[];
  onApproveAction: (id: string, reason?: string) => Promise<void>;
  onRejectAction: (id: string, reason?: string) => Promise<void>;
}

export function ApprovalCenterView({
  approvals,
  onApproveAction,
  onRejectAction,
}: ApprovalCenterViewProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const historicalApprovals = approvals.filter((a) => a.status !== 'PENDING');

  const getRiskTone = (level: string): BadgeTone => {
    switch (level) {
      case 'L4':
        return 'bad';
      case 'L3':
        return 'warning';
      case 'L2':
        return 'cool';
      case 'L1':
        return 'neutral';
      case 'L0':
      default:
        return 'ok';
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setIsProcessing(true);
      await onApproveAction(id, decisionReason || 'Human authorized via web UI');
      setSelectedApproval(null);
      setDecisionReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setIsProcessing(true);
      await onRejectAction(id, decisionReason || 'Human rejected via web UI');
      setSelectedApproval(null);
      setDecisionReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Approval Center</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Human-controlled autonomy governance. Sensitive operations (L2 to L4) are held until authorized by human sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs rounded-[var(--radius-pill)] border transition-colors flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-[var(--color-paper-3)] border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Pending queue ({pendingApprovals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs rounded-[var(--radius-pill)] border transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[var(--color-paper-3)] border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit history ({historicalApprovals.length})
          </button>
        </div>
      </div>

      {/* Main Approval Grid & Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approvals Table / Cards */}
        <div className="lg:col-span-2 space-y-3">
          {activeTab === 'pending' ? (
            pendingApprovals.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No pending approval requests"
                description="Agents are operating autonomously within safe boundaries. High-risk operations will appear here for human authorization."
              />
            ) : (
              pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedApproval(item)}
                  className={`p-4 bg-[var(--color-paper-2)] border rounded-[var(--radius-card)] cursor-pointer transition-colors ${
                    selectedApproval?.id === item.id
                      ? 'border-[var(--color-accent)]'
                      : 'border-[var(--color-rule)] hover:border-[var(--color-rule-2)]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={getRiskTone(item.riskLevel)}>{item.riskLevel}</Badge>
                      <span className="text-xs font-mono text-[var(--color-muted)]">{item.actionCategory}</span>
                      <span className="text-xs font-mono text-[var(--color-ink)] font-semibold truncate max-w-sm">
                        {item.actionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        disabled={isProcessing}
                        className="px-2.5 py-1 text-xs border border-[var(--color-rule)] text-[var(--color-ink-2)] rounded-[var(--radius-pill)] hover:bg-[var(--color-paper-3)] disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        disabled={isProcessing}
                        className="px-2.5 py-1 text-xs bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium rounded-[var(--radius-pill)] hover:opacity-90 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-ink-2)] mt-2 font-mono">
                    {item.description || 'Action awaiting explicit operator authorization.'}
                  </p>

                  <div className="mt-3 pt-2 border-t border-[var(--color-rule)] flex items-center justify-between text-[11px] font-mono text-[var(--color-muted)]">
                    <span>id: {item.id}</span>
                    <span>created: {item.createdAt ? item.createdAt.slice(0, 19).replace('T', ' ') : 'now'}</span>
                  </div>
                </div>
              ))
            )
          ) : (
            historicalApprovals.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No historical approval records"
                description="Past approved and rejected actions are permanently archived for governance compliance."
              />
            ) : (
              historicalApprovals.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={item.status === 'APPROVED' ? 'ok' : 'bad'}>
                        {item.status.toLowerCase()}
                      </Badge>
                      <Badge tone={getRiskTone(item.riskLevel)}>{item.riskLevel}</Badge>
                      <span className="text-xs font-mono text-[var(--color-ink)] font-medium">
                        {item.actionType}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-[var(--color-muted)]">
                      {item.reviewedByUserId ? `by ${item.reviewedByUserId}` : 'system'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-muted)] mt-1.5 font-mono">
                    {item.description}
                  </p>

                  {item.decisionReason && (
                    <div className="mt-2 text-xs text-[var(--color-ink-2)] bg-[var(--color-paper)] p-2 rounded-[var(--radius-pill)] border border-[var(--color-rule)]">
                      <span className="text-[var(--color-muted)]">Decision reason:</span> {item.decisionReason}
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>

        {/* Selected Approval Details Inspector */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] h-fit space-y-4">
          {selectedApproval ? (
            <>
              <div className="pb-3 border-b border-[var(--color-rule)]">
                <span className="text-[11px] font-mono text-[var(--color-muted)]">governance inspector</span>
                <h3 className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">
                  Approval Request {selectedApproval.id}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[var(--color-muted)] block">Risk classification</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone={getRiskTone(selectedApproval.riskLevel)}>
                      {selectedApproval.riskLevel}
                    </Badge>
                    <span className="text-[var(--color-ink-2)] font-mono">
                      Category: {selectedApproval.actionCategory}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[var(--color-muted)] block">Action type</span>
                  <span className="font-mono text-[var(--color-ink)] block mt-0.5">
                    {selectedApproval.actionType}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--color-muted)] block">Operation details</span>
                  <div className="p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] font-mono text-xs text-[var(--color-ink-2)] break-all mt-1">
                    {selectedApproval.description}
                  </div>
                </div>

                <div>
                  <span className="text-[var(--color-muted)] block">Decision rationale (optional)</span>
                  <input
                    type="text"
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Enter reason for audit record..."
                    className="w-full p-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)] mt-1"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--color-rule)] flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReject(selectedApproval.id)}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 text-xs border border-[var(--color-bad)] text-[var(--color-bad)] rounded-[var(--radius-pill)] hover:bg-[var(--color-bad-soft)] transition-colors disabled:opacity-50"
                >
                  Reject action
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedApproval.id)}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 text-xs bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium rounded-[var(--radius-pill)] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Approve action
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-muted)] text-center py-8">
              Select a pending approval from the queue to inspect payload, risk bounds, and authorize execution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
