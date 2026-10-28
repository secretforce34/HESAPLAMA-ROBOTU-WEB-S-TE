import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatInputNumber, parseTR } from '../lib/format';

interface BaseFieldProps {
  id: string;
  label: string;
  hint?: ComponentChildren;
  error?: string | null;
}

function describedBy(id: string, hint?: unknown, error?: string | null) {
  if (error) return `${id}-err`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function FieldMessages({ id, hint, error }: { id: string; hint?: ComponentChildren; error?: string | null }) {
  if (error) {
    return (
      <p class="field__error" id={`${id}-err`}>
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p class="field__hint" id={`${id}-hint`}>
        {hint}
      </p>
    );
  }
  return null;
}

export interface NumberFieldProps extends BaseFieldProps {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Sağdaki birim: "TL", "%", "ay", "gün" ... */
  suffix?: string;
  prefix?: string;
  /** Gösterimde en fazla ondalık basamak (varsayılan 2) */
  decimals?: number;
  placeholder?: string;
  /** Tam sayı bekleniyorsa "numeric" */
  inputMode?: 'decimal' | 'numeric';
}

/**
 * Türkçe sayı girişi: "50.000", "1.234,56", "12,5" yazılabilir.
 * Yazarken serbest, alandan çıkınca biçimlenir. Geçersiz metinde onChange(null) çağrılır.
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  prefix,
  hint,
  error,
  decimals = 2,
  placeholder,
  inputMode = 'decimal',
}: NumberFieldProps) {
  const [text, setText] = useState(() => formatInputNumber(value, decimals));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatInputNumber(value, decimals));
  }, [value, decimals]);

  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      <div class="input-wrap" data-invalid={error ? '' : undefined}>
        {prefix && <span class="input-affix input-affix--pre">{prefix}</span>}
        <input
          id={id}
          class="input"
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          spellcheck={false}
          value={text}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          onFocus={() => {
            focused.current = true;
          }}
          onInput={(e) => {
            const t = e.currentTarget.value;
            setText(t);
            onChange(parseTR(t));
          }}
          onBlur={() => {
            focused.current = false;
            const parsed = parseTR(text);
            if (parsed !== null) setText(formatInputNumber(parsed, decimals));
          }}
        />
        {suffix && <span class="input-affix">{suffix}</span>}
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  name: string;
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hint?: ComponentChildren;
}

/** Az sayıda seçenek için yan yana düğmeler (radyo grubu). */
export function Segmented<T extends string>({ name, label, value, options, onChange, hint }: SegmentedProps<T>) {
  return (
    <fieldset class="field">
      <legend class="field__label">{label}</legend>
      <div class="segmented">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {hint && <p class="field__hint">{hint}</p>}
    </fieldset>
  );
}

export interface SelectFieldProps<T extends string> extends BaseFieldProps {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({ id, label, value, options, onChange, hint, error }: SelectFieldProps<T>) {
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      <div class="input-wrap" data-invalid={error ? '' : undefined}>
        <select
          id={id}
          class="input"
          value={value}
          aria-describedby={describedBy(id, hint, error)}
          onChange={(e) => onChange(e.currentTarget.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export interface CheckboxFieldProps {
  id: string;
  label: ComponentChildren;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ComponentChildren;
}

export function CheckboxField({ id, label, checked, onChange, hint }: CheckboxFieldProps) {
  return (
    <label class="check" for={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span>
        {label}
        {hint && <span class="check__hint">{hint}</span>}
      </span>
    </label>
  );
}

export interface DateFieldProps extends BaseFieldProps {
  /** ISO tarih (YYYY-AA-GG) ya da boş metin */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

export function DateField({ id, label, value, onChange, min, max, hint, error }: DateFieldProps) {
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      <div class="input-wrap" data-invalid={error ? '' : undefined}>
        <input
          id={id}
          class="input"
          type="date"
          value={value}
          min={min}
          max={max}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          onInput={(e) => onChange(e.currentTarget.value)}
        />
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextField({ id, label, value, onChange, placeholder, hint, error }: TextFieldProps) {
  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      <div class="input-wrap" data-invalid={error ? '' : undefined}>
        <input
          id={id}
          class="input"
          type="text"
          value={value}
          placeholder={placeholder}
          aria-describedby={describedBy(id, hint, error)}
          onInput={(e) => onChange(e.currentTarget.value)}
        />
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}
