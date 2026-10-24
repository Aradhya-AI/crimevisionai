import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  Filter,
  Search,
  Eye,
  Download,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Case, EvidenceItem, AnalysisResult, DetectionItem } from '../services/types';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';

interface EvidenceExplorerProps {
  activeCase: Case | null;
  targetEvidenceId?: string;
}

export const EvidenceExplorerPage: React.FC<EvidenceExplorerProps> = ({
  activeCase,
  targetEvidenceId,
}) => {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(targetEvidenceId || '');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [hoveredDetIdx, setHoveredDetIdx] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (activeCase) {
      loadEvidence();
    }
  }, [activeCase?.id]);

  useEffect(() => {
    if (targetEvidenceId) {
      setSelectedId(targetEvidenceId);
    }
  }, [targetEvidenceId]);

  useEffect(() => {
    if (selectedId) {
      loadAnalysis(selectedId);
    }
  }, [selectedId]);

  const loadEvidence = async () => {
    if (!activeCase) return;
    try {
      const items = await api.getCaseEvidence(activeCase.id);
      setEvidenceList(items);
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnalysis = async (evId: string) => {
    try {
      const anl = await api.getEvidenceAnalysis(evId);
      setAnalysis(anl);
    } catch {
      setAnalysis(null);
    }
  };

  const currentEvidence = evidenceList.find((e) => e.id === selectedId);

  // Filter detections by search and filter category
  const filteredDetections = (analysis?.detections || []).filter((det) => {
    const matchesSearch = det.label.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'person') return det.label.toLowerCase() === 'person';
    if (activeFilter === 'vehicle') return ['car', 'motorcycle', 'truck'].includes(det.label.toLowerCase());
    if (activeFilter === 'weapon') return det.is_weapon_candidate || ['knife', 'scissors', 'gun'].includes(det.label.toLowerCase());
    return true;
  });

  // Render bounding boxes on HTML5 canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background schematic grid
    ctx.strokeStyle = '#152033';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Scale bounding boxes to canvas dimensions (800x480 standard canvas)
    const originalW = 1280;
    const originalH = 720;
    const scaleX = canvas.width / originalW;
    const scaleY = canvas.height / originalH;

    filteredDetections.forEach((det, idx) => {
      if (!det.bbox || det.bbox.length < 4) return;
      const [x1, y1, x2, y2] = det.bbox;

      const sx = x1 * scaleX;
      const sy = y1 * scaleY;
      const sw = (x2 - x1) * scaleX;
      const sh = (y2 - y1) * scaleY;

      const isHovered = hoveredDetIdx === idx;

      // Box styling
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.strokeStyle = isHovered
        ? '#ff3366'
        : det.is_weapon_candidate
        ? '#ffb703'
        : '#00e5ff';

      ctx.fillStyle = isHovered
        ? 'rgba(255, 51, 102, 0.2)'
        : 'rgba(0, 229, 255, 0.08)';

      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeRect(sx, sy, sw, sh);

      // Label badge tag on box
      const tagText = `${det.label.toUpperCase()} [${Math.round(det.confidence * 100)}%]`;
      ctx.font = 'bold 10px monospace';
      const textWidth = ctx.measureText(tagText).width;

      ctx.fillStyle = isHovered ? '#ff3366' : '#00e5ff';
      ctx.fillRect(sx, sy - 16 > 0 ? sy - 16 : sy, textWidth + 8, 16);

      ctx.fillStyle = '#06090e';
      ctx.fillText(tagText, sx + 4, sy - 16 > 0 ? sy - 4 : sy + 12);
    });
  }, [filteredDetections, hoveredDetIdx]);

  return (
    <div className="space-y-6">
      {/* Evidence Explorer Header */}
      <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Scan className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
              SURVEILLANCE & FRAME DETECTION ENGINE
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Evidence Spatial Explorer</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time RT-DETR bounding boxes, class labels, and temporal keyframe navigation.
          </p>
        </div>

        {/* Evidence Selector Dropdown */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-charcoal-850 border border-charcoal-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none"
          >
            {evidenceList.map((e) => (
              <option key={e.id} value={e.id} className="bg-charcoal-900 text-slate-200">
                [{e.media_type.toUpperCase()}] {e.original_name}
              </option>
            ))}
          </select>
          {currentEvidence && (
            <a
              href={api.getEvidenceDownloadUrl(currentEvidence.id)}
              download={currentEvidence.original_name}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Canvas & Detections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Viewport (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60 relative overflow-hidden bg-charcoal-950">
            {/* Viewport Meta overlay */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2 px-1">
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>RESOLVED VIEWPORT: 1280x720 (Normalized Space)</span>
              </span>
              <span>DETECTIONS: {filteredDetections.length} OBJECTS</span>
            </div>

            {/* Canvas Display with Scanline */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-charcoal-900 border border-charcoal-800 scanline-effect flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className="w-full h-full object-contain"
              />

              {/* Center watermarking */}
              <div className="absolute bottom-3 left-4 pointer-events-none font-mono text-[10px] text-slate-500 bg-charcoal-950/80 px-2 py-1 rounded border border-charcoal-800">
                CRIMEVISION FORENSICS | SHA-256 CHECKED | RT-DETR + CLIP
              </div>
            </div>

            {/* Video Playback / Frame Scrubber Control (for Video media) */}
            {currentEvidence?.media_type === 'video' && (
              <div className="mt-4 pt-3 border-t border-charcoal-800 flex items-center space-x-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-lg bg-charcoal-800 text-cyan-400 hover:bg-cyan-950 border border-charcoal-700"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>TIMECODE: {currentTime.toFixed(1)}s</span>
                    <span>DURATION: 18.0s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="18"
                    step="0.5"
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-charcoal-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detection Filters & Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-700/60">
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Detection Catalog
              </h2>
              <Badge label={`${filteredDetections.length} items`} size="sm" variant="cyan" />
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by class (e.g. person, car, phone)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {['all', 'person', 'vehicle', 'weapon'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    activeFilter === cat
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                      : 'bg-charcoal-850 text-slate-400 border border-charcoal-700 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Detections Interactive List */}
            {filteredDetections.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No detections matching the active query.
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredDetections.map((det, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDetIdx(idx)}
                    onMouseLeave={() => setHoveredDetIdx(null)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      hoveredDetIdx === idx
                        ? 'bg-charcoal-800 border-cyan-400 shadow-glow-cyan'
                        : 'bg-charcoal-850/70 border-charcoal-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white capitalize text-xs">
                          {det.label}
                        </span>
                        {det.track_id && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-charcoal-700 text-cyan-400">
                            {det.track_id}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {Math.round(det.confidence * 100)}%
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>BBOX: [{det.bbox?.join(', ')}]</span>
                      {det.timestamp !== undefined && <span>@{det.timestamp}s</span>}
                    </div>

                    {det.notes && (
                      <p className="mt-1 text-[11px] text-slate-300 italic">
                        Note: {det.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
