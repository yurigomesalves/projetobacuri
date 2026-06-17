"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  CircleMarker,
  Tooltip,
  Popup,
} from "react-leaflet";
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
  // Camada de ORIGEM (ADR-016, decisão 4): cidades natais das vítimas, em
  // camada separada da de eventos (local do crime). Vazio = camada desligada.
  origem?: Feature[];
  onSelecionar: (eventoId: string) => void;
};

// Cor sóbria e distinta dos pinos de evento, para marcar a camada de origem.
const COR_ORIGEM = "#1d4ed8";

export default function MapaEventos({ features, origem = [], onSelecionar }: Props) {
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

      {origem.map((feature, i) => {
        if (feature.geometry.type !== "Point") return null;
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const props = feature.properties as {
          slug: string;
          nome: string;
          municipio_natal?: string;
          uf_natal?: string;
        };
        const local = [props.municipio_natal, props.uf_natal]
          .filter(Boolean)
          .join(" — ");
        return (
          <CircleMarker
            key={`origem-${props.slug}-${i}`}
            center={[lat, lng]}
            radius={6}
            pathOptions={{
              color: COR_ORIGEM,
              weight: 2,
              fillColor: COR_ORIGEM,
              fillOpacity: 0.6,
            }}
          >
            <Tooltip>
              cidade natal de {props.nome} — origem da vítima, não o local do
              crime
            </Tooltip>
            <Popup>
              <span className="block font-medium">{props.nome}</span>
              {local && <span className="block">Cidade natal: {local}</span>}
              <a href={`/biografias/${props.slug}`} className="underline">
                Ver biografia
              </a>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
