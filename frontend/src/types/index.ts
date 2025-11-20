export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'analyst' | 'viewer';
  phone?: string;
  department?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface NetworkTraffic {
  id: number;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  protocol: string;
  bytes_sent: number;
  bytes_received: number;
  packets_sent: number;
  packets_received: number;
  connection_state: string;
  duration: number;
  application?: string;
  country_code?: string;
  total_bytes?: number;
  total_packets?: number;
}

export interface SecurityAlert {
  id: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  alert_type: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'false_positive';
  source_ip: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: string;
  signature?: string;
  rule_id?: string;
  country_code?: string;
  timestamp: string;
  acknowledged_by?: number;
  acknowledged_at?: string;
  resolved_by?: number;
  resolved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  acknowledged_by_name?: string;
  resolved_by_name?: string;
}

export interface ThreatIntelligence {
  id: number;
  ioc_type: 'ip' | 'domain' | 'url' | 'hash' | 'email';
  ioc_value: string;
  threat_type: string;
  description: string;
  reputation_score: number;
  source: string;
  first_seen: string;
  last_seen: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  tags: string[];
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  metrics: {
    total_traffic_24h: number;
    active_connections: number;
    alerts_count: number;
    system_health: {
      status: string;
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
      network_uptime: number;
    };
  };
  traffic_timeline: Array<{ time: string; bytes: number }>;
  top_source_ips: Array<{ source_ip: string; count: number; total_bytes: number }>;
  alerts_by_severity: Array<{ severity: string; count: number }>;
  recent_alerts: Array<{
    id: number;
    title: string;
    severity: string;
    timestamp: string;
    source_ip: string;
  }>;
}

