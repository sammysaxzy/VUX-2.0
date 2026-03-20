import { Layers, Map, Satellite, Terrain } from 'lucide-react';
import { useMapStore } from '../../store';
import clsx from 'clsx';

export default function MapControls() {
  const {
    showClients,
    showMST,
    showFibreRoutes,
    showDropLines,
    mapType,
    toggleClients,
    toggleMST,
    toggleFibreRoutes,
    toggleDropLines,
    setMapType,
  } = useMapStore();

  return (
    <div className="space-y-4">
      {/* Layer toggles */}
      <div className="card">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Layers
        </h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showClients}
              onChange={toggleClients}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-dark-300">Clients</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showMST}
              onChange={toggleMST}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-dark-300">MST Boxes</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showFibreRoutes}
              onChange={toggleFibreRoutes}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-dark-300">Fibre Routes</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showDropLines}
              onChange={toggleDropLines}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-dark-300">Drop Lines</span>
          </label>
        </div>
      </div>

      {/* Map type */}
      <div className="card">
        <h4 className="text-sm font-semibold text-white mb-3">Map Type</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { type: 'roadmap', icon: Map, label: 'Roadmap' },
            { type: 'satellite', icon: Satellite, label: 'Satellite' },
            { type: 'hybrid', icon: Layers, label: 'Hybrid' },
            { type: 'terrain', icon: Terrain, label: 'Terrain' },
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setMapType(type as any)}
              className={clsx(
                'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                mapType === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}