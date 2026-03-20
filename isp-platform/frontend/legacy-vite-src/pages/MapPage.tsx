import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Layers, RefreshCw, Route } from 'lucide-react';
import toast from 'react-hot-toast';
import NetworkMap from '../components/map/NetworkMap';
import { api } from '../services/api';
import {
  FaultDetection,
  MapClient,
  MapClosure,
  MapData,
  MapLink,
  MapMSTBox,
  MapOLTOffice,
  TracePath,
} from '../types';

type SelectionState = {
  oltId: number | null;
  closureId: number | null;
  mstId: number | null;
  clientId: number | null;
  linkId: number | null;
};

const emptySelection: SelectionState = {
  oltId: null,
  closureId: null,
  mstId: null,
  clientId: null,
  linkId: null,
};

const MapPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>(emptySelection);
  const [trace, setTrace] = useState<TracePath | null>(null);
  const [fault, setFault] = useState<FaultDetection | null>(null);
  const [loss, setLoss] = useState<{
    total_loss_db: number;
    splice_loss_db: number;
    distance_loss_db: number;
    signal_estimate_dbm: number | null;
  } | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [showOLTs, setShowOLTs] = useState(true);
  const [showClosures, setShowClosures] = useState(true);
  const [showMSTs, setShowMSTs] = useState(true);
  const [showClients, setShowClients] = useState(true);
  const [showLinks, setShowLinks] = useState(true);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    const state = (location.state || {}) as {
      clientId?: number;
      mstId?: number;
      closureId?: number;
      oltId?: number;
      linkId?: number;
    };

    if (state.clientId) {
      setSelection({ ...emptySelection, clientId: state.clientId });
      traceCustomer(state.clientId);
      return;
    }
    if (state.mstId) {
      setSelection({ ...emptySelection, mstId: state.mstId });
      return;
    }
    if (state.closureId) {
      setSelection({ ...emptySelection, closureId: state.closureId });
      return;
    }
    if (state.oltId) {
      setSelection({ ...emptySelection, oltId: state.oltId });
      return;
    }
    if (state.linkId) {
      setSelection({ ...emptySelection, linkId: state.linkId });
      return;
    }
  }, [location.state]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMapData();
      setMapData(data);
    } catch (err) {
      setError('Failed to load map data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOLTs = showOLTs ? mapData?.olt_offices || [] : [];
  const filteredClosures = showClosures ? mapData?.closures || [] : [];
  const filteredMSTs = showMSTs ? mapData?.mst_boxes || [] : [];
  const filteredClients = showClients ? mapData?.clients || [] : [];
  const filteredLinks = showLinks ? mapData?.links || [] : [];

  const selectedOLT = useMemo(
    () => mapData?.olt_offices?.find((o) => o.id === selection.oltId) || null,
    [mapData?.olt_offices, selection.oltId]
  );
  const selectedClosure = useMemo(
    () => mapData?.closures?.find((c) => c.id === selection.closureId) || null,
    [mapData?.closures, selection.closureId]
  );
  const selectedMST = useMemo(
    () => mapData?.mst_boxes?.find((m) => m.id === selection.mstId) || null,
    [mapData?.mst_boxes, selection.mstId]
  );
  const selectedClient = useMemo(
    () => mapData?.clients?.find((c) => c.id === selection.clientId) || null,
    [mapData?.clients, selection.clientId]
  );
  const selectedLink = useMemo(
    () => mapData?.links?.find((l) => l.id === selection.linkId) || null,
    [mapData?.links, selection.linkId]
  );

  const highlightedLinkIds = trace?.links?.map((link) => link.id) || [];
  const highlightedNodeKeys = trace?.nodes?.map((node) => `${node.node_type}:${node.node_id}`) || [];

  const clearDerivedPanels = () => {
    setTrace(null);
    setFault(null);
    setLoss(null);
  };

  const traceCustomer = async (customerId: number) => {
    try {
      setTraceLoading(true);
      clearDerivedPanels();
      const [traceRes, faultRes, lossRes] = await Promise.all([
        api.traceCustomerPath(customerId),
        api.detectCustomerFault(customerId),
        api.getCustomerLoss(customerId),
      ]);
      setTrace(traceRes);
      setFault(faultRes);
      setLoss(lossRes);
    } catch (err) {
      toast.error('Failed to trace customer path');
      console.error(err);
    } finally {
      setTraceLoading(false);
    }
  };

  const traceMST = async (mstId: number) => {
    try {
      setTraceLoading(true);
      clearDerivedPanels();
      const traceRes = await api.traceMSTPath(mstId);
      setTrace(traceRes);
    } catch (err) {
      toast.error('Failed to trace MST path');
      console.error(err);
    } finally {
      setTraceLoading(false);
    }
  };

  const traceLink = async (linkId: number) => {
    try {
      setTraceLoading(true);
      clearDerivedPanels();
      const traceRes = await api.traceLinkPath(linkId);
      setTrace(traceRes);
    } catch (err) {
      toast.error('Failed to trace link path');
      console.error(err);
    } finally {
      setTraceLoading(false);
    }
  };

  const disableMSTPort = async () => {
    if (!selectedMST) return;
    const port = window.prompt(`Enter port number to disable (1-${selectedMST.total_ports})`);
    if (!port) return;
    const portNumber = Number(port);
    if (Number.isNaN(portNumber)) {
      toast.error('Invalid port number');
      return;
    }
    const reason = window.prompt('Reason (optional)') || undefined;

    try {
      await api.disableMSTPort(selectedMST.id, portNumber, reason);
      toast.success(`Port ${portNumber} disabled`);
      await loadMapData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to disable port');
    }
  };

  const connectClientToMST = async () => {
    if (!selectedMST) return;
    const clientIdRaw = window.prompt('Enter client numeric ID to connect');
    const portRaw = window.prompt(`Enter splitter port (1-${selectedMST.total_ports})`);
    if (!clientIdRaw || !portRaw) return;

    const clientId = Number(clientIdRaw);
    const splitterPort = Number(portRaw);
    if (Number.isNaN(clientId) || Number.isNaN(splitterPort)) {
      toast.error('Client ID and port must be numbers');
      return;
    }

    try {
      await api.connectClientToMSTFromMap(selectedMST.id, clientId, splitterPort);
      toast.success('Client connected to MST');
      await loadMapData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to connect client');
    }
  };

  const editClosureSpliceMatrix = async () => {
    if (!selectedClosure) return;
    const existing = JSON.stringify(selectedClosure.splice_matrix || [], null, 2);
    const raw = window.prompt('Edit splice matrix JSON', existing);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        toast.error('Splice matrix must be a JSON array');
        return;
      }
      await api.updateClosure(selectedClosure.id, { splice_matrix: parsed });
      toast.success('Closure splice matrix updated');
      await loadMapData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update closure splice matrix');
    }
  };

  const traceFromClosure = async () => {
    if (!selectedClosure) return;
    const candidate = (mapData?.links || []).find(
      (link) =>
        (link.source_type === 'closure' && link.source_id === selectedClosure.id) ||
        (link.destination_type === 'closure' && link.destination_id === selectedClosure.id)
    );
    if (!candidate) {
      toast.error('No connected link found for this closure');
      return;
    }
    setSelection({ ...emptySelection, linkId: candidate.id });
    await traceLink(candidate.id);
  };

  const viewClosureConnectedMSTs = () => {
    if (!selectedClosure) return;
    const mstLinks = (mapData?.links || []).filter(
      (link) =>
        (link.source_type === 'closure' &&
          link.source_id === selectedClosure.id &&
          link.destination_type === 'mst') ||
        (link.destination_type === 'closure' &&
          link.destination_id === selectedClosure.id &&
          link.source_type === 'mst')
    );

    if (mstLinks.length === 0) {
      toast.error('No MST connected to this closure');
      return;
    }
    const ids = mstLinks.map((link) => (link.destination_type === 'mst' ? link.destination_id : link.source_id));
    toast.success(`Connected MST IDs: ${ids.join(', ')}`);
  };

  const seedEnhancedData = async () => {
    try {
      await api.seedEnhancedMVP();
      toast.success('Enhanced MVP demo data seeded');
      await loadMapData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to seed enhanced data');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Advanced Fiber Map</h1>
            <p className="text-dark-400">Topology, splice matrix, trace, and fault detection</p>
          </div>
        </div>
        <div className="h-[640px] bg-dark-800 rounded-xl border border-dark-700 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-dark-400">Loading map data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-10 h-10 mx-auto text-warning-500 mb-3" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadMapData}
          className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Fiber Map</h1>
          <p className="text-dark-400">OLT → Closure → MST → Customer with live tracing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={seedEnhancedData}
            className="px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-dark-200"
          >
            Seed MVP Data
          </button>
          <button
            onClick={loadMapData}
            className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-dark-300" />
          </button>
        </div>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Layers className="w-5 h-5 text-dark-400" />
              <span className="text-white font-medium">Layers</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showOLTs} onChange={(e) => setShowOLTs(e.target.checked)} />
                <span className="text-dark-300">OLTs ({mapData?.olt_offices?.length || 0})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showClosures}
                  onChange={(e) => setShowClosures(e.target.checked)}
                />
                <span className="text-dark-300">Closures ({mapData?.closures?.length || 0})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showMSTs} onChange={(e) => setShowMSTs(e.target.checked)} />
                <span className="text-dark-300">MSTs ({mapData?.mst_boxes.length || 0})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showClients} onChange={(e) => setShowClients(e.target.checked)} />
                <span className="text-dark-300">Clients ({mapData?.clients.length || 0})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} />
                <span className="text-dark-300">Fiber Links ({mapData?.links?.length || 0})</span>
              </label>
            </div>
          </div>
        </div>

        <NetworkMap
          oltOffices={filteredOLTs}
          closures={filteredClosures}
          mstBoxes={filteredMSTs}
          clients={filteredClients}
          links={filteredLinks}
          onOLTClick={(olt) => {
            setSelection({ ...emptySelection, oltId: olt.id });
            clearDerivedPanels();
          }}
          onClosureClick={(closure) => {
            setSelection({ ...emptySelection, closureId: closure.id });
            clearDerivedPanels();
          }}
          onMSTClick={(mst) => {
            setSelection({ ...emptySelection, mstId: mst.id });
            clearDerivedPanels();
          }}
          onClientClick={(client) => {
            setSelection({ ...emptySelection, clientId: client.id });
            traceCustomer(client.id);
          }}
          onLinkClick={(link) => {
            setSelection({ ...emptySelection, linkId: link.id });
            traceLink(link.id);
          }}
          selectedOLTId={selection.oltId}
          selectedClosureId={selection.closureId}
          selectedMSTId={selection.mstId}
          selectedClientId={selection.clientId}
          selectedLinkId={selection.linkId}
          highlightedLinkIds={highlightedLinkIds}
          highlightedNodeKeys={highlightedNodeKeys}
          height="640px"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Topology Nodes</p>
          <p className="text-xl font-semibold text-white mt-1">
            {(mapData?.summary?.total_olts || 0) +
              (mapData?.summary?.total_closures || 0) +
              (mapData?.summary?.total_msts || 0) +
              (mapData?.summary?.total_clients || 0)}
          </p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Active Links</p>
          <p className="text-xl font-semibold text-success-500 mt-1">{mapData?.summary?.active_links || 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Faulty Links</p>
          <p className="text-xl font-semibold text-danger-500 mt-1">{mapData?.summary?.faulty_links || 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Open Alerts</p>
          <p className="text-xl font-semibold text-warning-500 mt-1">{mapData?.summary?.open_alerts || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedOLT && (
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 space-y-3">
            <h3 className="text-lg font-semibold text-white">OLT Details</h3>
            <div className="flex justify-between">
              <span className="text-dark-400">OLT ID:</span>
              <span className="text-white">{selectedOLT.olt_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Location:</span>
              <span className="text-white">{selectedOLT.location_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">PON Power:</span>
              <span className="text-white">{selectedOLT.pon_power_dbm ?? '-'} dBm</span>
            </div>
            <button
              onClick={() => navigate('/network')}
              className="mt-2 px-3 py-2 rounded bg-dark-700 hover:bg-dark-600 text-dark-100 text-sm"
            >
              View Network Device Page
            </button>
          </div>
        )}

        {selectedClosure && (
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Closure Splice Matrix</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-dark-400">Closure ID</div>
              <div className="text-white">{selectedClosure.closure_id}</div>
              <div className="text-dark-400">Incoming Cable</div>
              <div className="text-white">{selectedClosure.incoming_cable_size} core</div>
              <div className="text-dark-400">Outgoing Cable</div>
              <div className="text-white">{selectedClosure.outgoing_cable_size} core</div>
              <div className="text-dark-400">Signal</div>
              <div className="text-white">{selectedClosure.signal_dbm ?? '-'} dBm</div>
            </div>
            <div className="max-h-52 overflow-auto rounded border border-dark-700">
              <table className="w-full text-xs">
                <thead className="bg-dark-900 text-dark-300">
                  <tr>
                    <th className="px-2 py-2 text-left">Incoming</th>
                    <th className="px-2 py-2 text-left">Outgoing</th>
                    <th className="px-2 py-2 text-left">Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedClosure.splice_matrix || []).map((row, idx) => (
                    <tr key={idx} className="border-t border-dark-700 text-dark-100">
                      <td className="px-2 py-2">
                        {row.incoming_buffer} - {row.incoming_core_color}
                      </td>
                      <td className="px-2 py-2">
                        {row.outgoing_buffer} - {row.outgoing_core_color}
                      </td>
                      <td className="px-2 py-2">{row.splice_loss_db} dB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
              <button
                onClick={editClosureSpliceMatrix}
                className="px-3 py-2 rounded bg-primary-600 hover:bg-primary-500 text-white text-sm"
              >
                Edit Splice
              </button>
              <button
                onClick={traceFromClosure}
                className="px-3 py-2 rounded bg-dark-700 hover:bg-dark-600 text-dark-100 text-sm"
              >
                Trace Fiber
              </button>
              <button
                onClick={viewClosureConnectedMSTs}
                className="px-3 py-2 rounded bg-dark-700 hover:bg-dark-600 text-dark-100 text-sm"
              >
                View Connected MSTs
              </button>
            </div>
          </div>
        )}

        {selectedMST && (
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 space-y-3">
            <h3 className="text-lg font-semibold text-white">MST Operations</h3>
            <div className="flex justify-between">
              <span className="text-dark-400">MST ID:</span>
              <span className="text-white">{selectedMST.mst_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Coordinates:</span>
              <span className="text-white">
                {selectedMST.latitude.toFixed(5)}, {selectedMST.longitude.toFixed(5)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Ports:</span>
              <span className="text-white">
                {selectedMST.used_ports}/{selectedMST.total_ports} (free {selectedMST.free_ports || 0})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Connected Customers:</span>
              <span className="text-white">{selectedMST.connected_customers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">PON Signal:</span>
              <span className="text-white">{selectedMST.signal_dbm ?? '-'} dBm</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => navigate(`/clients?mst=${selectedMST.id}`)}
                className="px-3 py-2 rounded bg-dark-700 hover:bg-dark-600 text-dark-100 text-sm"
              >
                View Customers
              </button>
              <button
                onClick={connectClientToMST}
                className="px-3 py-2 rounded bg-primary-600 hover:bg-primary-500 text-white text-sm"
              >
                Connect New User
              </button>
              <button
                onClick={() => traceMST(selectedMST.id)}
                className="px-3 py-2 rounded bg-dark-700 hover:bg-dark-600 text-dark-100 text-sm"
              >
                View Fiber Source
              </button>
              <button
                onClick={disableMSTPort}
                className="px-3 py-2 rounded bg-danger-600 hover:bg-danger-500 text-white text-sm"
              >
                Disable Port
              </button>
            </div>
          </div>
        )}

        {selectedClient && (
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 space-y-3">
            <h3 className="text-lg font-semibold text-white">Customer Signal & Trace</h3>
            <div className="flex justify-between">
              <span className="text-dark-400">Client:</span>
              <span className="text-white">
                {selectedClient.client_id} - {selectedClient.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Service:</span>
              <span className="text-white">{selectedClient.service_type}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => traceCustomer(selectedClient.id)}
                className="px-3 py-2 rounded bg-primary-600 hover:bg-primary-500 text-white text-sm"
              >
                Trace Fiber Path
              </button>
              <button
                onClick={() => navigate('/clients')}
                className="px-3 py-2 rounded bg-dark-700 hover:bg-dark-600 text-dark-100 text-sm"
              >
                View Customer Page
              </button>
            </div>
          </div>
        )}

        {selectedLink && (
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 space-y-3">
            <h3 className="text-lg font-semibold text-white">Fiber Link Details</h3>
            <div className="flex justify-between">
              <span className="text-dark-400">Link:</span>
              <span className="text-white">{selectedLink.link_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Active Core:</span>
              <span className="text-white">
                {selectedLink.active_core_color || '-'} #{selectedLink.active_core_number || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Signal/Loss:</span>
              <span className="text-white">
                {selectedLink.signal_dbm ?? '-'} dBm / {selectedLink.total_loss_db.toFixed(2)} dB
              </span>
            </div>
            <button
              onClick={() => traceLink(selectedLink.id)}
              className="px-3 py-2 rounded bg-primary-600 hover:bg-primary-500 text-white text-sm"
            >
              Trace Link Path
            </button>
          </div>
        )}
      </div>

      {(trace || fault || loss) && (
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 space-y-3">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">Trace & Fault Analysis</h3>
          </div>

          {traceLoading && <p className="text-dark-400">Tracing path...</p>}

          {trace && (
            <div className="text-sm text-dark-200 space-y-2">
              <p>
                Path found: <span className="text-white">{trace.found ? 'Yes' : 'No'}</span> | Nodes:{' '}
                <span className="text-white">{trace.nodes.length}</span> | Links:{' '}
                <span className="text-white">{trace.links.length}</span>
              </p>
              <p>
                Total modeled loss: <span className="text-white">{trace.total_loss_db.toFixed(2)} dB</span>
              </p>
            </div>
          )}

          {loss && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-dark-900 rounded p-3 border border-dark-700">
                <p className="text-dark-400">Splice Loss</p>
                <p className="text-white font-semibold">{loss.splice_loss_db.toFixed(2)} dB</p>
              </div>
              <div className="bg-dark-900 rounded p-3 border border-dark-700">
                <p className="text-dark-400">Distance Loss</p>
                <p className="text-white font-semibold">{loss.distance_loss_db.toFixed(2)} dB</p>
              </div>
              <div className="bg-dark-900 rounded p-3 border border-dark-700">
                <p className="text-dark-400">Total Loss</p>
                <p className="text-white font-semibold">{loss.total_loss_db.toFixed(2)} dB</p>
              </div>
              <div className="bg-dark-900 rounded p-3 border border-dark-700">
                <p className="text-dark-400">Estimated Rx</p>
                <p className="text-white font-semibold">
                  {loss.signal_estimate_dbm !== null ? `${loss.signal_estimate_dbm} dBm` : '-'}
                </p>
              </div>
            </div>
          )}

          {fault?.break_detected && (
            <div className="bg-danger-500/10 border border-danger-500/30 rounded p-3 text-sm text-danger-200">
              <p className="font-semibold">Fault Detected</p>
              <p>{JSON.stringify(fault.probable_fault || {}, null, 2)}</p>
            </div>
          )}
        </div>
      )}

      {(mapData?.alerts?.length || 0) > 0 && (
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <h3 className="text-lg font-semibold text-white mb-3">Active Alerts</h3>
          <div className="space-y-2">
            {(mapData?.alerts || []).slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={`rounded px-3 py-2 text-sm border ${
                  alert.severity === 'critical'
                    ? 'bg-danger-500/10 border-danger-500/30 text-danger-200'
                    : alert.severity === 'warning'
                    ? 'bg-warning-500/10 border-warning-500/30 text-warning-200'
                    : 'bg-primary-500/10 border-primary-500/30 text-primary-200'
                }`}
              >
                <div className="font-medium">{alert.alert_type}</div>
                <div>{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
