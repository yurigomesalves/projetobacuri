"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
} from "react-leaflet";
import type { Feature } from "geojson";

const CENTRO_BRASIL: [number, number] = [-15.8, -47.9];

type Props = {
  features: Feature[];
  // Camada de ORIGEM (ADR-016, decisão 4): cidades natais das vítimas, em
  // camada separada da de eventos (local do crime). Vazio = camada desligada.
  origem?: Feature[];
  // Camada de TERRITÓRIOS DE ORIGEM (ADR-019): polígonos das Terras Indígenas
  // dos povos a que as vítimas pertencem. Referência aproximada e contemporânea.
  // Vazio = camada desligada.
  territorios?: Feature[];
  onSelecionar: (eventoId: string) => void;
};

// Variações neutras da identidade do projeto. Forma, contorno e opacidade
// também distinguem as camadas para que a leitura não dependa só da cor.
const COR_ORIGEM = "#686864";
const COR_TERRITORIO_ORIGEM = "#4a4a4a";

// A largura do mapa muda quando a navegação lateral abre ou recolhe. O Leaflet
// não percebe essa mudança sozinho, por isso observamos o contêiner e redesenhamos
// apenas quando ele efetivamente muda de tamanho.
function AjustarMapaAoContainer() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const alvo = container.parentElement ?? container;
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [map]);

  return null;
}

export default function MapaEventos({
  features,
  origem = [],
  territorios = [],
  onSelecionar,
}: Props) {
  return (
    <MapContainer
      center={CENTRO_BRASIL}
      zoom={4}
      className="h-full w-full"
      aria-label="Mapa do Brasil com eventos documentados"
    >
      <AjustarMapaAoContainer />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {features.map((feature) => {
        const props = feature.properties as {
          evento_id: string;
          titulo: string;
          tipos_crime?: string[];
        };
        if (feature.geometry.type === "Point") {
          const [lng, lat] = feature.geometry.coordinates as [number, number];
          const indigena = props.tipos_crime?.includes(
            "violencia_contra_povos_indigenas",
          );
          return (
            <CircleMarker
              key={props.evento_id}
              center={[lat, lng]}
              radius={indigena ? 7 : 6}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: indigena ? "#8a8177" : "#232323",
                fillOpacity: 0.92,
              }}
              eventHandlers={{ click: () => onSelecionar(props.evento_id) }}
            >
              <Tooltip>{props.titulo}</Tooltip>
            </CircleMarker>
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
                ring.map(([lng, lat]) => [lat, lng] as [number, number]),
              )}
              pathOptions={{
                color: "#3a3a3a",
                weight: 2,
                fillColor: "#686864",
                fillOpacity: 0.16,
              }}
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
              fillColor: "#f4f4f2",
              fillOpacity: 0.9,
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

      {territorios.map((feature, i) => {
        if (
          feature.geometry.type !== "Polygon" &&
          feature.geometry.type !== "MultiPolygon"
        )
          return null;
        const props = feature.properties as {
          slug: string;
          nome: string;
          povo_origem: string;
          terra_indigena_nome?: string;
          aproximado: boolean;
        };
        const polygons =
          feature.geometry.type === "Polygon"
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        return polygons.map((rings, j) => (
          <Polygon
            key={`territorio-${props.slug}-${i}-${j}`}
            positions={rings.map((ring) =>
              ring.map(([lng, lat]) => [lat, lng] as [number, number]),
            )}
            pathOptions={{
              color: COR_TERRITORIO_ORIGEM,
              weight: 2,
              dashArray: "6 5",
              fillColor: "#686864",
              fillOpacity: 0.14,
            }}
          >
            <Tooltip>
              Território de origem do povo {props.povo_origem} — referência
              aproximada e contemporânea, não o limite do território em
              1964–1985
            </Tooltip>
            <Popup>
              <span className="block font-medium">{props.nome}</span>
              <span className="block">Povo: {props.povo_origem}</span>
              {props.terra_indigena_nome && (
                <span className="block">TI: {props.terra_indigena_nome}</span>
              )}
              <a href={`/biografias/${props.slug}`} className="underline">
                Ver biografia
              </a>
            </Popup>
          </Polygon>
        ));
      })}
    </MapContainer>
  );
}
