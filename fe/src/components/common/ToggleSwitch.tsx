import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    aria-pressed={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
      checked ? 'bg-primary' : 'bg-muted'
    }`}
  >
    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${
      checked ? 'translate-x-5' : ''
    }`} />
  </button>
);

export default ToggleSwitch;
