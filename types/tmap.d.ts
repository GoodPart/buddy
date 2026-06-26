declare namespace Tmapv2 {
  function setHttpsMode(enabled: boolean): void;
  function _getScriptLocation(): string;

  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    extend(latlng: LatLng): void;
  }

  class Map {
    constructor(el: string | HTMLElement, options: Record<string, unknown>);
    fitBounds(bounds: LatLngBounds): void;
    setCenter(latlng: LatLng): void;
    setZoom(zoom: number): void;
    destroy(): void;
  }

  class Polyline {
    constructor(options: Record<string, unknown>);
    setMap(map: Map | null): void;
  }

  class Point {
    constructor(x: number, y: number);
  }

  class Marker {
    constructor(options: Record<string, unknown>);
    setPosition(latlng: LatLng): void;
    setMap(map: Map | null): void;
  }

  namespace event {
    function addListener(
      instance: object,
      event: string,
      handler: (...args: unknown[]) => void
    ): void;
  }
}

interface Window {
  Tmapv2?: typeof Tmapv2;
}
