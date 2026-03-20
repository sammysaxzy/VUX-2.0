export type UserRole = 'super_admin' | 'isp_admin' | 'field_engineer' | 'noc_viewer';
export type ClientStatus = 'active' | 'suspended' | 'pending' | 'disconnected';
export type FibreCoreStatus = 'free' | 'used' | 'faulty' | 'reserved';
export type SplitterType = '1/2' | '1/4' | '1/8' | '1/16' | '1/32' | '1/64';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface Client {
  id: number;
  client_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status: ClientStatus;
  latitude: number;
  longitude: number;
  pppoe_username?: string | null;
  pppoe_password?: string | null;
  vlan_id?: number | null;
  service_id?: string | null;
  assigned_plan?: string | null;
  speed_download?: number | null;
  speed_upload?: number | null;
  olt_name?: string | null;
  pon_port?: string | null;
  onu_serial?: string | null;
  onu_mac?: string | null;
  rx_power?: number | null;
  tx_power?: number | null;
  last_seen?: string | null;
  uptime_seconds?: number | null;
  is_online?: boolean | null;
  mst_id?: number | null;
  splitter_port?: number | null;
  fibre_core_id?: number | null;
  drop_cable_length?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface MSTBox {
  id: number;
  mst_id: string;
  name: string;
  location_name?: string | null;
  latitude: number;
  longitude: number;
  splitter_type: SplitterType;
  total_ports: number;
  used_ports: number;
  port_details?: Record<string, unknown>[] | null;
  capacity_status: 'available' | 'nearly_full' | 'full';
  created_at?: string;
  updated_at?: string;
}

export interface FibreRoute {
  id: number;
  route_id: string;
  name: string;
  start_mst_id: number;
  fibre_type: number;
  installation_type: 'aerial' | 'underground' | string;
  end_mst_id?: number | null;
  end_client_id?: number | null;
  total_cores: number;
  distance_meters?: number | string | null;
  created_at?: string;
}

export interface FibreCore {
  id: number;
  route_id: number;
  core_number: number;
  color: string;
  status: FibreCoreStatus;
  client_id?: number | null;
  reserved_for?: string | null;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action_type: string;
  action_description: string;
  client_id?: number | null;
  mst_id?: number | null;
  fibre_route_id?: number | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

export interface MapData {
  olt_offices?: MapOLTOffice[];
  closures?: MapClosure[];
  mst_boxes: MapMSTBox[];
  links?: MapLink[];
  fibre_routes: MapFibreRoute[];
  clients: MapClient[];
  alerts?: MapAlert[];
  summary?: {
    total_olts: number;
    total_closures: number;
    total_msts: number;
    total_clients: number;
    total_links: number;
    active_links: number;
    faulty_links: number;
    open_alerts: number;
  };
}

export interface MapMSTBox {
  id: number;
  mst_id: string;
  name: string;
  location_name?: string | null;
  latitude: number;
  longitude: number;
  capacity_status: 'available' | 'nearly_full' | 'full';
  total_ports: number;
  used_ports: number;
  splitter_type: string;
  connected_customers?: number;
  signal_dbm?: number | null;
  port_details?: Record<string, unknown>[];
  type: 'mst';
}

export interface MapOLTOffice {
  id: number;
  olt_id: string;
  name: string;
  location_name?: string | null;
  latitude: number;
  longitude: number;
  pon_power_dbm?: number | null;
  status: string;
  notes?: string | null;
  type: 'olt';
}

export interface MapClosureSpliceRow {
  incoming_buffer: string;
  incoming_core_color: string;
  outgoing_buffer: string;
  outgoing_core_color: string;
  splice_loss_db: number;
}

export interface MapClosure {
  id: number;
  closure_id: string;
  name: string;
  location_name?: string | null;
  latitude: number;
  longitude: number;
  incoming_cable_size: number;
  outgoing_cable_size: number;
  incoming_source_type?: string | null;
  incoming_source_id?: number | null;
  outgoing_destination_type?: string | null;
  outgoing_destination_id?: number | null;
  splice_matrix: MapClosureSpliceRow[];
  signal_dbm?: number | null;
  notes?: string | null;
  type: 'closure';
}

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapFibreRoute {
  id: number;
  route_id: string;
  name: string;
  fibre_type: number;
  total_cores: number;
  installation_type: string;
  distance_meters: number;
  start_mst_id: number;
  end_mst_id?: number | null;
  end_client_id?: number | null;
  coordinates: MapCoordinate[];
  type: 'route';
}

export interface MapLink {
  id: number;
  link_id: string;
  name: string;
  source_type: 'olt' | 'closure' | 'mst' | 'client';
  source_id: number;
  destination_type: 'olt' | 'closure' | 'mst' | 'client';
  destination_id: number;
  route_id?: number | null;
  cable_type: 'feeder' | 'distribution' | 'drop';
  core_count: number;
  buffer_group?: string | null;
  active_core_number?: number | null;
  active_core_color?: string | null;
  core_status: FibreCoreStatus;
  color_hex: string;
  distance_meters: number;
  coordinates: MapCoordinate[];
  signal_dbm?: number | null;
  splice_loss_db: number;
  distance_loss_db: number;
  total_loss_db: number;
  is_active: boolean;
  health_status: 'healthy' | 'high_loss' | 'cut';
  type: 'link';
}

export interface MapAlert {
  id: number;
  alert_code: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  node_type?: 'olt' | 'closure' | 'mst' | 'client' | null;
  node_id?: number | null;
  link_id?: number | null;
  client_id?: number | null;
  is_resolved: boolean;
  created_at?: string | null;
}

export interface MapClient {
  id: number;
  client_id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: ClientStatus;
  service_type: string;
  mst_id?: number | null;
  type: 'client';
}

export interface DashboardStats {
  total_clients: number;
  active_clients: number;
  suspended_clients: number;
  pending_clients: number;
  total_mst_boxes: number;
  total_fibre_km: number;
  total_fibre_length_km: number;
  revenue_total?: number;
  offline_devices?: number;
  open_tickets?: number;
  average_utilization: number;
  active_users: number;
  recent_activities: ActivityLog[];
  client_status_distribution: Record<string, number>;
}

export interface TracePath {
  target_type: 'olt' | 'closure' | 'mst' | 'client';
  target_id: number;
  found: boolean;
  nodes: {
    node_type: 'olt' | 'closure' | 'mst' | 'client';
    node_id: number;
    coordinates?: { lat: number; lng: number } | null;
  }[];
  links: MapLink[];
  total_loss_db: number;
  fault_detected: boolean;
  fault_at?: Record<string, unknown> | null;
}

export interface FaultDetection {
  customer_id: number;
  trace: TracePath;
  break_detected: boolean;
  probable_fault?: Record<string, unknown> | null;
}

export interface NetworkDevice {
  id: number;
  device_id: string;
  name: string;
  device_type: string;
  vendor?: string | null;
  ip_address: string;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: 'online' | 'offline' | 'degraded';
  uplink_mbps: number;
  downlink_mbps: number;
  cpu_percent: number;
  memory_percent: number;
  last_seen?: string | null;
  notes?: string | null;
}

export interface BillingPayment {
  id: number;
  payment_id: string;
  client_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue';
  payment_method: string;
  due_date?: string | null;
  paid_at?: string | null;
  invoice_reference?: string | null;
  notes?: string | null;
}

export interface Ticket {
  id: number;
  ticket_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved';
  client_id?: number | null;
  assigned_to_user_id?: number | null;
  resolution_notes?: string | null;
  opened_at: string;
  resolved_at?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Alert {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface WSMessage {
  type: string;
  data: unknown;
}

export interface ClientFormData {
  client_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  latitude: number;
  longitude: number;
  pppoe_username?: string;
  pppoe_password?: string;
  vlan_id?: number;
  service_id?: string;
  assigned_plan?: string;
  speed_download?: number;
  speed_upload?: number;
  olt_name?: string;
  pon_port?: string;
  onu_serial?: string;
  mst_id?: number;
  splitter_port?: number;
  drop_cable_length?: number;
}

export interface MSTFormData {
  mst_id: string;
  name: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  splitter_type: SplitterType;
}

export interface FibreRouteFormData {
  route_id: string;
  name: string;
  start_mst_id: number;
  end_mst_id?: number;
  end_client_id?: number;
  fibre_type: number;
  installation_type: 'aerial' | 'underground';
}
