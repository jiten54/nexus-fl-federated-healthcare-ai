export interface NodeUpdate {
  id: string;
  location: string;
  type: string;
  status: string;
  contribution: string;
  loss: string;
  anomalies: number;
  latency: string;
  coords: [number, number];
}

export interface FederatedState {
  round: number;
  globalAccuracy: string;
  nodes: NodeUpdate[];
  timestamp: string;
  drift_detected: boolean;
}

export interface MLOpsStatus {
  experiments: { id: string; name: string; status: string; accuracy: number }[];
  pipelines: { id: string; name: string; status: string; last_run: string }[];
  drift_detected: boolean;
  privacy_budget: number;
  secure_aggregation: boolean;
  logs: string[];
}
