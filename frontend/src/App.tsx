import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { EvidenceExplorerPage } from './pages/EvidenceExplorerPage';
import { ChatPage } from './pages/ChatPage';
import { TimelinePage } from './pages/TimelinePage';
import { Scene3DPage } from './pages/Scene3DPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Modal } from './components/ui/Modal';
import { Case, DashboardStats } from './services/types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiMode, setAiMode] = useState<string>('DEMO');

  // Modal State for New Investigation
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newInvestigator, setNewInvestigator] = useState('Senior Forensic Examiner');
  const [creatingCase, setCreatingCase] = useState(false);

  // Target Evidence for Explorer navigation
  const [explorerTargetEvId, setExplorerTargetEvId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [caseList, dashboardStats, settings] = await Promise.all([
        api.getCases(),
        api.getDashboardStats().catch(() => null),
        api.getSettings().catch(() => null)
      ]);

      setCases(caseList);
      if (dashboardStats) setStats(dashboardStats);
      if (settings?.ai_mode) setAiMode(settings.ai_mode);

      if (caseList.length > 0 && !selectedCaseId) {
        setSelectedCaseId(caseList[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creatingCase) return;

    setCreatingCase(true);
    try {
      const created = await api.createCase({
        title: newTitle,
        description: newDescription,
        location: newLocation,
        lead_investigator: newInvestigator,
      });

      setCases((prev) => [created, ...prev]);
      setSelectedCaseId(created.id);
      setIsNewCaseOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewLocation('');
      setCurrentTab('workspace');

      // Refresh stats
      const newStats = await api.getDashboardStats().catch(() => null);
      if (newStats) setStats(newStats);
    } catch (err: any) {
      alert(`Failed to create case: ${err.message}`);
    } finally {
      setCreatingCase(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      const res = await api.seedDemo();
      await loadInitialData();
      if (res.case_id) {
        setSelectedCaseId(res.case_id);
        setCurrentTab('workspace');
      }
    } catch (err: any) {
      alert(`Demo seeding error: ${err.message}`);
    }
  };

  const activeCase = cases.find((c) => c.id === selectedCaseId) || (cases.length > 0 ? cases[0] : null);

  const handleOpenExplorerWithEvidence = (evidenceId: string) => {
    setExplorerTargetEvId(evidenceId);
    setCurrentTab('explorer');
  };

  return (
    <div className="min-h-screen bg-charcoal-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        cases={cases}
        selectedCaseId={selectedCaseId}
        onSelectCase={handleSelectCase}
        onOpenNewCaseModal={() => setIsNewCaseOpen(true)}
        onSeedDemo={handleSeedDemo}
        aiMode={aiMode}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          activeCaseId={selectedCaseId}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardPage
              stats={stats}
              cases={cases}
              onSelectCase={handleSelectCase}
              onNavigateTab={setCurrentTab}
              onOpenNewCaseModal={() => setIsNewCaseOpen(true)}
              onSeedDemo={handleSeedDemo}
            />
          )}

          {currentTab === 'workspace' && (
            <WorkspacePage
              activeCase={activeCase}
              onRefreshCase={loadInitialData}
              onOpenExplorer={handleOpenExplorerWithEvidence}
            />
          )}

          {currentTab === 'explorer' && (
            <EvidenceExplorerPage
              activeCase={activeCase}
              targetEvidenceId={explorerTargetEvId}
            />
          )}

          {currentTab === 'chat' && (
            <ChatPage activeCase={activeCase} />
          )}

          {currentTab === 'timeline' && (
            <TimelinePage
              activeCase={activeCase}
              onSelectEventMedia={(evId, ts) => handleOpenExplorerWithEvidence(evId)}
            />
          )}

          {currentTab === 'scene3d' && (
            <Scene3DPage activeCase={activeCase} />
          )}

          {currentTab === 'reports' && (
            <ReportsPage activeCase={activeCase} />
          )}

          {currentTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* New Investigation Modal */}
      <Modal
        isOpen={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
        title="Initiate New Forensic Investigation"
        subtitle="Registers a secure cryptographic case locker and chain-of-custody log."
      >
        <form onSubmit={handleCreateCase} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Investigation Title *</label>
            <input
              type="text"
              placeholder="e.g., Commercial Break-in & Vault Breach at 410 Diamond Ave"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Incident Location</label>
            <input
              type="text"
              placeholder="e.g., Sector 4 Commercial Arcade, Metro Central"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Lead Forensic Investigator</label>
            <input
              type="text"
              value={newInvestigator}
              onChange={(e) => setNewInvestigator(e.target.value)}
              className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Initial Synopsis & Case Notes</label>
            <textarea
              placeholder="Summary of preliminary incident report, responding units, and scope of evidence..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsNewCaseOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingCase}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-glow-cyan transition-all"
            >
              {creatingCase ? 'Creating Dossier...' : 'Create Investigation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
