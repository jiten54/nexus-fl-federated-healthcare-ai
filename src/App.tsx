import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { io, Socket } from 'socket.io-client';
import { 
  Activity, 
  Shield, 
  Cpu, 
  Globe, 
  AlertTriangle, 
  Terminal, 
  Send,
  Zap,
  Layers,
  Database,
  BarChart3,
  GitBranch,
  Settings,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import Markdown from 'react-markdown';
import { NetworkGlobe } from './components/NetworkGlobe';
import { FederatedState, NodeUpdate, MLOpsStatus } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [state, setState] = useState<FederatedState | null>(null);
  const [mlops, setMlops] = useState<MLOpsStatus | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'network' | 'mlops' | 'nodes'>('network');
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    socketRef.current = io();
    
    socketRef.current.on('federated_update', (data: FederatedState) => {
      setState(data);
      setIsTraining(true);
      setHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          accuracy: parseFloat(data.globalAccuracy),
          loss: data.nodes.reduce((acc, n) => acc + parseFloat(n.loss), 0) / data.nodes.length
        };
        // Only add if accuracy or loss changed significantly to avoid spam
        return [...prev.slice(-29), newEntry];
      });
    });

    socketRef.current.on('mlops_log', (log: string) => {
      setMlops(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          logs: [log, ...prev.logs].slice(0, 100)
        };
      });
    });

    socketRef.current.on('training_stopped', () => {
      setIsTraining(false);
    });

    const fetchInitial = async () => {
      try {
        const res = await fetch('/api/mlops/status');
        const data = await res.json();
        setMlops(data);
        if (data.pipelines[0].status === 'running') setIsTraining(true);
      } catch (err) {
        console.error("Failed to fetch initial MLOps status");
      }
    };
    
    fetchInitial();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const toggleTraining = async () => {
    const endpoint = isTraining ? '/api/train/stop' : '/api/train/start';
    const res = await fetch(endpoint, { method: 'POST' });
    if (res.ok) {
      setIsTraining(!isTraining);
      // Refresh MLOps status
      const mlRes = await fetch('/api/mlops/status');
      setMlops(await mlRes.json());
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAnalyzing) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: Failed to connect to Intelligence Network." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tighter uppercase italic">Nexus-FL</h1>
                <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Federated Healthcare Intelligence</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'network', label: 'Network', icon: Globe },
                { id: 'mlops', label: 'MLOps', icon: GitBranch },
                { id: 'nodes', label: 'Hospitals', icon: Cpu },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                    activeTab === tab.id 
                      ? "bg-white/10 text-white" 
                      : "text-white/40 hover:text-white hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTraining}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                isTraining 
                  ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" 
                  : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
              )}
            >
              {isTraining ? <AlertTriangle className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {isTraining ? "Stop Training" : "Start FL Round"}
            </button>
            {state?.drift_detected && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Model Drift Detected</span>
              </div>
            )}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full border transition-all",
              isTraining ? "bg-indigo-500/10 border-indigo-500/20" : "bg-emerald-500/10 border-emerald-500/20"
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isTraining ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"
              )} />
              <span className={cn(
                "text-[10px] font-mono uppercase tracking-wider",
                isTraining ? "text-indigo-400" : "text-emerald-400"
              )}>
                {isTraining ? "FL Engine Active" : "Network Online"}
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider">Privacy-First: No Patient Data Shared</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase font-mono">System Time</p>
              <p className="text-xs font-mono">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-6 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Column: Visualization & Metrics */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
          
          {activeTab === 'network' && (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
              {/* 3D Network View */}
              <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-6 left-6 z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold uppercase tracking-widest italic">Global Node Topology</h2>
                  </div>
                  <p className="text-xs text-white/40 font-mono">Real-time distributed training visualization</p>
                </div>

                <Canvas>
                  <PerspectiveCamera makeDefault position={[0, 0, 6]} />
                  <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                  <NetworkGlobe state={state} />
                  <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
                </Canvas>

                {/* Overlay Stats */}
                <div className="absolute bottom-6 left-6 right-6 grid grid-cols-4 gap-4">
                  {[
                    { label: 'Active Hospitals', value: state?.nodes.filter(n => n.status !== 'removed').length || 0, icon: Cpu, color: 'text-indigo-400' },
                    { label: 'Current Round', value: state?.round || 0, icon: Layers, color: 'text-amber-400' },
                    { label: 'Diagnosis Accuracy', value: `${((parseFloat(state?.globalAccuracy || '0')) * 100).toFixed(2)}%`, icon: Activity, color: 'text-emerald-400' },
                    { label: 'Privacy Budget (ε)', value: mlops?.privacy_budget.toFixed(2) || '0.00', icon: Shield, color: 'text-indigo-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <stat.icon className={cn("w-3 h-3", stat.color)} />
                        <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">{stat.label}</span>
                      </div>
                      <div className="text-xl font-bold tracking-tight">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Charts */}
              <div className="h-64 grid grid-cols-2 gap-6">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Diagnosis Accuracy</h3>
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0.5, 1]} hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', fontSize: '10px' }}
                        />
                        <Area type="monotone" dataKey="accuracy" stroke="#10b981" fillOpacity={1} fill="url(#colorAcc)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Global Diagnosis Loss</h3>
                    <Database className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', fontSize: '10px' }}
                        />
                        <Line type="monotone" dataKey="loss" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mlops' && (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
              <div className="grid grid-cols-2 gap-6 flex-1">
                {/* MLflow Experiments */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold uppercase tracking-widest">Diagnosis Model Registry</h3>
                    </div>
                    <button className="text-[10px] text-white/40 hover:text-white uppercase font-mono flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Sync
                    </button>
                  </div>
                  <div className="space-y-4 overflow-y-auto pr-2">
                    {mlops?.experiments.map((exp) => (
                      <div key={exp.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-mono text-xs text-indigo-300">{exp.id}</div>
                          <div className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            exp.status === 'finished' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          )}>{exp.status}</div>
                        </div>
                        <div className="text-sm font-bold mb-3">{exp.name}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${exp.accuracy * 100}%` }} />
                          </div>
                          <div className="text-xs font-mono text-white/60">{(exp.accuracy * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Airflow Pipelines */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold uppercase tracking-widest">Healthcare Pipeline Orchestration</h3>
                    </div>
                  </div>
                  <div className="space-y-4 overflow-y-auto pr-2">
                    {mlops?.pipelines.map((dag) => (
                      <div key={dag.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            dag.status === 'success' ? "bg-emerald-500" : "bg-indigo-500 animate-pulse"
                          )} />
                          <div>
                            <div className="text-sm font-bold">{dag.name}</div>
                            <div className="text-[10px] text-white/40 font-mono">Last run: {new Date(dag.last_run).toLocaleTimeString()}</div>
                          </div>
                        </div>
                        <Settings className="w-4 h-4 text-white/20 hover:text-white cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Privacy & Security */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold uppercase tracking-widest">Privacy & Security</h3>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-white/60 uppercase font-mono">Differential Privacy</span>
                        <span className="text-xs font-bold text-emerald-400 uppercase">Active</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase font-mono">Privacy Budget (ε)</span>
                        <span className="text-sm font-bold text-indigo-400 font-mono">{mlops?.privacy_budget.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min((mlops?.privacy_budget || 0) * 10, 100)}%` }} />
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/60 uppercase font-mono">Secure Aggregation</span>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", mlops?.secure_aggregation ? "bg-emerald-500" : "bg-red-500")} />
                          <span className="text-xs font-bold uppercase">{mlops?.secure_aggregation ? "Enabled" : "Disabled"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold uppercase tracking-widest">Anomaly Intelligence</h3>
                    </div>
                  </div>
                  <div className="space-y-4 overflow-y-auto pr-2">
                    {state?.nodes.filter(n => n.anomalies > 0 || n.status === 'removed').map((node) => (
                      <div key={node.id} className={cn(
                        "p-4 rounded-xl border",
                        node.status === 'removed' ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
                      )}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold font-mono">{node.id}</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            node.status === 'removed' ? "text-red-400" : "text-amber-400"
                          )}>{node.status === 'removed' ? "Quarantined" : "Warning"}</span>
                        </div>
                        <p className="text-[10px] text-white/60">
                          {node.status === 'removed' 
                            ? "Node removed from global aggregation due to critical data drift." 
                            : `Detected ${node.anomalies} anomalous gradients in current round.`}
                        </p>
                      </div>
                    ))}
                    {state?.nodes.every(n => n.anomalies === 0 && n.status !== 'removed') && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 grayscale opacity-40">
                        <Shield className="w-8 h-8 mb-2" />
                        <p className="text-[10px] uppercase tracking-widest">No Anomalies Detected</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hospital Contribution Heatmap */}
              <div className="h-64 bg-black/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Hospital Contribution Heatmap</h3>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-900 rounded-sm" /><span className="text-[8px] text-white/40 uppercase">Low</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-500 rounded-sm" /><span className="text-[8px] text-white/40 uppercase">High</span></div>
                  </div>
                </div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={state?.nodes || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="id" hide />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', fontSize: '10px' }}
                      />
                      <Bar dataKey="contribution">
                        {state?.nodes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={parseFloat(entry.contribution) > 7 ? '#6366f1' : '#312e81'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest">Global Hospital Registry</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                  <input type="text" placeholder="Search hospitals..." className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-4 text-[10px] focus:outline-none focus:border-indigo-500/50" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                      <th className="pb-4 font-mono">Hospital ID</th>
                      <th className="pb-4 font-mono">Location</th>
                      <th className="pb-4 font-mono">Specialty</th>
                      <th className="pb-4 font-mono">Status</th>
                      <th className="pb-4 font-mono">Latency</th>
                      <th className="pb-4 font-mono">Diagnosis Loss</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {state?.nodes.map((node) => (
                      <tr key={node.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4 font-bold text-indigo-400">{node.id}</td>
                        <td className="py-4 text-white/60">{node.location}</td>
                        <td className="py-4 text-white/60">{node.type}</td>
                        <td className="py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            node.status === 'training' ? "bg-emerald-500/20 text-emerald-400" : 
                            node.status === 'removed' ? "bg-red-500/20 text-red-400" :
                            "bg-white/10 text-white/40"
                          )}>{node.status}</span>
                        </td>
                        <td className="py-4 font-mono text-white/40">{node.latency}</td>
                        <td className="py-4 font-mono">{node.loss}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Intelligence & Logs */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          
          {/* AI Analyst Chat */}
          <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-indigo-500/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest">NEXUS Intelligence</h3>
                <p className="text-[10px] text-indigo-400 font-mono">RAG-Enhanced Model Analysis</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <Terminal className="w-12 h-12 text-white/10 mb-4" />
                  <p className="text-sm text-white/40">Ask NEXUS to explain pneumonia detection performance, detect data drift, or analyze hospital contributions.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm",
                  msg.role === 'user' 
                    ? "bg-indigo-600 ml-auto rounded-tr-none" 
                    : "bg-white/5 border border-white/10 rounded-tl-none"
                )}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>
                      {msg.content}
                    </Markdown>
                  </div>
                </div>
              ))}
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono animate-pulse">
                  <Activity className="w-3 h-3" />
                  Analyzing healthcare network state...
                </div>
              )}
            </div>

            <form onSubmit={handleAnalyze} className="p-4 border-t border-white/5 bg-black/20">
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Analyze diagnosis accuracy or hospital data quality..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={isAnalyzing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Hospital Activity Log */}
          <div className="h-64 bg-black/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Hospital Training Status</h3>
              <Terminal className="w-3 h-3 text-white/40" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2">
              {(mlops as any)?.logs?.slice(-20).reverse().map((log: string, i: number) => (
                <div key={i} className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-0">
                  <div className="flex-1 text-white/60 leading-relaxed">
                    {log}
                  </div>
                </div>
              ))}
              {(!mlops || (mlops as any).logs.length === 0) && state?.nodes.map((node, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-0">
                  <span className="text-white/20">[{new Date().toLocaleTimeString()}]</span>
                  <div className="flex-1">
                    <span className="text-indigo-400">{node.id}</span>
                    <span className="text-white/40 mx-2">→</span>
                    <span className={cn(
                      node.status === 'training' ? "text-emerald-400" : "text-white/60"
                    )}>{node.status.toUpperCase()}</span>
                    <div className="mt-1 flex gap-4 text-white/30">
                      <span>CONTRIB: {node.contribution}</span>
                      <span>LOSS: {node.loss}</span>
                      <span className={node.anomalies > 0 ? "text-red-400" : ""}>ANOMALIES: {node.anomalies}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Background Glow */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] -z-10 rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] -z-10 rounded-full" />
    </div>
  );
}
