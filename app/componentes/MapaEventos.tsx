"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polygon } from "react-leaflet";
import type { Feature } from "geojson";

// Corrige o problema clássico dos ícones padrão do Leaflet com bundlers:
// os caminhos relativos das imagens não são resolvidos pelo Next.js, então
// apontamos para os arquivos servidos pelo unpkg (mesma versão instalada).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CENTRO_BRASIL: [number, number] = [-15.8, -47.9];

type Props = {
  features: Feature[];
  onSelecionar: (eventoId: string) => void;
};

export default function MapaEventos({ features, onSelecionar }: Props) {
  return (
    <MapContainer
      center={CENTRO_BRASIL}
      zoom={4}
      className="h-full w-full"
      aria-label="Mapa do Brasil com eventos documentados"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {features.map((feature) => {
        const props = feature.properties as { evento_id: string; titulo: string };
        if (feature.geometry.type === "Point") {
          const [lng, lat] = feature.geometry.coordinates as [number, number];
          return (
            <Marker
              key={props.evento_id}
              position={[lat, lng]}
              eventHandlers={{ click: () => onSelecionar(props.evento_id) }}
              alt={props.titulo}
            />
          );
        }
        if (
          feature.geometry.type === "Polygon" ||
          feature.geometry.type === "MultiPolygon"
        ) {
          const polygons =
            feature.geometry.type === "Polygon"
              ? [feature.geometry.coordinates]
              : feature.geometry.coordinates;
          return polygons.map((rings, i) => (
            <Polygon
              key={`${props.evento_id}-${i}`}
              positions={rings.map((ring) =>
                ring.map(([lng, lat]) => [lat, lng] as [number, number])
              )}
              pathOptions={{ color: "#7c2d12", weight: 2, fillOpacity: 0.15 }}
              eventHandlers={{ click: () => onSelecionar(props.evento_id) }}
            />
          ));
        }
        return null;
      })}
    </MapContainer>
  );
}
