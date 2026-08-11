import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function TextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.value = value;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full p-4 text-sm text-gray-700 leading-7 indent-8 resize-none outline-none font-serif bg-white"
      spellCheck={false}
    />
  );
}
