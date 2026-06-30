/** VWorld WebGL 3D / MapController 전역 타입 (최소) */
declare global {
  interface Window {
    vw?: VWorldNamespace;
  }
}

export interface VWorldCoord {
  x: number;
  y: number;
}

export interface VWorldCoordZ extends VWorldCoord {
  z: number;
}

export interface VWorldDirection {
  heading: number;
  tilt: number;
  roll: number;
}

export interface VWorldCameraPosition {
  coord: VWorldCoordZ;
  direction: VWorldDirection;
}

export interface VWorldMapInstance {
  start?(): void;
  moveTo(position: VWorldCameraPosition): void;
  clear?(): void;
  getLayerElement?(name: string): { show?: () => void; hide?: () => void };
  onClick?: { addEventListener(fn: (...args: unknown[]) => void): void };
}

export interface VWorldMapController {
  Map2D?: unknown;
  Map3D?: VWorldMapInstance;
  setMode(mode: "2d-map" | "3d-map"): void;
}

export interface VWorldGeometry {
  create(): void;
  getId?: () => string;
  ws3dGraphics?: { id: string };
  remove?(): void;
  setId?(id: string): void;
}

export interface VWorldNamespace {
  BasemapType: { GRAPHIC: unknown; PHOTO: unknown; PHOTO_HYBRID: unknown };
  DensityType: { EMPTY: unknown; BASIC: unknown; FULL: unknown };
  Color: new (r: number, g: number, b: number, a: number) => unknown;
  Coord: new (lng: number, lat: number) => VWorldCoord;
  CoordZ: new (lng: number, lat: number, alt: number) => VWorldCoordZ;
  Direction: new (heading: number, tilt: number, roll: number) => VWorldDirection;
  CameraPosition: new (
    coord: VWorldCoordZ,
    direction: VWorldDirection
  ) => VWorldCameraPosition;
  Collection: new (items: VWorldCoord[]) => unknown;
  MapOptions: new (...args: unknown[]) => unknown;
  Map: new (options: Record<string, unknown>) => VWorldMapInstance;
  MapController?: new (options: Record<string, unknown>) => VWorldMapController;
  MapControllerOption?: Record<string, unknown>;
  ol3?: {
    BasemapType: { GRAPHIC: unknown };
    DensityType: { EMPTY: unknown; BASIC: unknown };
    CameraPosition: unknown;
  };
  geom?: {
    LineString: new (coords: unknown) => VWorldGeometry & {
      setWidth?(w: number): void;
      setFillColor(c: unknown): void;
      setOutLineColor(c: unknown): void;
    };
    LineStringZ: new (coords: unknown) => VWorldGeometry;
    PointZ: new (coord: VWorldCoordZ) => VWorldGeometry & {
      setFillColor(c: unknown): void;
      setOutLineColor(c: unknown): void;
    };
  };
}

export {};
