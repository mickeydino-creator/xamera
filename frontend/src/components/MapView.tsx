import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import type { Camera } from '../types/camera';

const SOURCE_ID = 'cameras';

function toFeatureCollection(cameras: Camera[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cameras.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
      properties: { id: c.id, isLive: c.isLive },
    })),
  };
}

interface Props {
  cameras: Camera[];
  onMoveEnd: (bbox: [number, number, number, number]) => void;
  onSelectCamera: (id: string) => void;
}

export default function MapView({ cameras, onMoveEnd, onSelectCamera }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMoveEndRef = useRef(onMoveEnd);
  const onSelectRef = useRef(onSelectCamera);
  onMoveEndRef.current = onMoveEnd;
  onSelectRef.current = onSelectCamera;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      },
      center: [15, 25],
      zoom: 2.2,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toFeatureCollection([]),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            'rgba(79, 209, 197, 0.85)',
            25,
            'rgba(124, 92, 255, 0.85)',
            100,
            'rgba(255, 92, 124, 0.85)',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 25, 24, 100, 32],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
          'text-font': ['Noto Sans Bold'],
        },
        paint: { 'text-color': '#0a0e14' },
      });

      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': ['case', ['get', 'isLive'], '#33e07b', '#6b7280'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0a0e14',
        },
      });

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        if (clusterId == null) return;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coords = (features[0].geometry as Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom });
        });
      });

      map.on('click', 'unclustered-point', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelectRef.current(id);
      });

      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''));
      map.on('mouseenter', 'unclustered-point', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'unclustered-point', () => (map.getCanvas().style.cursor = ''));

      emitBBox(map);
    });

    function emitBBox(m: maplibregl.Map) {
      const b = m.getBounds();
      onMoveEndRef.current([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }

    let debounceTimer: ReturnType<typeof setTimeout>;
    map.on('moveend', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => emitBBox(map), 250);
    });

    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      source?.setData(toFeatureCollection(cameras));
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [cameras]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
