import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Search,
  Plus,
  X,
  Sparkles,
  BookOpen,
  Filter,
  Layers,
  Cpu,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { api, type MemoryItem, type ContextPayload } from '../../api/client';

interface MemoryHubViewProps {
  memories: MemoryItem[];
  onRefreshMemories: () => Promise<void>;
}

const categories = [
  'ALL',
  'DECISION',
  'LESSON_LEARNED',
  'PROJECT_CONTEXT',
  'PATTERN',
  'ERROR_RECOVERY',
  'USER_PREFERENCE',
];

export function MemoryHubView({ memories, onRefreshMemories }: MemoryHubViewProps) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isBuildingContext, setIsBuildingContext] = useState(false);
  const [compiledContext, setCompiledContext] = useState<ContextPayload | null>(null);

  // New Memory state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('DECISION');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Context Builder state
  const [testTaskTitle, setTestTaskTitle] = useState('Verify runtime permissions');
  const [testKeywords, setTestKeywords] = useState('security, permissions, opencode');

  const filteredMemories = memories.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await api.createMemory({
        category: newCategory,
        title: newTitle.trim(),
        content: newContent.trim(),
        sourceType: 'OPERATOR_WEB_UI',
      });
      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      await onRefreshMemories();
    } catch (err) {
      console.error('Failed to create memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuildContext = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsBuildingContext(true);
      const res = await api.getProjectContext('proj-default', {
        taskTitle: testTaskTitle,
        keywords: testKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      });
      setCompiledContext(res.data);
    } catch (err) {
      console.error('Failed to build context:', err);
    } finally {
      setIsBuildingContext(false);
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
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_#00f2fe]" />
            <h2 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
              Shared Intelligence Memory Hub
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Persistent cross-session knowledge repository. Agents synthesize past architectural decisions, lessons, and patterns before task execution.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] text-black rounded-xl hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          Store Memory Record
        </motion.button>
      </motion.div>

      {/* Creation Modal / Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-2xl bg-[#0e1424] border border-[var(--color-accent)] shadow-[0_0_30px_rgba(0,242,254,0.15)] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-2">
                <Database className="w-4 h-4 text-[var(--color-accent)]" />
                Add Shared Intelligence Memory Record
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 rounded-lg text-[var(--color-muted)] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Memory Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="E.g., Default-deny permission architecture"
                    className="w-full p-3 text-xs bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
                  >
                    <option value="DECISION">DECISION</option>
                    <option value="LESSON_LEARNED">LESSON_LEARNED</option>
                    <option value="PROJECT_CONTEXT">PROJECT_CONTEXT</option>
                    <option value="PATTERN">PATTERN</option>
                    <option value="ERROR_RECOVERY">ERROR_RECOVERY</option>
                    <option value="USER_PREFERENCE">USER_PREFERENCE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Knowledge Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe the architectural rule, decision rationale, or learned constraint..."
                  rows={4}
                  className="w-full p-3 text-xs font-mono bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs text-[var(--color-muted)] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-xl hover:shadow-[0_0_14px_rgba(0,242,254,0.4)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Persist Memory'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two Column Layout: Memory Records & Live Context Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Memory List with Filter & Search */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--color-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge repository by keyword..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-[11px] font-mono rounded-xl border transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-accent-soft)] border-[var(--color-accent)] text-[var(--color-accent)] font-semibold shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                      : 'border-white/10 text-[var(--color-muted)] hover:text-white'
                  }`}
                >
                  {cat.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {filteredMemories.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No memories match criteria"
              description="Store key architectural decisions or past run lessons so agents can recall them during planning."
              action={{
                label: 'Create Memory Record',
                onClick: () => setIsCreating(true),
              }}
            />
          ) : (
            <div className="space-y-3">
              {filteredMemories.map((m) => (
                <motion.div
                  key={m.id}
                  whileHover={{ y: -2 }}
                  className="p-5 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-white/10 hover:border-[var(--color-accent)]/30 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="cool">{m.category.toLowerCase()}</Badge>
                        <span className="text-[11px] font-mono text-[var(--color-muted-2)]">
                          {m.createdAt ? m.createdAt.slice(0, 10) : 'recent'}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[var(--color-ink)] mt-2 tracking-tight">
                        {m.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-muted)] px-2 py-0.5 bg-white/[0.04] rounded-md border border-white/5">
                      {m.sourceType || 'PERSISTED'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-ink-2)] font-mono leading-relaxed bg-[#060911] p-3 rounded-xl border border-white/5 mt-3">
                    {m.content}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Real Dynamic Context Builder Preview */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule)] shadow-lg h-fit space-y-4">
          <div className="pb-4 border-b border-white/10">
            <span className="text-[11px] font-mono text-[var(--color-accent)] uppercase tracking-wider">
              Context Synthesis Engine
            </span>
            <h3 className="text-sm font-semibold text-[var(--color-ink)] mt-1">
              Live Prompt Context Builder
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Simulate how vector memory extracts and compiles context for an autonomous agent task prompt.
            </p>
          </div>

          <form onSubmit={handleBuildContext} className="space-y-3.5">
            <div>
              <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Target Task Title</label>
              <input
                type="text"
                value={testTaskTitle}
                onChange={(e) => setTestTaskTitle(e.target.value)}
                className="w-full p-2.5 text-xs bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Keywords Filter</label>
              <input
                type="text"
                value={testKeywords}
                onChange={(e) => setTestKeywords(e.target.value)}
                placeholder="comma, separated, tags"
                className="w-full p-2.5 text-xs font-mono bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isBuildingContext}
              className="w-full py-2.5 text-xs font-semibold bg-white/[0.06] border border-white/15 text-[var(--color-ink)] rounded-xl hover:bg-white/10 hover:border-[var(--color-accent)]/50 transition-all disabled:opacity-50"
            >
              {isBuildingContext ? 'Retrieving Memories...' : '⚡ Synthesize Prompt Context'}
            </motion.button>
          </form>

          {compiledContext && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4 border-t border-white/10 space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-muted)] font-mono">Injected Records:</span>
                <Badge tone="accent">{compiledContext.retrievedMemoriesCount} records</Badge>
              </div>

              <div className="p-3 bg-[#060911] border border-white/10 rounded-xl max-h-60 overflow-y-auto font-mono text-[11px] text-[var(--color-ink-2)] leading-relaxed">
                {compiledContext.markdown || 'No memories matched the specified keywords.'}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
