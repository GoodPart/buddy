export type CurrentGeoPosition = {
  lng: number;
  lat: number;
  accuracy: number;
};

function toErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.";
    case 2:
      return "현재 위치를 확인할 수 없습니다.";
    case 3:
      return "위치 조회 시간이 초과되었습니다. 다시 시도해 주세요.";
    default:
      return "위치를 가져오지 못했습니다.";
  }
}

export function getCurrentGeoPosition(): Promise<CurrentGeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 서비스를 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(new Error(toErrorMessage(err.code)));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 30_000,
      }
    );
  });
}
