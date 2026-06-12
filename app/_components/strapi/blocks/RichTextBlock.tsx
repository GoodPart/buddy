// blocks/RichTextBlock.tsx — 예제 데이터가 마크다운 형태
export function RichTextBlock({ body }: { body: string }) {
  return <div className="prose whitespace-pre-wrap">{body}</div>;
}