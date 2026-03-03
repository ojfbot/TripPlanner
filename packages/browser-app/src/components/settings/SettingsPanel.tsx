/**
 * TripPlanner SettingsPanel — exposed via MF './Settings' to the shell.
 *
 * Shell provides the <Modal> chrome. This component owns form fields, reads
 * from the shell's shared Redux store, and dispatches updates back.
 *
 * Dispatch pattern: sub-apps can't import from the shell (circular MF dep).
 * Use action type string — valid Redux, store is shared via MF singleton.
 *
 * Sensitive keys (ANTHROPIC_API_KEY, OPENAI_API_KEY) stay server-side.
 * Only the API base URL (non-sensitive) and preferences go through Redux.
 */

import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  TextInput,
  Select,
  SelectItem,
  FormGroup,
} from '@carbon/react'
import './SettingsPanel.css'

const ACTION_TYPE = 'settings/updateTripPlannerSettings'
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'

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

export default function SettingsPanel({ onClose: _onClose }: { onClose?: () => void }) {
  const dispatch = useDispatch()
  const stored =
    useSelector((s: any) => s?.settings?.apps?.['tripplanner'] as TripSettings | undefined) ?? DEFAULTS

  // API URL — save on blur to avoid partial-URL dispatches while typing
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
