import Button from "@/app/_components/ui/Button";

export function CodeBlock() {
    const code = `function sayHello() {
    console.log("Hello, TSX!");
  }`;
  
    return (
      <pre style={{ background: '#282c34', color: '#fff', padding: '1rem', borderRadius: '8px' }}>
        <code>{code}</code>
      </pre>
    );
  }

export default function DevPage() {
    return (
        <div>
            <h1>Dev Page</h1>
            <pre>
                <CodeBlock />
            </pre>
            <Button type="button">Click me</Button>
        </div>
    )
}