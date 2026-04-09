import { FileUploader } from '@carbon/react';

interface ImportFileTabProps {
  selectedFile: File | null;
  isProcessing: boolean;
  onFileChange: (event: any) => void;
  onFileDelete: () => void;
}

export function ImportFileTab({ selectedFile, isProcessing, onFileChange, onFileDelete }: ImportFileTabProps) {
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          Upload a trip document file in JSON, Markdown, or plain text format.
        </p>
      </div>

      <FileUploader
        labelTitle="Upload Trip Document"
        labelDescription="Supported formats: JSON, Markdown, Text (.json, .md, .txt)"
        buttonLabel="Choose file"
        filenameStatus="edit"
        accept={['.json', '.md', '.txt']}
        multiple={false}
        disabled={isProcessing}
        iconDescription="Delete file"
        name="trip-document"
        onChange={onFileChange}
        onDelete={onFileDelete}
        size="md"
      />
      {selectedFile && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--cds-layer-01)', borderRadius: '4px' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Selected File
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        </div>
      )}
    </div>
  );
}
