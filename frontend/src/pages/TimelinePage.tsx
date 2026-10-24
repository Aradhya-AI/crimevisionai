import React, { useState, useEffect } from 'react';
import {
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  Video,
  Mic,
  Camera,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import { Case, TimelineEvent } from '../services/types';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';

interface TimelinePageProps {
  activeCase: Case | null;
  onSelectEventMedia?: (evidenceId: string, timestamp: number) => void;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  activeCase,
  onSelectEventMedia,
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  useEffect(() => {
    if (activeCase) {
      loadTimeline();
    }
  }, [activeCase?.id]);

  const loadTimeline = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const data = await api.getTimeline(activeCase.id);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events
    .filter((e) => {
      if (filterType !== 'all' && e.event_type !== filterType) return false;
      if (filterStatus !== 'all' && e.verification_status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      return sortAsc
        ? a.timestamp_start - b.timestamp_start
        : b.timestamp_start - a.timestamp_start;
    });

  if (!activeCase) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-charcoal-700/60 max-w-xl mx-auto my-12">
        <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">No Investigation Selected</h3>
        <p className="text-xs text-slate-400 mt-1">
          Select an active case from the dropdown above to view its unified chronological timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
              CROSS-SENSOR TEMPORAL NORMALIZATION
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Unified Multimodal Timeline</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Chronologically aligned audio utterances, video surveillance detections, and static scene elements.
          </p>
        </div>

        {/* Sort & Quick Stats */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-charcoal-850 hover:bg-charcoal-800 border border-charcoal-700 flex items-center space-x-1.5 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>{sortAsc ? 'Ascending (0s → End)' : 'Descending'}</span>
          </button>
          <Badge label={`${filteredEvents.length} Events`} size="md" variant="cyan" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-3.5 rounded-xl border border-charcoal-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Event Type Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-mono text-[11px]">EVENT TYPE:</span>
          {['all', 'object_detection', 'speech_utterance', 'temporal_action'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-colors ${
                filterType === t
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'bg-charcoal-850 text-slate-400 border border-charcoal-700 hover:text-white'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Verification Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-mono text-[11px]">STATUS:</span>
          {['all', 'corroborated', 'unverified'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-colors ${
                filterStatus === s
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : 'bg-charcoal-850 text-slate-400 border border-charcoal-700 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Loading synchronized multimodal timeline...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-2xl border border-charcoal-700/60 text-slate-500 text-xs">
          No events match the selected filter. Run analysis on case evidence files to generate timeline entries.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-charcoal-700/60">
          {filteredEvents.map((event, idx) => {
            const isCorroborated = event.verification_status === 'corroborated';
            const isAudio = event.event_type === 'speech_utterance';
            const isVideo = event.event_type === 'object_detection' || event.event_type === 'temporal_action';

            return (
              <div key={event.id || idx} className="relative group">
                {/* Timeline Node Marker */}
                <div
                  className={`absolute -left-6 top-3 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                    isCorroborated
                      ? 'border-emerald-400 bg-emerald-950 shadow-glow-cyan'
                      : 'border-cyan-400 bg-charcoal-900'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCorroborated ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                  />
                </div>

                {/* Event Card */}
                <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60 hover:border-cyan-500/40 transition-all duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-charcoal-700/60">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                        {event.timestamp_start.toFixed(1)}s — {event.timestamp_end.toFixed(1)}s
                      </span>
                      <Badge
                        label={event.event_type.replace('_', ' ').toUpperCase()}
                        size="sm"
                        variant={isAudio ? 'amber' : isVideo ? 'blue' : 'cyan'}
                        icon={isAudio ? <Mic className="w-2.5 h-2.5" /> : <Video className="w-2.5 h-2.5" />}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border flex items-center space-x-1 ${
                          isCorroborated
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-charcoal-800 text-slate-400 border-charcoal-700'
                        }`}
                      >
                        {isCorroborated ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <HelpCircle className="w-2.5 h-2.5 text-slate-500" />
                        )}
                        <span>{event.verification_status.toUpperCase()}</span>
                      </span>

                      {event.confidence !== null && (
                        <span className="text-[10px] font-mono text-slate-400">
                          CONF: {Math.round(event.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Description */}
                  <p className="text-xs text-white font-medium mb-3">{event.description}</p>

                  {/* Supporting Observations List */}
                  {event.supporting_observations && event.supporting_observations.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-charcoal-850/80 border border-charcoal-700/40 text-[11px] text-slate-300 space-y-1 mb-2">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">
                        SUPPORTING AUDIT OBSERVATIONS:
                      </span>
                      {event.supporting_observations.map((obs, oIdx) => (
                        <p key={oIdx} className="flex items-start space-x-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{obs}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Source Evidence Links */}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                    <div className="flex items-center space-x-1.5">
                      <FileCheck className="w-3 h-3 text-cyan-400" />
                      <span>SOURCES: {event.source_evidence_ids?.join(', ') || 'Case Evidence'}</span>
                    </div>

                    {onSelectEventMedia && event.source_evidence_ids?.[0] && (
                      <button
                        onClick={() =>
                          onSelectEventMedia(event.source_evidence_ids[0], event.timestamp_start)
                        }
                        className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                      >
                        Open In Explorer →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
