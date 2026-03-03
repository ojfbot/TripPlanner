/**
 * TripPlanner SettingsPanel — exposed via MF './Settings' to the shell.
 *
 * Shell provides the <Modal> chrome. This component reads from the shell's
 * shared Redux store and dispatches updates via action type string.
 *
 * Connection status: probes GET /health on the TripPlanner API server.
 * URL is derived from the Redux override or env default so it reflects
 * whatever is currently configured — no redirect to standalone app.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  TextInput,
  Select,
  SelectItem,
  InlineLoading,
  Button,
  FormGroup,
  Tag,
} from '@carbon/react'
import { Renew } from '@carbon/icons-react'
import './SettingsPanel.css'

const ACTION_TYPE = 'settings/updateTripPlannerSettings'
// Dev default: Vite proxy forwards /api → localhost:3011 in standalone mode.
// In the shell MF context there is no Vite proxy, so we need the explicit URL.
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011'

interface TripSettings {
  apiBaseUrl: string
  defaultCurrency: string
  distanceUnit: string
  defaultBudgetCategory: string
}

const DEFAULTS: TripSettings = {
  apiBaseUrl: '',
  defaultCurrency: 'USD',
  distanceUnit: 'km',
  defaultBudgetCategory: 'mid-range',
}

// ── Connection status hook ────────────────────────────────────────────────────

type ConnStatus = 'idle' | 'checking' | 'connected' | 'unreachable'

function useConnectionStatus(apiBaseUrl: string) {
  const [status, setStatus] = useState<ConnStatus>('idle')

  const check = useCallback(async () => {
    setStatus('checking')
    try {
      const healthUrl = new URL('/health', apiBaseUrl || DEFAULT_API_BASE_URL).href
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(healthUrl, { signal: controller.signal })
      clearTimeout(timer)
      setStatus(res.ok ? 'connected' : 'unreachable')
    } catch {
      setStatus('unreachable')
    }
  }, [apiBaseUrl])

  useEffect(() => { check() }, [check])

  return { status, recheck: check }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPanel({ onClose: _onClose }: { onClose?: () => void }) {
  const dispatch = useDispatch()
  const stored =
    useSelector((s: any) => s?.settings?.apps?.['tripplanner'] as TripSettings | undefined) ?? DEFAULTS

  const effectiveUrl = stored.apiBaseUrl || DEFAULT_API_BASE_URL
  const { status, recheck } = useConnectionStatus(stored.apiBaseUrl)

  const [apiBaseUrl, setApiBaseUrl] = useState(stored.apiBaseUrl)

  function handleApiUrlBlur() {
    const trimmed = apiBaseUrl.trim()
    if (trimmed !== stored.apiBaseUrl) {
      dispatch({ type: ACTION_TYPE, payload: { apiBaseUrl: trimmed } })
    }
  }

  function handlePrefChange(field: keyof TripSettings, value: string) {
    dispatch({ type: ACTION_TYPE, payload: { [field]: value } })
  }

  return (
    <div className="trip-settings-panel">
      {/* ── Connection ─────────────────────────────────────────────────────── */}
      <FormGroup legendText="Connection" className="settings-form-group">
        <TextInput
          id="trip-api-base-url"
          labelText="API base URL"
          helperText={`Default: ${DEFAULT_API_BASE_URL}`}
          placeholder={DEFAULT_API_BASE_URL}
          value={apiBaseUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiBaseUrl(e.target.value)}
          onBlur={handleApiUrlBlur}
        />

        <div className="settings-connection-row">
          <ConnectionIndicator status={status} url={effectiveUrl} />
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            iconDescription="Re-check"
            hasIconOnly
            onClick={recheck}
            disabled={status === 'checking'}
            className="settings-recheck-btn"
          />
        </div>
      </FormGroup>

      {/* ── Preferences ──────────────────────────────────────────────────── */}
      <FormGroup legendText="Preferences" className="settings-form-group">
        <Select
          id="trip-currency"
          labelText="Default currency"
          value={stored.defaultCurrency}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handlePrefChange('defaultCurrency', e.target.value)
          }
        >
          <SelectItem value="USD" text="USD – US Dollar" />
          <SelectItem value="EUR" text="EUR – Euro" />
          <SelectItem value="GBP" text="GBP – British Pound" />
          <SelectItem value="JPY" text="JPY – Japanese Yen" />
        </Select>

        <Select
          id="trip-distance-unit"
          labelText="Distance unit"
          value={stored.distanceUnit}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handlePrefChange('distanceUnit', e.target.value)
          }
        >
          <SelectItem value="km"    text="Kilometres" />
          <SelectItem value="miles" text="Miles" />
        </Select>

        <Select
          id="trip-budget-category"
          labelText="Default budget category"
          value={stored.defaultBudgetCategory}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handlePrefChange('defaultBudgetCategory', e.target.value)
          }
        >
          <SelectItem value="budget"    text="Budget" />
          <SelectItem value="mid-range" text="Mid-range" />
          <SelectItem value="luxury"    text="Luxury" />
        </Select>
      </FormGroup>
    </div>
  )
}

// ── Status indicator ──────────────────────────────────────────────────────────

function ConnectionIndicator({ status, url }: { status: ConnStatus; url: string }) {
  if (status === 'checking') {
    return (
      <InlineLoading
        description="Checking connection…"
        status="active"
        className="settings-conn-loading"
      />
    )
  }
  if (status === 'connected') {
    return (
      <span className="settings-conn-status">
        <Tag type="green" size="sm">Connected</Tag>
        <span className="settings-conn-url">{url}</span>
      </span>
    )
  }
  if (status === 'unreachable') {
    return (
      <span className="settings-conn-status">
        <Tag type="red" size="sm">Unreachable</Tag>
        <span className="settings-conn-url">{url}</span>
      </span>
    )
  }
  return null
}
