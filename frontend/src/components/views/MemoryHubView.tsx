import React, { useState } from 'react';
import {
  Database,
  Search,
  Plus,
  X,
  Sparkles,
  BookOpen,
  Filter,
  Layers,
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
      <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Memory Hub</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Shared cross-session intelligence store. Agents retrieve conventions, past decisions, and lessons before task planning.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="px-3 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Store memory
        </button>
      </div>

      {/* Creation Modal / Form */}
      {isCreating && (
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-accent)] rounded-[var(--radius-card)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Add shared memory record</h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateMemory} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-muted)] block mb-1">Memory title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="E.g., Default-deny permission architecture"
                  className="w-full p-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted)] block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)]"
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
              <label className="text-xs text-[var(--color-muted)] block mb-1">Memory content</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Describe the architectural rule, decision rationale, or learned constraint..."
                rows={4}
                className="w-full p-3 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)] resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Persist memory'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Two Column Layout: Memory Records & Live Context Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Memory List with Filter & Search */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--color-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories by keyword..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-[var(--radius-pill)] border transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-paper-3)] border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
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
              description="Store key architectural decisions or past run lessons so agents can recall them."
              action={{
                label: 'Create memory',
                onClick: () => setIsCreating(true),
              }}
            />
          ) : (
            <div className="space-y-3">
              {filteredMemories.map((m) => (
                <div
                  key={m.id}
                  className="p-4 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="cool">{m.category.toLowerCase()}</Badge>
                        <span className="text-[11px] font-mono text-[var(--color-muted)]">
                          {m.createdAt ? m.createdAt.slice(0, 10) : 'recent'}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[var(--color-ink)] mt-1.5">
                        {m.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-muted)] px-1.5 py-0.5 bg-[var(--color-paper)] rounded">
                      {m.sourceType || 'PERSISTED'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-ink-2)] font-mono leading-relaxed bg-[var(--color-paper)] p-2.5 rounded-[var(--radius-pill)] border border-[var(--color-rule)] mt-2">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Real Dynamic Context Builder Preview */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] h-fit space-y-4">
          <div className="pb-3 border-b border-[var(--color-rule)]">
            <span className="text-[11px] font-mono text-[var(--color-muted)]">context synthesis</span>
            <h3 className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">
              Live Context Builder
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Test how memories are assembled into prompt context for an agent task.
            </p>
          </div>

          <form onSubmit={handleBuildContext} className="space-y-3">
            <div>
              <label className="text-xs text-[var(--color-muted)] block mb-1">Target task title</label>
              <input
                type="text"
                value={testTaskTitle}
                onChange={(e) => setTestTaskTitle(e.target.value)}
                className="w-full p-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--color-muted)] block mb-1">Keywords filter</label>
              <input
                type="text"
                value={testKeywords}
                onChange={(e) => setTestKeywords(e.target.value)}
                placeholder="comma, separated, tags"
                className="w-full p-2 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)]"
              />
            </div>

            <button
              type="submit"
              disabled={isBuildingContext}
              className="w-full py-1.5 text-xs font-medium bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] text-[var(--color-ink)] rounded-[var(--radius-pill)] hover:bg-[var(--color-paper)] transition-colors disabled:opacity-50"
            >
              {isBuildingContext ? 'Retrieving memories...' : 'Synthesize prompt context'}
            </button>
          </form>

          {compiledContext && (
            <div className="pt-3 border-t border-[var(--color-rule)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-muted)]">Memories injected:</span>
                <Badge tone="accent">{compiledContext.retrievedMemoriesCount} records</Badge>
              </div>

              <div className="p-2.5 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] max-h-60 overflow-y-auto font-mono text-[11px] text-[var(--color-ink-2)]">
                {compiledContext.markdown || 'No memories matched the specified keywords.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
