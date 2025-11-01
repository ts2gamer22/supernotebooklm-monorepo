/**
 * AgentsTab - Research Synthesizer Agent UI
 * Allows users to run the Research Synthesizer Agent
 */

import { useState } from 'react';
import { Brain, FileText, Link as LinkIcon, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { agentService } from '@/src/services/AgentService';
import type { AgentResult } from '@/src/types/agent';
import type { ResearchSynthesizerResult } from '@/src/types/paper';
import { paperExtractionService } from '@/src/services/PaperExtractionService';
import { AgentProgressModal } from './AgentProgressModal';
import { AgentResultsModal } from './AgentResultsModal';

type PaperSource = { type: 'url' | 'file'; value: string | File; id: string };

export function AgentsTab() {
  const [researchQuestion, setResearchQuestion] = useState('');
  const [paperSources, setPaperSources] = useState<PaperSource[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;

    // Basic URL validation
    try {
      new URL(urlInput);
      setPaperSources([
        ...paperSources,
        { type: 'url', value: urlInput.trim(), id: `url-${Date.now()}` },
      ]);
      setUrlInput('');
    } catch {
      setError('Invalid URL format');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleFileUpload = async () => {
    try {
      const files = await paperExtractionService.selectPDFFiles();
      const newSources: PaperSource[] = files.map(file => ({
        type: 'file',
        value: file,
        id: `file-${Date.now()}-${Math.random()}`,
      }));
      setPaperSources([...paperSources, ...newSources]);
    } catch (error) {
      console.error('File selection error:', error);
      setError('Failed to select files');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveSource = (id: string) => {
    setPaperSources(paperSources.filter(source => source.id !== id));
  };

  const handleRunAgent = async () => {
    // Validation
    if (!researchQuestion.trim()) {
      setError('Please enter a research question');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (paperSources.length === 0) {
      setError('Please add at least one paper (URL or PDF)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (paperSources.length > 10) {
      setError('Maximum 10 papers allowed (upgrade to Pro for 25)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setCurrentStep('Initializing...');
    setError('');
    setAgentResult(null);

    try {
      const { cancel, result } = agentService.startAgent(
        'research-synth',
        {
          papers: paperSources.map(source => ({
            type: source.type,
            value: source.value,
          })),
          researchQuestion: researchQuestion.trim(),
          maxPapers: 10,
          includeMethodologies: true,
        },
        {
          onProgress: (prog, step) => {
            setProgress(prog);
            if (step) setCurrentStep(step);
          },
          onStepComplete: (step) => {
            console.log(`Step completed: ${step}`);
          },
          onError: (err) => {
            console.error('Agent error:', err);
          },
        }
      );

      setCancelFn(() => cancel);

      const finalResult = await result;
      setAgentResult(finalResult);

      if (!finalResult.success) {
        setError(finalResult.errors.map(e => e.message).join(', '));
      }
    } catch (err) {
      console.error('Agent execution failed:', err);
      setError(err instanceof Error ? err.message : 'Agent execution failed');
    } finally {
      setIsRunning(false);
      setCancelFn(null);
    }
  };

  const handleCancel = () => {
    if (cancelFn) {
      cancelFn();
      setIsRunning(false);
      setCancelFn(null);
      setError('Agent cancelled by user');
    }
  };

  const handleCloseResults = () => {
    setAgentResult(null);
    setProgress(0);
    setCurrentStep('');
  };

  const handleDownloadReport = () => {
    if (!agentResult || !agentResult.success) return;

    const result = agentResult.data as ResearchSynthesizerResult;
    const blob = new Blob([result.markdownReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-synthesis-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    if (!agentResult || !agentResult.success) return;

    const result = agentResult.data as ResearchSynthesizerResult;
    navigator.clipboard.writeText(result.markdownReport);
    // Could show a toast notification here
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Brain size={32} className="text-blue-500" />
        <div>
          <h2 className="text-xl font-semibold text-white">Research Synthesizer</h2>
          <p className="text-sm text-gray-400">
            Analyze research papers and identify knowledge gaps
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 flex items-center justify-between">
          <span className="text-red-200 text-sm">{error}</span>
          <button onClick={() => setError('')} className="text-red-200 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Research Question Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Research Question *</label>
        <textarea
          value={researchQuestion}
          onChange={e => setResearchQuestion(e.target.value)}
          placeholder="What are the current approaches to multimodal AI training?"
          className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={isRunning}
        />
      </div>

      {/* Paper Sources Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Research Papers ({paperSources.length}/10)
        </label>

        {/* Add URL */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
            placeholder="Paste paper URL (arXiv, PubMed, etc.)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isRunning}
          />
          <Button onClick={handleAddUrl} disabled={isRunning} size="default">
            <LinkIcon size={16} className="mr-2" />
            Add URL
          </Button>
        </div>

        {/* Upload PDF */}
        <Button
          onClick={handleFileUpload}
          variant="outline"
          disabled={isRunning}
          className="w-full"
        >
          <FileText size={16} className="mr-2" />
          Upload PDF Files
        </Button>

        {/* Paper List */}
        {paperSources.length > 0 && (
          <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
            {paperSources.map(source => (
              <div
                key={source.id}
                className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-2"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {source.type === 'url' ? (
                    <LinkIcon size={16} className="text-blue-400 flex-shrink-0" />
                  ) : (
                    <FileText size={16} className="text-green-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-300 truncate">
                    {source.type === 'url'
                      ? source.value as string
                      : (source.value as File).name}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveSource(source.id)}
                  disabled={isRunning}
                  className="text-gray-400 hover:text-red-400 ml-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run Button */}
      <Button
        onClick={handleRunAgent}
        disabled={isRunning || paperSources.length === 0 || !researchQuestion.trim()}
        className="w-full py-3"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 size={20} className="mr-2 animate-spin" />
            Running Agent...
          </>
        ) : (
          <>
            <Brain size={20} className="mr-2" />
            Analyze Papers
          </>
        )}
      </Button>

      {/* Info Text */}
      <div className="text-xs text-gray-500 text-center">
        Free tier: Up to 10 papers • Estimated time: 1-2 minutes
      </div>

      {/* Progress Modal */}
      {isRunning && (
        <AgentProgressModal
          isOpen={isRunning}
          progress={progress}
          currentStep={currentStep}
          onCancel={handleCancel}
        />
      )}

      {/* Results Modal */}
      {agentResult && agentResult.success && (
        <AgentResultsModal
          isOpen={true}
          result={agentResult.data as ResearchSynthesizerResult}
          onClose={handleCloseResults}
          onDownload={handleDownloadReport}
          onCopy={handleCopyToClipboard}
        />
      )}
    </div>
  );
}
