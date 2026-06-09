interface ButtonProps {
    children: React.ReactNode;
    type: "button" | "submit" | "reset";
    onClick?: () => void;
}
const Button = ({ children, type, onClick }: ButtonProps) => {
    return (
        <button 
            className="bg-blue-500 text-white p-2 rounded-md"
            type={type}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

export default Button;