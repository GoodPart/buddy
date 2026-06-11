export default function DevLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <h1>DEV ONLY</h1>
            <h1>컴포넌트 쇼케이스</h1>
            {children}
        </div>
    )
}