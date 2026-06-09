export default function Teaser({ blok }: { blok: any }) {
    return (
      <div className="teaser">
        <h2>{blok.headline}</h2>
      </div>
    );
  }