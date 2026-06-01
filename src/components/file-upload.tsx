import { useCallback, useRef, useState } from 'react';

interface Props {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
}

export function FileUpload({ onFileLoaded }: Props) {
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
        <div>
          <p className="text-sm text-gray-500">已选择文件</p>
          <p className="mt-1 font-medium text-gray-800">{fileName}</p>
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
