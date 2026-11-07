import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Clock,
  Key,
  Filter,
  Shield,
  AlertTriangle,
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-[#0e1424]/95 via-[#141c32]/85 to-[#0e1424]/95 backdrop-blur-xl border border-[var(--color-rule-2)] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#f43f5e] shadow-[0_0_8px_#f43f5e]" />
            <h2 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
              Autonomy Governance & Approval Center
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Human-in-the-loop security boundary. Operations rated L2 to L4 require explicit cryptographic authorization before sandbox execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-[#f43f5e]/20 border-[#f43f5e] text-[#fb7185] shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                : 'border-white/10 text-[var(--color-muted)] hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Pending Queue ({pendingApprovals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[var(--color-accent-soft)] border-[var(--color-accent)] text-[var(--color-accent)] shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                : 'border-white/10 text-[var(--color-muted)] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit History ({historicalApprovals.length})
          </button>
        </div>
      </motion.div>

      {/* Main Approval Grid & Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approvals Table / Cards */}
        <div className="lg:col-span-2 space-y-3.5">
          {activeTab === 'pending' ? (
            pendingApprovals.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="All governance gates clear"
                description="Autonomous agents are currently executing within verified L0-L1 policy parameters."
              />
            ) : (
              pendingApprovals.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedApproval(item)}
                  className={`p-5 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border cursor-pointer transition-all shadow-md ${
                    selectedApproval?.id === item.id
                      ? 'border-[#f43f5e] shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(244,63,94,0.2)]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Badge tone={getRiskTone(item.riskLevel)}>{item.riskLevel}</Badge>
                      <span className="text-xs font-mono text-[var(--color-muted)]">{item.actionCategory}</span>
                      <span className="text-xs font-mono text-[var(--color-ink)] font-semibold truncate max-w-sm">
                        {item.actionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto" onClick={(e) => e.stopPropagation()}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => handleReject(item.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-medium border border-white/10 text-[var(--color-ink-2)] rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                      >
                        Reject
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-lg hover:shadow-[0_0_12px_rgba(0,242,254,0.4)] transition-all disabled:opacity-50"
                      >
                        Authorize
                      </motion.button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-ink-2)] mt-2.5 font-mono leading-relaxed bg-[#060911] p-3 rounded-xl border border-white/5">
                    {item.description || 'Action awaiting explicit operator authorization.'}
                  </p>

                  <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[var(--color-muted)]">
                    <span>Gate ID: {item.id}</span>
                    <span>Created: {item.createdAt ? `${item.createdAt.slice(0, 19).replace('T', ' ')} UTC` : 'now'}</span>
                  </div>
                </motion.div>
              ))
            )
          ) : (
            historicalApprovals.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No historical governance records"
                description="Past approved and rejected operations are archived immutably in PostgreSQL audit logs."
              />
            ) : (
              historicalApprovals.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2 }}
                  className="p-5 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Badge tone={item.status === 'APPROVED' ? 'ok' : 'bad'}>
                        {item.status.toLowerCase()}
                      </Badge>
                      <Badge tone={getRiskTone(item.riskLevel)}>{item.riskLevel}</Badge>
                      <span className="text-xs font-mono text-[var(--color-ink)] font-semibold">
                        {item.actionType}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-[var(--color-muted)]">
                      {item.reviewedByUserId ? `signed by ${item.reviewedByUserId}` : 'system policy'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-muted)] mt-2 font-mono">
                    {item.description}
                  </p>

                  {item.decisionReason && (
                    <div className="mt-2.5 text-xs text-[var(--color-ink-2)] bg-[#060911] p-2.5 rounded-xl border border-white/5 font-mono">
                      <span className="text-[var(--color-accent)]">Reason:</span> {item.decisionReason}
                    </div>
                  )}
                </motion.div>
              ))
            )
          )}
        </div>

        {/* Selected Approval Details Inspector */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule)] shadow-lg h-fit space-y-4">
          {selectedApproval ? (
            <>
              <div className="pb-4 border-b border-white/10">
                <span className="text-[11px] font-mono text-[var(--color-accent)] uppercase tracking-wider">
                  Governance Gate Inspector
                </span>
                <h3 className="text-base font-semibold text-[var(--color-ink)] mt-1 tracking-tight">
                  Approval Request {selectedApproval.id}
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[var(--color-muted)] block font-mono text-[11px]">Risk Classification</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone={getRiskTone(selectedApproval.riskLevel)}>
                      LEVEL {selectedApproval.riskLevel}
                    </Badge>
                    <span className="text-[var(--color-ink-2)] font-mono">
                      Category: {selectedApproval.actionCategory}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[var(--color-muted)] block font-mono text-[11px]">Target Action Type</span>
                  <span className="font-mono font-semibold text-[var(--color-accent)] block mt-0.5">
                    {selectedApproval.actionType}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--color-muted)] block font-mono text-[11px]">Payload Digest</span>
                  <div className="p-3 bg-[#060911] border border-white/10 rounded-xl font-mono text-xs text-[var(--color-ink-2)] break-all mt-1 leading-relaxed">
                    {selectedApproval.description}
                  </div>
                </div>

                <div>
                  <label className="text-[var(--color-muted)] block font-mono text-[11px]">Decision Audit Note (Optional)</label>
                  <input
                    type="text"
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Enter audit rationale..."
                    className="w-full p-2.5 text-xs bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none mt-1"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleReject(selectedApproval.id)}
                  disabled={isProcessing}
                  className="flex-1 py-2 text-xs font-semibold border border-[#f43f5e] text-[#fb7185] bg-[#f43f5e]/15 rounded-xl hover:bg-[#f43f5e]/25 transition-all disabled:opacity-50"
                >
                  Reject Action
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleApprove(selectedApproval.id)}
                  disabled={isProcessing}
                  className="flex-1 py-2 text-xs font-semibold bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] text-black rounded-xl hover:shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all disabled:opacity-50"
                >
                  Authorize Execution
                </motion.button>
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-muted)] text-center py-12">
              Select a pending approval from the queue to inspect payload, risk bounds, and authorize sandbox execution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
