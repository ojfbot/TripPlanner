import { IconButton } from '@carbon/react';
import { Checkmark, Close } from '@carbon/icons-react';
import type { ProposedChange } from './useImportAgent';

interface PromptDiffViewerProps {
  changes: ProposedChange[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function PromptDiffViewer({ changes, onAccept, onReject }: PromptDiffViewerProps) {
  return (
    <div style={{
      flex: 1, minHeight: 0, overflow: 'auto',
      backgroundColor: '#1e1e1e', padding: '1rem',
      borderRadius: '4px', border: '1px solid #333',
    }}>
      {changes.map((change) => (
        <div
          key={change.id}
          style={{
            marginBottom: '1rem', padding: '0.75rem',
            backgroundColor: change.accepted === true ? 'rgba(46, 160, 67, 0.1)' :
                           change.accepted === false ? 'rgba(218, 30, 40, 0.1)' :
                           'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            border: change.accepted === true ? '1px solid rgba(46, 160, 67, 0.3)' :
                   change.accepted === false ? '1px solid rgba(218, 30, 40, 0.3)' :
                   '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#d4d4d4', fontWeight: 600 }}>
              {change.type === 'modify' ? 'Modify' : change.type === 'add' ? 'Add' : 'Remove'}
              {change.lineNumber && ` (Line ${change.lineNumber})`}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <IconButton label="Accept change" onClick={() => onAccept(change.id)}
                kind={change.accepted === true ? 'primary' : 'ghost'} size="sm">
                <Checkmark size={16} />
              </IconButton>
              <IconButton label="Reject change" onClick={() => onReject(change.id)}
                kind={change.accepted === false ? 'secondary' : 'ghost'} size="sm">
                <Close size={16} />
              </IconButton>
            </div>
          </div>
          {change.original && (
            <div style={{
              padding: '0.5rem', backgroundColor: 'rgba(218, 30, 40, 0.15)',
              borderLeft: '3px solid #da1e28', marginBottom: '0.5rem',
              fontFamily: '"IBM Plex Mono", "Menlo", "Monaco", "Courier New", monospace',
              fontSize: '0.75rem', color: '#ff6b6b', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              - {change.original}
            </div>
          )}
          <div style={{
            padding: '0.5rem', backgroundColor: 'rgba(46, 160, 67, 0.15)',
            borderLeft: '3px solid #2ea043',
            fontFamily: '"IBM Plex Mono", "Menlo", "Monaco", "Courier New", monospace',
            fontSize: '0.75rem', color: '#6fdc8c', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            + {change.proposed}
          </div>
        </div>
      ))}
    </div>
  );
}
