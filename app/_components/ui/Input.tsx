interface InputProps {
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = ({ type = "text", placeholder = "Enter your text", value, onChange }: InputProps) => {
    return (
        <input className="border border-gray-300 rounded-md p-2"
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
         />
    )
}

export default Input;