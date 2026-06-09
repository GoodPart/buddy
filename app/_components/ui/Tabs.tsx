
export default function Tabs({ tabItem, activeTab, setActiveTab }: { tabItem: any, activeTab: any, setActiveTab: any }) {
    const handleClick = (item: any) => {
        setActiveTab(item);
    }
    console.log(activeTab);
    return (
        <ol>
            {tabItem.map((item: any) => (
                <li key={item} className={`${activeTab === item ? 'active' : ''}`}>
                    <button onClick={() => handleClick(item)}>{item}</button>
                </li>
            ))}
        </ol>
    );
}