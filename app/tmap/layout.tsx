import Script from "next/script";

const JS_KEY = process.env.NEXT_PUBLIC_TMAP_JS_KEY;

export default function TmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {JS_KEY && (
        <Script
          id="tmap-jsv2-bootstrap"
          src={`https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${JS_KEY}`}
          strategy="beforeInteractive"
        />
      )}
      {children}
    </>
  );
}
