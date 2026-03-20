import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import {
  MapClient,
  MapClosure,
  MapFibreRoute,
  MapLink,
  MapMSTBox,
  MapOLTOffice,
} from '../../types';

interface NetworkMapProps {
  oltOffices?: MapOLTOffice[];
  closures?: MapClosure[];
  mstBoxes: MapMSTBox[];
  clients: MapClient[];
  links?: MapLink[];
  fibreRoutes?: MapFibreRoute[];
  onOLTClick?: (olt: MapOLTOffice) => void;
  onClosureClick?: (closure: MapClosure) => void;
  onMSTClick?: (mst: MapMSTBox) => void;
  onClientClick?: (client: MapClient) => void;
  onLinkClick?: (link: MapLink) => void;
  selectedOLTId?: number | null;
  selectedClosureId?: number | null;
  selectedMSTId?: number | null;
  selectedClientId?: number | null;
  selectedLinkId?: number | null;
  highlightedLinkIds?: number[];
  highlightedNodeKeys?: string[];
  height?: string;
}

function FitBounds({
  oltOffices,
  closures,
  mstBoxes,
  clients,
  links,
}: {
  oltOffices: MapOLTOffice[];
  closures: MapClosure[];
  mstBoxes: MapMSTBox[];
  clients: MapClient[];
  links: MapLink[];
}) {
  const map = useMap();

  React.useEffect(() => {
    const points: LatLngExpression[] = [];

    oltOffices.forEach((o) => points.push([o.latitude, o.longitude]));
    closures.forEach((c) => points.push([c.latitude, c.longitude]));
    mstBoxes.forEach((m) => points.push([m.latitude, m.longitude]));
    clients.forEach((c) => points.push([c.latitude, c.longitude]));
    links.forEach((r) =>
      r.coordinates.forEach((p) => {
        points.push([p.lat, p.lng]);
      })
    );

    if (points.length > 1) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [map, oltOffices, closures, mstBoxes, clients, links]);

  return null;
}

const NetworkMap: React.FC<NetworkMapProps> = ({
  oltOffices = [],
  closures = [],
  mstBoxes,
  clients,
  links = [],
  fibreRoutes = [],
  onOLTClick,
  onClosureClick,
  onMSTClick,
  onClientClick,
  onLinkClick,
  selectedOLTId,
  selectedClosureId,
  selectedMSTId,
  selectedClientId,
  selectedLinkId,
  highlightedLinkIds = [],
  highlightedNodeKeys = [],
  height = '500px',
}) => {
  const normalizedLinks = useMemo<MapLink[]>(() => {
    if (links.length > 0) return links;
    return fibreRoutes.map((route) => ({
      id: route.id,
      link_id: route.route_id,
      name: route.name,
      source_type: 'mst',
      source_id: route.start_mst_id,
      destination_type: route.end_client_id ? 'client' : 'mst',
      destination_id: route.end_client_id || route.end_mst_id || route.start_mst_id,
      route_id: route.id,
      cable_type: route.end_client_id ? 'drop' : 'distribution',
      core_count: route.total_cores,
      active_core_number: null,
      active_core_color: null,
      buffer_group: null,
      core_status: 'used',
      color_hex: route.installation_type === 'aerial' ? '#38bdf8' : '#f97316',
      distance_meters: route.distance_meters,
      coordinates: route.coordinates,
      signal_dbm: null,
      splice_loss_db: 0,
      distance_loss_db: 0,
      total_loss_db: 0,
      is_active: true,
      health_status: 'healthy',
      type: 'link',
    }));
  }, [links, fibreRoutes]);

  const center = useMemo<LatLngExpression>(() => {
    if (oltOffices.length > 0) return [oltOffices[0].latitude, oltOffices[0].longitude];
    if (closures.length > 0) return [closures[0].latitude, closures[0].longitude];
    if (mstBoxes.length > 0) return [mstBoxes[0].latitude, mstBoxes[0].longitude];
    if (clients.length > 0) return [clients[0].latitude, clients[0].longitude];
    return [6.5244, 3.3792];
  }, [oltOffices, closures, mstBoxes, clients]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'available':
      case 'online':
      case 'healthy':
        return '#10b981';
      case 'pending':
      case 'nearly_full':
      case 'degraded':
      case 'high_loss':
        return '#f59e0b';
      case 'full':
      case 'suspended':
      case 'disconnected':
      case 'offline':
      case 'cut':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const isHighlightedNode = (nodeType: string, nodeId: number) =>
    highlightedNodeKeys.includes(`${nodeType}:${nodeId}`);

  return (
    <div className="rounded-lg overflow-hidden border border-dark-700" style={{ height }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds
          oltOffices={oltOffices}
          closures={closures}
          mstBoxes={mstBoxes}
          clients={clients}
          links={normalizedLinks}
        />

        {normalizedLinks.map((link) => {
          const activeHighlight = highlightedLinkIds.includes(link.id);
          const selected = selectedLinkId === link.id;
          return (
            <Polyline
              key={`link-${link.id}`}
              positions={link.coordinates.map((p) => [p.lat, p.lng] as LatLngExpression)}
              pathOptions={{
                color: activeHighlight ? '#facc15' : link.color_hex || statusColor(link.health_status),
                weight: selected || activeHighlight ? 7 : 4,
                opacity: link.is_active ? 0.9 : 0.4,
                dashArray: link.is_active ? undefined : '8 8',
              }}
              eventHandlers={{
                click: () => onLinkClick?.(link),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{link.name}</div>
                  <div>ID: {link.link_id}</div>
                  <div className="capitalize">
                    {link.cable_type} | {link.core_count}-core
                  </div>
                  <div>
                    Loss: {link.total_loss_db.toFixed(2)} dB | Signal: {link.signal_dbm ?? '-'} dBm
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {oltOffices.map((olt) => {
          const highlighted = isHighlightedNode('olt', olt.id);
          return (
            <CircleMarker
              key={`olt-${olt.id}`}
              center={[olt.latitude, olt.longitude]}
              radius={selectedOLTId === olt.id || highlighted ? 11 : 9}
              pathOptions={{
                color: '#ffffff',
                weight: selectedOLTId === olt.id || highlighted ? 3 : 2,
                fillColor: '#3b82f6',
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => onOLTClick?.(olt),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{olt.name}</div>
                  <div>{olt.olt_id}</div>
                  <div>{olt.location_name || 'Unknown location'}</div>
                  <div>PON Power: {olt.pon_power_dbm ?? '-'} dBm</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {closures.map((closure) => {
          const highlighted = isHighlightedNode('closure', closure.id);
          return (
            <CircleMarker
              key={`closure-${closure.id}`}
              center={[closure.latitude, closure.longitude]}
              radius={selectedClosureId === closure.id || highlighted ? 10 : 8}
              pathOptions={{
                color: '#ffffff',
                weight: selectedClosureId === closure.id || highlighted ? 3 : 2,
                fillColor: '#f97316',
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => onClosureClick?.(closure),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{closure.name}</div>
                  <div>{closure.closure_id}</div>
                  <div>
                    In/Out: {closure.incoming_cable_size}/{closure.outgoing_cable_size} core
                  </div>
                  <div>Signal: {closure.signal_dbm ?? '-'} dBm</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {mstBoxes.map((mst) => {
          const highlighted = isHighlightedNode('mst', mst.id);
          return (
            <CircleMarker
              key={`mst-${mst.id}`}
              center={[mst.latitude, mst.longitude]}
              radius={selectedMSTId === mst.id || highlighted ? 12 : 9}
              pathOptions={{
                color: '#ffffff',
                weight: selectedMSTId === mst.id || highlighted ? 3 : 2,
                fillColor: statusColor(mst.capacity_status),
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => onMSTClick?.(mst),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{mst.name}</div>
                  <div>{mst.mst_id}</div>
                  <div>{mst.location_name || 'Unknown location'}</div>
                  <div>
                    Ports: {mst.used_ports}/{mst.total_ports}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {clients.map((client) => {
          const highlighted = isHighlightedNode('client', client.id);
          return (
            <CircleMarker
              key={`client-${client.id}`}
              center={[client.latitude, client.longitude]}
              radius={selectedClientId === client.id || highlighted ? 9 : 7}
              pathOptions={{
                color: '#ffffff',
                weight: selectedClientId === client.id || highlighted ? 3 : 1,
                fillColor: statusColor(client.status),
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => onClientClick?.(client),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{client.name}</div>
                  <div>{client.client_id}</div>
                  <div>{client.service_type}</div>
                  <div className="capitalize">{client.status}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default React.memo(NetworkMap);
