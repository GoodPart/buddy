// blocks/QuoteBlock.tsx
export function QuoteBlock({ title, body }: { title?: string; body: string }) {
  return (
    <blockquote className="border-l-4 pl-4 italic">
      {title && <cite className="block font-semibold not-italic">{title}</cite>}
      <p>{body}</p>
    </blockquote>
  );
}