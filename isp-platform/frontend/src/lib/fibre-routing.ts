import type { FibreCable, FibreRouteMode, FibreRouteSource, GeoPoint } from "@/types";

type RouteResult = {
  start: GeoPoint;
  end: GeoPoint;
  geometry: GeoPoint[];
  distanceMeters: number;
  routeMode: FibreRouteMode;
  routeSource: FibreRouteSource;
  routeFallbackReason?: string;
};

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const toRad = (value: number) => (value * Math.PI) / 180;

const haversineMeters = (a: GeoPoint, b: GeoPoint) => {
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const calculatePolylineDistanceMeters = (points: GeoPoint[]) => {
  if (points.length < 2) return 0;
  return points.reduce((sum, point, index) => {
    if (index === 0) return 0;
    return sum + haversineMeters(points[index - 1], point);
  }, 0);
};

export const formatCableDistance = (meters = 0) => {
  if (!Number.isFinite(meters)) return "0 m";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

export const hydrateCableRoute = (cable: FibreCable): FibreCable => {
  const geometry = cable.geometry?.length ? cable.geometry : cable.coordinates;
  const coordinates = cable.coordinates?.length ? cable.coordinates : geometry ?? [];
  const distanceMeters =
    cable.distanceMeters && cable.distanceMeters > 0
      ? cable.distanceMeters
      : calculatePolylineDistanceMeters(coordinates);
  return {
    ...cable,
    geometry: geometry ?? coordinates,
    coordinates,
    distanceMeters,
    routeMode: cable.routeMode ?? (coordinates.length > 2 ? "road" : "straight"),
    routeSource:
      cable.routeSource ??
      (coordinates.length > 2 ? "mapbox-directions" : "straight-line-fallback"),
  };
};

export async function getPreferredFibreRoute(start: GeoPoint, end: GeoPoint): Promise<RouteResult> {
  if (!mapboxToken) {
    return {
      start,
      end,
      geometry: [start, end],
      distanceMeters: haversineMeters(start, end),
      routeMode: "straight",
      routeSource: "straight-line-fallback",
      routeFallbackReason: "Mapbox token missing.",
    };
  }

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?geometries=geojson&overview=full&access_token=${mapboxToken}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        start,
        end,
        geometry: [start, end],
        distanceMeters: haversineMeters(start, end),
        routeMode: "straight",
        routeSource: "straight-line-fallback",
        routeFallbackReason: `Directions API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      routes?: Array<{ distance: number; geometry: { coordinates: [number, number][] } }>;
    };
    const route = data.routes?.[0];
    if (!route) {
      return {
        start,
        end,
        geometry: [start, end],
        distanceMeters: haversineMeters(start, end),
        routeMode: "straight",
        routeSource: "straight-line-fallback",
        routeFallbackReason: "No route returned from Directions API.",
      };
    }

    const geometry = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    return {
      start,
      end,
      geometry,
      distanceMeters: route.distance,
      routeMode: "road",
      routeSource: "mapbox-directions",
    };
  } catch (error) {
    return {
      start,
      end,
      geometry: [start, end],
      distanceMeters: haversineMeters(start, end),
      routeMode: "straight",
      routeSource: "straight-line-fallback",
      routeFallbackReason: error instanceof Error ? error.message : "Directions API failure.",
    };
  }
}
