import { useCallback, useRef, useState } from 'react';

interface Props {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
  onClear?: () => void;
}

export function FileUpload({ onFileLoaded, onClear }: Props) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      file.arrayBuffer().then((buffer) => onFileLoaded(buffer, file.name));
    },
    [onFileLoaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setFileName(null);
      if (inputRef.current) inputRef.current.value = '';
      onClear?.();
    },
    [onClear],
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={onChange}
      />
      {fileName ? (
        <div className="flex items-center justify-center gap-2">
          <div>
            <p className="text-sm text-gray-500">已选择文件</p>
            <p className="mt-1 font-medium text-gray-800">{fileName}</p>
          </div>
          <button
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            onClick={handleClear}
            title="清除已选文件"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-500">拖拽 TXT 文件到此处，或点击选择</p>
          <p className="mt-1 text-xs text-gray-400">支持自动编码检测</p>
        </div>
      )}
    </div>
  );
}
