// UI만 (CMX/DB 무관, 재사용)

interface ProductProps {
    name: string;
    description: string;
    price: number;
    image: string;
    badge?: string;
}

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
}



export default function ProductComponent({name, description, price, image, badge}: ProductProps) {
    return (
        <div className="flex flex-col gap-2 border border-gray-300 rounded-md p-4">
            <div className="relative">
                {
                    !image ? (
                        <img src={image} alt={name} className="max-w-[200px] max-h-[200px] object-cover rounded-md" />
                    ) : (
                        <div className="w-[200px] h-[200px] bg-gray-200 flex items-center justify-center rounded-md">
                            <span className="text-gray-500">No image</span>
                        </div>
                    )
                }
                {badge && <p className="uppercase absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-md">{badge}</p>}
            </div>
            <h2 className="font-bold">{name}</h2>
            <p className="text-gray-500">{description}</p>
            <p className="text-xl font-bold">{formatPrice(price)}</p>
        </div>
    )
}