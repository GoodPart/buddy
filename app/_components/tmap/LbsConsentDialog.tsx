type LbsConsentDialogProps = {
  onConsent: (granted: boolean) => void;
};

export default function LbsConsentDialog({ onConsent }: LbsConsentDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lbs-consent-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-gray-600 bg-gray-900 p-4 shadow-xl">
        <h3
          id="lbs-consent-title"
          className="text-sm font-semibold text-white"
        >
          위치 정보 이용 동의
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-gray-300">
          지도에서 현재 위치를 표시하고 경로를 탐색하기 위해 기기의 GPS·위치
          정보를 사용합니다. 위치 정보는 지도 이동·경로 탐색에만 사용되며,
          서버로 전송되지 않습니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onConsent(false)}
            className="rounded-md px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConsent(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            동의하고 계속
          </button>
        </div>
      </div>
    </div>
  );
}
