import { Brain } from 'lucide-react';

export function AgentsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Brain size={48} className="text-nb-blue mb-4" />
      <h2 className="text-xl font-semibold text-nb-text mb-2">AI Agents</h2>
      <p className="text-nb-text-dim text-sm">
        Automated research workflows.
      </p>
      <div className="mt-6 p-4 bg-nb-dark-200 rounded-lg text-sm text-nb-text-dim">
        Epic 5 will implement AI agent workflows
      </div>
    </div>
  );
}
