/* Mix and Max Box Builder — React components (React 18 / @wordpress/element).
   Built to components/bundle.js as one classic script assigning window.MixMax. */
const React = window.React;
const { useState, useEffect, useRef, useMemo, useId } = React;

/* ---------------- utils ---------------- */
const cx = (...a) => a.filter(Boolean).join(' ');
function formatMoney(n, currency = '$') {
  const v = Number(n || 0);
  return currency + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatCompact(n, prefix = '') {
  const v = Number(n || 0), a = Math.abs(v);
  if (a >= 1e6) return prefix + (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return prefix + (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return prefix + Math.round(v);
}
function niceScale(max, ticks) {
  if (!(max > 0)) return { max: ticks, step: 1 };
  const raw = max / ticks, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  return { max: step * ticks, step };
}
function useControlled(value, defaultValue, onChange) {
  const [inner, setInner] = useState(defaultValue);
  const isCtl = value !== undefined;
  const v = isCtl ? value : inner;
  const set = (n) => { if (!isCtl) setInner(n); if (onChange) onChange(n); };
  return [v, set];
}
function useWidth(ref, fallback) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (el.clientWidth) setW(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((es) => { const cw = es[0].contentRect.width; if (cw > 0) setW(cw); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return w;
}

/* ---------------- Icon ---------------- */
const dot = (x, y) => ({ d: [x, y] });
const circ = (x, y, r) => ({ c: [x, y, r] });
const ICONS = {
  box: ['M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z', 'M3 7.5l9 4.5 9-4.5', 'M12 12v9', 'M7.5 5.25l9 4.5'],
  dashboard: ['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 10h7v10h-7z', 'M4 13h7v7H4z'],
  campaign: ['M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1z', 'M18 9a4 4 0 0 1 0 6', 'M7.5 15l1.5 5h2'],
  analytics: ['M4 20h16', 'M6 16v-5', 'M11 16V6', 'M16 16v-8'],
  settings: ['M4 7h9', 'M19 7h1', 'M4 17h3', 'M13 17h7', circ(16, 7, 2.5), circ(10, 17, 2.5)],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  gift: ['M4 11h16v9H4z', 'M3 7h18v4H3z', 'M12 7v13', 'M12 7C10.5 4 7 3.5 7 5.5S9.5 7 12 7z', 'M12 7c1.5-3 5-3.5 5-1.5S14.5 7 12 7z'],
  clock: [circ(12, 12, 9), 'M12 7v5l3 2'],
  flame: ['M12 21c-3.9 0-7-2.6-7-6.4 0-2.8 1.8-4.7 3.4-6.4.3 1.6 1.2 2.6 2.4 3.1C10.9 7.6 12.4 5 14.4 3c.5 3 5.6 5.4 5.6 11.1 0 4.2-3.6 6.9-8 6.9z'],
  tag: ['M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z', circ(7.5, 7.5, 1.5)],
  truck: ['M3 6h11v10H3z', 'M14 9h4l3 3v4h-7', circ(7, 18, 2), circ(17, 18, 2)],
  arrowUp: ['M12 19V5', 'M6 11l6-6 6 6'],
  arrowDown: ['M12 5v14', 'M6 13l6 6 6-6'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  arrowLeft: ['M19 12H5', 'M11 6l-6 6 6 6'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronUp: ['M6 15l6-6 6 6'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  search: [circ(11, 11, 7), 'M20 20l-4-4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  copy: ['M8 8h12v12H8z', 'M16 8V4H4v12h4'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', circ(12, 12, 3)],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  grip: [dot(9, 6), dot(15, 6), dot(9, 12), dot(15, 12), dot(9, 18), dot(15, 18)],
  more: [dot(5, 12), dot(12, 12), dot(19, 12)],
  info: [circ(12, 12, 9), 'M12 11v6', 'M12 7.5v.5'],
  alert: ['M12 3.5l9.5 16.5h-19z', 'M12 10v4.5', 'M12 17.25v.25'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  sparkle: ['M12 3l1.9 7.1L21 12l-7.1 1.9L12 21l-1.9-7.1L3 12l7.1-1.9z'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v5', 'M16 3v5'],
  filter: ['M4 5h16', 'M7 12h10', 'M10 19h4'],
  image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 3-3 4 4', circ(15.5, 9, 1.5)],
  bolt: ['M13 3L5 13h6l-1 8 8-10h-6z'],
  users: [circ(9, 8, 3.5), 'M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5', 'M16 4.5a3.5 3.5 0 0 1 0 7', 'M18.5 14.5c1.8.8 2.8 2.6 3.2 5.5'],
  cart: ['M3 4h2.5l2.2 11h10.6l2-8H6.3', circ(9, 19.5, 1.5), circ(17, 19.5, 1.5)],
  store: ['M4 9l1.5-5h13L20 9', 'M5 11v9h14v-9', 'M4 9a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0A2.67 2.67 0 0 0 20 9', 'M10 20v-5h4v5'],
  palette: ['M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.1-1-1.4-1-2.4 0-.9.8-1.5 1.9-1.5H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3z', dot(7.5, 11.5), dot(9.5, 7.5), dot(14.5, 7.5)],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  key: [circ(8, 15, 4), 'M11 12l9-9', 'M17 6l3 3', 'M14 9l2 2'],
  code: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5'],
  percent: ['M19 5L5 19', circ(7, 7, 2.5), circ(17, 17, 2.5)],
  refresh: ['M20 11a8 8 0 0 0-14.9-3', 'M4 4v4h4', 'M4 13a8 8 0 0 0 14.9 3', 'M20 20v-4h-4'],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M4 20h16'],
  layers: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'],
  help: [circ(12, 12, 9), 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7', 'M12 17v.5'],
};
function Icon({ name, size = 20, strokeWidth = 1.75, title, className, ...rest }) {
  const parts = ICONS[name] || ICONS.box;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={cx('mmbb-icon', className)}
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} focusable="false" {...rest}>
      {title ? <title>{title}</title> : null}
      {parts.map((p, i) => typeof p === 'string'
        ? <path key={i} d={p} />
        : p.c ? <circle key={i} cx={p.c[0]} cy={p.c[1]} r={p.c[2]} />
          : <circle key={i} cx={p.d[0]} cy={p.d[1]} r={1.4} fill="currentColor" stroke="none" />)}
    </svg>
  );
}
Icon.names = Object.keys(ICONS);

/* ---------------- Actions ---------------- */
function Button({ variant = 'secondary', size = 'md', icon, iconRight, loading, fullWidth, className, children, type = 'button', disabled, href, ...rest }) {
  const iconOnly = icon && !children;
  const is = size === 'lg' ? 20 : size === 'sm' ? 16 : 18;
  const cls = cx('mmbb-btn', 'mmbb-btn--' + variant, 'mmbb-btn--' + size, fullWidth && 'mmbb-btn--full', iconOnly && 'mmbb-btn--icon', loading && 'is-loading', className);
  const inner = (
    <>
      {loading ? <span className="mmbb-spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={is} /> : null}
      {children ? <span className="mmbb-btn__label">{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={is} className="mmbb-btn__trail" /> : null}
    </>
  );
  if (href) {
    const off = disabled || loading;
    return <a {...rest} href={off ? undefined : href} aria-disabled={off || undefined} className={cls}>{inner}</a>;
  }
  return (
    <button type={type} {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={cls}>{inner}</button>
  );
}

function Badge({ tone = 'neutral', icon, dot: withDot, children, className }) {
  return (
    <span className={cx('mmbb-badge', 'mmbb-badge--' + tone, className)}>
      {withDot ? <span className="mmbb-badge__dot" aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={14} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

function Sticker({ tone = 'pop', size = 'md', tilt, icon, children, className }) {
  return (
    <span className={cx('mmbb-sticker', 'mmbb-sticker--' + tone, 'mmbb-sticker--' + size, tilt && 'is-tilted', className)}>
      {icon ? <Icon name={icon} size={size === 'lg' ? 20 : size === 'sm' ? 12 : 15} strokeWidth={2.25} /> : null}
      {children}
    </span>
  );
}

/* ---------------- Forms ---------------- */
function TextField({ label, help, error, prefix, suffix, multiline, id, className, rows, ...rest }) {
  const auto = useId(); const fid = id || auto;
  const descId = help || error ? fid + '-desc' : undefined;
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className={cx('mmbb-field', error && 'has-error', className)}>
      {label ? <label className="mmbb-field__label" htmlFor={fid}>{label}</label> : null}
      <div className="mmbb-input">
        {prefix ? <span className="mmbb-input__affix">{typeof prefix === 'string' && ICONS[prefix] ? <Icon name={prefix} size={18} /> : prefix}</span> : null}
        <Tag id={fid} aria-invalid={error ? true : undefined} aria-describedby={descId} rows={multiline ? rows || 3 : undefined} {...rest} />
        {suffix ? <span className="mmbb-input__affix">{suffix}</span> : null}
      </div>
      {error || help ? <p id={descId} className={cx('mmbb-field__help', error && 'is-error')}>{error ? <Icon name="alert" size={14} strokeWidth={2} /> : null}{error || help}</p> : null}
    </div>
  );
}

function SelectField({ label, help, options = [], id, className, ...rest }) {
  const auto = useId(); const fid = id || auto;
  return (
    <div className={cx('mmbb-field', className)}>
      {label ? <label className="mmbb-field__label" htmlFor={fid}>{label}</label> : null}
      <div className="mmbb-input mmbb-input--select">
        <select id={fid} aria-describedby={help ? fid + '-desc' : undefined} {...rest}>
          {options.map((o) => { const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
        </select>
        <Icon name="chevronDown" size={16} />
      </div>
      {help ? <p id={fid + '-desc'} className="mmbb-field__help">{help}</p> : null}
    </div>
  );
}

function Toggle({ checked, defaultChecked = false, onChange, label, description, disabled, id }) {
  const auto = useId(); const fid = id || auto;
  const [on, setOn] = useControlled(checked, defaultChecked, onChange);
  return (
    <div className={cx('mmbb-toggle', disabled && 'is-disabled')}>
      {label || description ? (
        <div className="mmbb-toggle__text">
          {label ? <label id={fid + '-l'} htmlFor={fid} className="mmbb-toggle__label">{label}</label> : null}
          {description ? <p id={fid + '-d'} className="mmbb-toggle__desc">{description}</p> : null}
        </div>
      ) : null}
      <button type="button" role="switch" id={fid} aria-checked={!!on} disabled={disabled}
        aria-labelledby={label ? fid + '-l' : undefined} aria-describedby={description ? fid + '-d' : undefined}
        className="mmbb-toggle__switch" onClick={() => setOn(!on)}>
        <span className="mmbb-toggle__knob" />
      </button>
    </div>
  );
}

function Checkbox({ checked, defaultChecked, onChange, label, description, indeterminate, disabled, className, ...rest }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className={cx('mmbb-check', disabled && 'is-disabled', className)}>
      <input ref={ref} type="checkbox" checked={checked} defaultChecked={defaultChecked} disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked, e)} {...rest} />
      <span className="mmbb-check__box" aria-hidden="true"><Icon name="check" size={14} strokeWidth={2.75} /></span>
      {label || description ? <span className="mmbb-check__text">{label}{description ? <small>{description}</small> : null}</span> : null}
    </label>
  );
}

function ChoiceCard({ selected, onSelect, title, description, meta, tag, icon, name, value, disabled, children, className }) {
  return (
    <label className={cx('mmbb-choice', selected && 'is-selected', disabled && 'is-disabled', className)}>
      <input type="radio" className="mmbb-sr" name={name} value={value} checked={!!selected} disabled={disabled}
        onChange={() => onSelect && onSelect(value)} />
      {tag ? <Sticker size="sm" tilt className="mmbb-choice__tag">{tag}</Sticker> : null}
      {icon ? <span className="mmbb-choice__icon"><Icon name={icon} size={22} /></span> : null}
      <span className="mmbb-choice__body">
        <span className="mmbb-choice__title">{title}</span>
        {description ? <span className="mmbb-choice__desc">{description}</span> : null}
        {children}
      </span>
      {meta ? <span className="mmbb-choice__meta">{meta}</span> : null}
      <span className="mmbb-choice__radio" aria-hidden="true" />
    </label>
  );
}

function QuantityStepper({ value, defaultValue = 0, min = 0, max = 99, onChange, size = 'md', fullWidth, label = 'Quantity', className }) {
  const [v, set] = useControlled(value, defaultValue, onChange);
  const clamp = (n) => set(Math.max(min, Math.min(max, n)));
  return (
    <div className={cx('mmbb-stepper', 'mmbb-stepper--' + size, fullWidth && 'mmbb-stepper--full', className)} role="group" aria-label={label}>
      <button type="button" onClick={() => clamp(v - 1)} disabled={v <= min} aria-label={v === 1 && min === 0 ? 'Remove' : 'Decrease'}>
        <Icon name={v === 1 && min === 0 ? 'trash' : 'minus'} size={16} strokeWidth={2} />
      </button>
      <output aria-live="polite">{v}</output>
      <button type="button" onClick={() => clamp(v + 1)} disabled={v >= max} aria-label="Increase">
        <Icon name="plus" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function SegmentedControl({ options = [], value, defaultValue, onChange, size = 'md', label, fullWidth }) {
  const first = options[0] && (options[0].value !== undefined ? options[0].value : options[0]);
  const [v, set] = useControlled(value, defaultValue !== undefined ? defaultValue : first, onChange);
  return (
    <div className={cx('mmbb-seg', 'mmbb-seg--' + size, fullWidth && 'mmbb-seg--full')} role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const ov = o.value !== undefined ? o.value : o; const ol = o.label !== undefined ? o.label : o;
        return (
          <button key={ov} type="button" role="radio" aria-checked={v === ov} onClick={() => set(ov)}>
            {o.icon ? <Icon name={o.icon} size={16} /> : null}{ol}
          </button>
        );
      })}
    </div>
  );
}

function Chips({ options = [], value, defaultValue, onChange, label }) {
  const first = options[0] && (options[0].value !== undefined ? options[0].value : options[0]);
  const [v, set] = useControlled(value, defaultValue !== undefined ? defaultValue : first, onChange);
  return (
    <div className="mmbb-chips" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const ov = o.value !== undefined ? o.value : o; const ol = o.label !== undefined ? o.label : o;
        return (
          <button key={ov} type="button" role="radio" aria-checked={v === ov} className="mmbb-chip" onClick={() => set(ov)}>
            {ol}{o.count != null ? <span className="mmbb-chip__count">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Layout & navigation ---------------- */
function Tabs({ tabs = [], value, defaultValue, onChange, label }) {
  const [v, set] = useControlled(value, defaultValue !== undefined ? defaultValue : tabs[0] && tabs[0].id, onChange);
  return (
    <div className="mmbb-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={v === t.id} className="mmbb-tab" onClick={() => set(t.id)}>
          {t.label}{t.count != null ? <span className="mmbb-tab__count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Steps({ steps = [], current = 0, onStep, compact }) {
  return (
    <ol className={cx('mmbb-steps', compact && 'mmbb-steps--compact')}>
      {steps.map((s, i) => {
        const state = i < current ? 'is-done' : i === current ? 'is-current' : 'is-next';
        const label = s && typeof s === 'object' && !React.isValidElement(s) ? s.label : s;
        const href = s && typeof s === 'object' && !React.isValidElement(s) ? s.href : undefined;
        const inner = (
          <>
            <span className="mmbb-step__dot">{i < current ? <Icon name="check" size={14} strokeWidth={2.75} /> : i + 1}</span>
            <span className="mmbb-step__label">{label}</span>
          </>
        );
        return (
          <li key={i} className={cx('mmbb-step', state)} aria-current={i === current ? 'step' : undefined}>
            {href ? <a className="mmbb-step__btn" href={href}>{inner}</a>
              : onStep ? <button type="button" className="mmbb-step__btn" onClick={() => onStep(i)}>{inner}</button> : inner}
            {i < steps.length - 1 ? <span className="mmbb-step__line" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, subtitle, actions, footer, children, padding = 'md', className, as = 'section' }) {
  const T = as;
  return (
    <T className={cx('mmbb-card', 'mmbb-card--pad-' + padding, className)}>
      {title || actions ? (
        <header className="mmbb-card__head">
          <div className="mmbb-card__heading">
            {title ? <h3 className="mmbb-card__title">{title}</h3> : null}
            {subtitle ? <p className="mmbb-card__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="mmbb-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="mmbb-card__body">{children}</div>
      {footer ? <footer className="mmbb-card__foot">{footer}</footer> : null}
    </T>
  );
}

function PageHeader({ title, subtitle, backLabel, onBack, backHref, badge, actions }) {
  return (
    <div className="mmbb-page-head">
      <div className="mmbb-page-head__text">
        {backLabel && backHref ? <a className="mmbb-page-head__back" href={backHref}><Icon name="arrowLeft" size={16} />{backLabel}</a>
          : backLabel ? <button type="button" className="mmbb-page-head__back" onClick={onBack}><Icon name="arrowLeft" size={16} />{backLabel}</button> : null}
        <h1 className="mmbb-page-head__title">{title}{badge || null}</h1>
        {subtitle ? <p className="mmbb-page-head__sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="mmbb-page-head__actions">{actions}</div> : null}
    </div>
  );
}

const NOTICE_ICON = { info: 'info', success: 'check', warning: 'alert', critical: 'alert' };
function Notice({ tone = 'info', title, children, action, onDismiss }) {
  return (
    <div className={cx('mmbb-notice', 'mmbb-notice--' + tone)} role={tone === 'critical' ? 'alert' : 'status'}>
      <span className="mmbb-notice__icon"><Icon name={NOTICE_ICON[tone]} size={18} strokeWidth={2} /></span>
      <div className="mmbb-notice__body">
        {title ? <p className="mmbb-notice__title">{title}</p> : null}
        {children ? <div className="mmbb-notice__text">{children}</div> : null}
        {action ? <div className="mmbb-notice__action">{action}</div> : null}
      </div>
      {onDismiss ? <button type="button" className="mmbb-notice__close" aria-label="Dismiss" onClick={onDismiss}><Icon name="close" size={16} /></button> : null}
    </div>
  );
}

function EmptyState({ icon = 'box', title, description, action, secondaryAction }) {
  return (
    <div className="mmbb-empty">
      <span className="mmbb-empty__art" aria-hidden="true">
        <span className="mmbb-empty__back" />
        <span className="mmbb-empty__front"><Icon name={icon} size={32} strokeWidth={2} /></span>
      </span>
      {title ? <h3 className="mmbb-empty__title">{title}</h3> : null}
      {description ? <p className="mmbb-empty__desc">{description}</p> : null}
      {action || secondaryAction ? <div className="mmbb-empty__actions">{action}{secondaryAction}</div> : null}
    </div>
  );
}

function Toast({ children, action, onAction, onDismiss, icon = 'check' }) {
  return (
    <div className="mmbb-toast" role="status">
      <span className="mmbb-toast__icon"><Icon name={icon} size={14} strokeWidth={2.75} /></span>
      <span className="mmbb-toast__text">{children}</span>
      {action ? <button type="button" className="mmbb-toast__action" onClick={onAction}>{action}</button> : null}
      {onDismiss ? <button type="button" className="mmbb-toast__close" aria-label="Dismiss" onClick={onDismiss}><Icon name="close" size={16} /></button> : null}
    </div>
  );
}

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
function AdminShell({ active = 'dashboard', onNavigate, nav = ADMIN_NAV, right, children }) {
  return (
    <div className="mmbb-shell">
      <header className="mmbb-shell__bar">
        <div className="mmbb-shell__brand">
          <span className="mmbb-logo-tile" aria-hidden="true"><Icon name="box" size={18} strokeWidth={2.25} /></span>
          <span className="mmbb-shell__name">Mix and Max</span>
          <span className="mmbb-shell__tag">Box Builder</span>
        </div>
        <nav className="mmbb-shell__nav" aria-label="Mix and Max Box Builder">
          {nav.map((n) => (
            <a key={n.id} href={n.href || '#/' + n.id} aria-current={active === n.id ? 'page' : undefined}
              className={cx('mmbb-shell__link', active === n.id && 'is-active')}
              onClick={(e) => { if (onNavigate && !n.href) { e.preventDefault(); onNavigate(n.id); } }}>
              <Icon name={n.icon} size={18} />{n.label}
              {n.count != null ? <span className="mmbb-shell__count">{n.count}</span> : null}
            </a>
          ))}
        </nav>
        <div className="mmbb-shell__right">
          {right !== undefined ? right : <Button variant="ghost" size="sm" icon="help">Help</Button>}
        </div>
      </header>
      <main className="mmbb-shell__main">{children}</main>
    </div>
  );
}

/* ---------------- Data ---------------- */
function Sparkline({ data = [], width = 88, height = 32 }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const x = (i) => 2 + (i * (width - 6)) / (data.length - 1);
  const y = (v) => 3 + (height - 6) - ((v - min) / span) * (height - 6);
  const d = data.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const n = data.length - 1;
  const tail = 'M' + x(n - 1).toFixed(1) + ' ' + y(data[n - 1]).toFixed(1) + ' L' + x(n).toFixed(1) + ' ' + y(data[n]).toFixed(1);
  return (
    <svg className="mmbb-spark" width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true">
      <path d={d} fill="none" style={{ stroke: 'var(--chart-muted)' }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={tail} fill="none" style={{ stroke: 'var(--chart-1)' }} strokeWidth="2" strokeLinecap="round" />
      <circle cx={x(n)} cy={y(data[n])} r="3.5" style={{ fill: 'var(--chart-1)', stroke: 'var(--surface)' }} strokeWidth="2" />
    </svg>
  );
}

function StatCard({ label, value, delta, deltaLabel = 'vs previous period', upIsGood = true, trend, icon }) {
  const dir = delta == null ? 0 : delta > 0 ? 1 : delta < 0 ? -1 : 0;
  const good = dir === 0 ? null : (dir > 0) === upIsGood;
  return (
    <div className="mmbb-stat">
      <div className="mmbb-stat__label">{icon ? <Icon name={icon} size={16} /> : null}{label}</div>
      <div className="mmbb-stat__row">
        <div className="mmbb-stat__value">{value}</div>
        {trend ? <Sparkline data={trend} /> : null}
      </div>
      {delta != null ? (
        <div className="mmbb-stat__delta">
          <span className={cx('mmbb-delta', good === true && 'is-good', good === false && 'is-bad')}>
            <Icon name={dir >= 0 ? 'arrowUp' : 'arrowDown'} size={14} strokeWidth={2.25} />
            <span className="mmbb-sr">{dir >= 0 ? 'Up ' : 'Down '}</span>{Math.abs(delta)}%
          </span>
          <span>{deltaLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function DataTable({ columns = [], rows = [], rowKey = 'id', selectable, selected, defaultSelected = [], onSelectionChange, onRowClick, bulkActions, empty, dense }) {
  const [sel, setSel] = useControlled(selected, defaultSelected, onSelectionChange);
  const all = rows.length > 0 && sel.length === rows.length;
  const some = sel.length > 0 && !all;
  const toggleAll = () => setSel(all ? [] : rows.map((r) => r[rowKey]));
  return (
    <div className="mmbb-table-wrap">
      {selectable && sel.length > 0 ? (
        <div className="mmbb-table__bulk">
          <Checkbox checked={all} indeterminate={some} onChange={toggleAll} label={sel.length + ' selected'} />
          <div className="mmbb-table__bulk-actions">{bulkActions}</div>
        </div>
      ) : null}
      <table className={cx('mmbb-table', dense && 'is-dense')}>
        <thead>
          <tr>
            {selectable ? <th className="mmbb-table__check"><Checkbox aria-label="Select all" checked={all} indeterminate={some} onChange={toggleAll} /></th> : null}
            {columns.map((c) => <th key={c.key} style={{ width: c.width }} className={c.numeric ? 'is-num' : undefined}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="mmbb-table__empty">{empty || 'Nothing here yet.'}</td></tr>
          ) : rows.map((r) => {
            const k = r[rowKey]; const isSel = sel.indexOf(k) !== -1;
            return (
              <tr key={k} className={cx(isSel && 'is-selected', onRowClick && 'is-clickable')} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {selectable ? (
                  <td className="mmbb-table__check" onClick={(e) => e.stopPropagation()}>
                    <Checkbox aria-label={'Select row ' + k} checked={isSel} onChange={() => setSel(isSel ? sel.filter((x) => x !== k) : sel.concat([k]))} />
                  </td>
                ) : null}
                {columns.map((c) => <td key={c.key} className={c.numeric ? 'is-num' : undefined}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LineChart({ series = [], labels = [], height = 240, formatValue = (v) => v, formatTick, yTicks = 4, ariaLabel = 'Line chart', legend }) {
  const ref = useRef(null);
  const w = useWidth(ref, 640);
  const [hover, setHover] = useState(null);
  const pad = { l: 44, r: 12, t: 22, b: 28 };
  const iw = Math.max(10, w - pad.l - pad.r), ih = height - pad.t - pad.b;
  const n = labels.length;
  const scale = niceScale(Math.max(1, ...series.flatMap((s) => s.data)), yTicks);
  const x = (i) => pad.l + (n <= 1 ? 0 : (i * iw) / (n - 1));
  const y = (v) => pad.t + ih - (v / scale.max) * ih;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => scale.step * i);
  const line = (d) => d.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const every = Math.max(1, Math.ceil(n / 7));
  const tickFmt = formatTick || ((v) => formatCompact(v));
  const showLegend = legend !== undefined ? legend : series.length > 1;
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => (h == null ? n - 1 : Math.min(n - 1, h + 1))); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => (h == null ? n - 1 : Math.max(0, h - 1))); }
    if (e.key === 'Escape') setHover(null);
  };
  const hero = series.find((s) => s.label) || null;
  const tipLeft = hover == null ? 0 : x(hover) + 176 > w ? x(hover) - 172 : x(hover) + 12;
  return (
    <div className="mmbb-chart" ref={ref}>
      {showLegend ? (
        <div className="mmbb-legend">
          {series.map((s) => <span key={s.name} className="mmbb-legend__item"><span className="mmbb-legend__line" style={{ background: 'var(--' + (s.color || 'chart-1') + ')' }} />{s.name}</span>)}
        </div>
      ) : null}
      <svg width={w} height={height} role="img" aria-label={ariaLabel} tabIndex={0}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className={i === 0 ? 'mmbb-chart__axis' : 'mmbb-chart__grid'} />
            <text x={pad.l - 8} y={y(t)} className="mmbb-chart__tick" textAnchor="end" dominantBaseline="middle">{tickFmt(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % every === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < every * 0.6) ? (
          <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="mmbb-chart__tick">{l}</text>
        ) : null)}
        {series.map((s, si) => (
          <g key={si}>
            {s.area ? <path d={line(s.data) + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z'} style={{ fill: 'var(--' + (s.color || 'chart-1') + ')' }} opacity="0.1" /> : null}
            <path d={line(s.data)} fill="none" style={{ stroke: 'var(--' + (s.color || 'chart-1') + ')' }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {hover != null ? <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="mmbb-chart__cross" /> : null}
        {series.map((s, si) => {
          const i = hover != null ? hover : n - 1;
          if (hover == null && !s.label) return null;
          return <circle key={si} cx={x(i)} cy={y(s.data[i])} r="4.5" style={{ fill: 'var(--' + (s.color || 'chart-1') + ')', stroke: 'var(--surface)' }} strokeWidth="2" />;
        })}
        {hero && hover == null ? <text x={x(n - 1)} y={y(hero.data[n - 1]) - 12} textAnchor="end" className="mmbb-chart__end">{formatValue(hero.data[n - 1])}</text> : null}
      </svg>
      {hover != null ? (
        <div className="mmbb-chart__tip" style={{ left: tipLeft, top: pad.t + (showLegend ? 30 : 0) }}>
          <div className="mmbb-chart__tip-title">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="mmbb-chart__tip-row">
              <span className="mmbb-chart__key" style={{ background: 'var(--' + (s.color || 'chart-1') + ')' }} />
              <strong>{formatValue(s.data[hover])}</strong><span>{s.name}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mmbb-sr"><table>
        <caption>{ariaLabel}</caption>
        <thead><tr><th>Date</th>{series.map((s) => <th key={s.name}>{s.name}</th>)}</tr></thead>
        <tbody>{labels.map((l, i) => <tr key={i}><td>{l}</td>{series.map((s) => <td key={s.name}>{formatValue(s.data[i])}</td>)}</tr>)}</tbody>
      </table></div>
    </div>
  );
}

function BarList({ items = [], formatValue = (v) => v, color = 'chart-1', max }) {
  const m = max || Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="mmbb-barlist">
      {items.map((it) => (
        <li key={it.label} className="mmbb-barlist__row" tabIndex={0} title={it.label + ': ' + formatValue(it.value)}>
          <span className="mmbb-barlist__label">{it.label}{it.meta ? <span className="mmbb-barlist__meta">{it.meta}</span> : null}</span>
          <span className="mmbb-barlist__value">{formatValue(it.value)}</span>
          <span className="mmbb-barlist__bar"><span className="mmbb-barlist__fill" style={{ width: Math.max(1, (it.value / m) * 100) + '%', background: 'var(--' + color + ')' }} /></span>
        </li>
      ))}
    </ul>
  );
}

function FunnelChart({ steps = [], formatValue = (v) => Number(v).toLocaleString('en-US') }) {
  const first = steps[0] ? steps[0].value || 1 : 1;
  return (
    <ol className="mmbb-funnel">
      {steps.map((s, i) => {
        const pct = (s.value / first) * 100;
        const prev = i > 0 ? steps[i - 1].value : null;
        return (
          <li key={s.label} className="mmbb-funnel__item">
            {prev != null ? <div className="mmbb-funnel__drop"><Icon name="arrowDown" size={12} strokeWidth={2.25} />{Math.round((s.value / prev) * 100)}% continued</div> : null}
            <div className="mmbb-funnel__step" tabIndex={0} title={s.label + ': ' + formatValue(s.value)}>
              <span className="mmbb-funnel__label">{s.label}{s.sub ? <span className="mmbb-funnel__sub">{s.sub}</span> : null}</span>
              <span className="mmbb-funnel__track"><span className="mmbb-funnel__fill" style={{ width: Math.max(0.5, pct) + '%' }} /></span>
              <span className="mmbb-funnel__value">{formatValue(s.value)}<span className="mmbb-funnel__pct">{pct.toFixed(pct < 10 ? 1 : 0)}% of start</span></span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ProgressBar({ value = 0, max = 100, label, valueLabel, tone = 'ink', size = 'md' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cx('mmbb-progress', 'mmbb-progress--' + tone, 'mmbb-progress--' + size)}>
      {label || valueLabel ? <div className="mmbb-progress__head"><span>{label}</span><span className="mmbb-progress__value">{valueLabel}</span></div> : null}
      <div className="mmbb-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={typeof label === 'string' ? label : 'Progress'}>
        <div className="mmbb-progress__fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

/* ---------------- Storefront ---------------- */
/* Placeholder product art: shown when a WooCommerce product has no image. Fixed illustration
   colours (they are pictures, not UI) so they read the same in both themes. */
const ART = {
  cookie: { bg: '#f3e3cc', el: [['circle', { cx: 50, cy: 52, r: 27, fill: '#c98a4b' }], ['circle', { cx: 41, cy: 44, r: 3.5, fill: '#5a3519' }], ['circle', { cx: 58, cy: 47, r: 3, fill: '#5a3519' }], ['circle', { cx: 47, cy: 60, r: 3.5, fill: '#5a3519' }], ['circle', { cx: 61, cy: 61, r: 2.5, fill: '#5a3519' }], ['circle', { cx: 37, cy: 56, r: 2.2, fill: '#5a3519' }]] },
  macaron: { bg: '#f6dfe6', el: [['rect', { x: 26, y: 33, width: 48, height: 16, rx: 8, fill: '#e88aa6' }], ['rect', { x: 29, y: 47, width: 42, height: 8, rx: 4, fill: '#fff3e8' }], ['rect', { x: 26, y: 53, width: 48, height: 16, rx: 8, fill: '#e88aa6' }]] },
  candle: { bg: '#e5ece4', el: [['rect', { x: 33, y: 38, width: 34, height: 36, rx: 6, fill: '#f7f3ea' }], ['rect', { x: 33, y: 52, width: 34, height: 10, fill: '#7d9a7a' }], ['rect', { x: 49, y: 30, width: 2, height: 9, fill: '#3b3b3b' }], ['path', { d: 'M50 17c4 5 5 8 5 10a5 5 0 0 1-10 0c0-2 1-5 5-10z', fill: '#f2a541' }]] },
  soap: { bg: '#e4ecf2', el: [['rect', { x: 24, y: 36, width: 52, height: 30, rx: 12, fill: '#a9c6dc' }], ['rect', { x: 32, y: 42, width: 22, height: 6, rx: 3, fill: '#d6e6f1' }]] },
  tea: { bg: '#efe8d8', el: [['rect', { x: 34, y: 30, width: 32, height: 44, rx: 4, fill: '#3f6b5c' }], ['rect', { x: 32, y: 26, width: 36, height: 9, rx: 3, fill: '#2f5246' }], ['rect', { x: 34, y: 46, width: 32, height: 14, fill: '#e8d9b5' }]] },
  donut: { bg: '#fbe6d4', el: [['circle', { cx: 50, cy: 52, r: 26, fill: '#e2a86b' }], ['circle', { cx: 50, cy: 50, r: 22, fill: '#d9577a' }], ['circle', { cx: 50, cy: 50, r: 8, fill: '#fbe6d4' }], ['rect', { x: 36, y: 38, width: 7, height: 2.5, rx: 1.2, fill: '#fff3e8', transform: 'rotate(-30 39 39)' }], ['rect', { x: 58, y: 40, width: 7, height: 2.5, rx: 1.2, fill: '#ffd23f', transform: 'rotate(40 61 41)' }], ['rect', { x: 55, y: 60, width: 7, height: 2.5, rx: 1.2, fill: '#fff3e8', transform: 'rotate(-10 58 61)' }], ['rect', { x: 37, y: 58, width: 7, height: 2.5, rx: 1.2, fill: '#ffd23f', transform: 'rotate(25 40 59)' }]] },
  chocolate: { bg: '#eadcd2', el: [['rect', { x: 28, y: 28, width: 44, height: 46, rx: 4, fill: '#6b3e26' }], ['path', { d: 'M28 43.3h44M28 58.6h44M42.7 28v46M57.3 28v46', stroke: '#4e2b19', strokeWidth: 2 }]] },
  honey: { bg: '#fbefd0', el: [['rect', { x: 32, y: 36, width: 36, height: 38, rx: 8, fill: '#e6a52c' }], ['rect', { x: 34, y: 28, width: 32, height: 10, rx: 3, fill: '#6b4a1f' }], ['rect', { x: 38, y: 48, width: 24, height: 14, rx: 3, fill: '#fff7e0' }]] },
};
function ProductArt({ kind = 'cookie', label, className }) {
  const a = ART[kind] || ART.cookie;
  return (
    <span className={cx('mmbb-art', className)} style={{ background: a.bg }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 100 100">{a.el.map((e, i) => React.createElement(e[0], Object.assign({ key: i }, e[1])))}</svg>
    </span>
  );
}
ProductArt.kinds = Object.keys(ART);

function Media({ image, art, name }) {
  return image ? <img src={image} alt={name || ''} loading="lazy" /> : <ProductArt kind={art} />;
}

function ProductTile({ name, price, compareAt, image, art, badge, badgeTone = 'deal', meta, stock, qty = 0, onAdd, onChange, boxFull, currency = '$' }) {
  const inBox = qty > 0; const out = stock === 0;
  return (
    <article className={cx('mmbb-tile', inBox && 'is-in-box', out && 'is-out')}>
      <div className="mmbb-tile__media">
        <Media image={image} art={art} name={name} />
        {badge ? <span className="mmbb-tile__badge">{badgeTone === 'deal' ? <Sticker size="sm">{badge}</Sticker> : <Badge tone={badgeTone}>{badge}</Badge>}</span> : null}
        {inBox ? <span className="mmbb-tile__count" aria-label={qty + ' in your box'}>{qty}×</span> : null}
      </div>
      <div className="mmbb-tile__body">
        <h4 className="mmbb-tile__name">{name}</h4>
        {meta ? <p className="mmbb-tile__meta">{meta}</p> : null}
        <div className="mmbb-tile__price">
          <span>{formatMoney(price, currency)}</span>
          {compareAt ? <s aria-label={'Was ' + formatMoney(compareAt, currency)}>{formatMoney(compareAt, currency)}</s> : null}
        </div>
        {stock != null && stock > 0 && stock <= 5 ? <p className="mmbb-tile__stock"><Icon name="flame" size={14} strokeWidth={2} />Only {stock} left</p> : null}
      </div>
      <div className="mmbb-tile__action">
        {out ? <Button fullWidth disabled>Sold out</Button>
          : inBox ? <QuantityStepper value={qty} onChange={onChange} max={boxFull ? qty : 99} fullWidth label={'Quantity of ' + name} />
            : <Button variant="primary" fullWidth icon={boxFull ? undefined : 'plus'} onClick={onAdd} disabled={boxFull}>{boxFull ? 'Box is full' : 'Add to box'}</Button>}
      </div>
    </article>
  );
}

function BoxSlots({ size = 6, items = [], onRemove, columns }) {
  const cols = columns || (size <= 4 ? size : size <= 6 ? 3 : size <= 9 ? 3 : 4);
  const slots = Array.from({ length: size }, (_, i) => items[i]);
  return (
    <ol className="mmbb-slots" style={{ gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))' }} aria-label={'Box: ' + Math.min(items.length, size) + ' of ' + size + ' filled'}>
      {slots.map((it, i) => (
        <li key={i} className={cx('mmbb-slot', it && 'is-filled')}>
          {it ? (
            <>
              <span className="mmbb-slot__media"><Media image={it.image} art={it.art} name={it.name} /></span>
              {onRemove ? <button type="button" className="mmbb-slot__remove" aria-label={'Remove ' + (it.name || 'item')} onClick={() => onRemove(i, it)}><Icon name="close" size={12} strokeWidth={2.75} /></button> : null}
            </>
          ) : <span className="mmbb-slot__num">{i + 1}</span>}
        </li>
      ))}
    </ol>
  );
}

function TierProgress({ count = 0, tiers = [], size, compact, inverse }) {
  const sorted = tiers.slice().sort((a, b) => a.qty - b.qty);
  const top = size || (sorted.length ? sorted[sorted.length - 1].qty : 1);
  const next = sorted.find((t) => count < t.qty);
  const reached = sorted.filter((t) => count >= t.qty);
  const best = reached[reached.length - 1];
  const pct = Math.min(100, (count / top) * 100);
  return (
    <div className={cx('mmbb-tier', compact && 'is-compact', inverse && 'is-inverse', !next && sorted.length && 'is-max')}>
      <p className="mmbb-tier__msg" aria-live="polite">
        {next ? (
          <>{best ? <span className="mmbb-tier__got"><Icon name="check" size={14} strokeWidth={2.75} />{best.label} unlocked.</span> : null}
            <span>Add <b>{next.qty - count} more</b> to get <b className="mmbb-tier__hl">{next.label}</b></span></>
        ) : best ? (
          <><Icon name="sparkle" size={16} strokeWidth={2} /><span>You unlocked <b className="mmbb-tier__hl">{best.label}</b>. That&rsquo;s the max deal.</span></>
        ) : null}
      </p>
      <div className="mmbb-tier__track" role="progressbar" aria-valuemin={0} aria-valuemax={top} aria-valuenow={Math.min(count, top)} aria-label="Items in box">
        <div className="mmbb-tier__fill" style={{ width: pct + '%' }} />
        {sorted.map((t) => <span key={t.qty} className={cx('mmbb-tier__mark', count >= t.qty && 'is-hit')} style={{ left: (t.qty / top) * 100 + '%' }} />)}
      </div>
      {!compact ? (
        <div className="mmbb-tier__legend">
          {sorted.map((t) => (
            <span key={t.qty} className={count >= t.qty ? 'is-hit' : undefined}>
              {count >= t.qty ? <Icon name="check" size={12} strokeWidth={3} /> : null}{t.qty} items · {t.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BoxSizePicker({ sizes = [], value, defaultValue, onChange, layout = 'cards', currency = '$', name }) {
  const auto = useId();
  const [v, set] = useControlled(value, defaultValue !== undefined ? defaultValue : sizes[0] && sizes[0].qty, onChange);
  return (
    <div className={cx('mmbb-sizes', 'mmbb-sizes--' + layout)} role="radiogroup" aria-label="Box size">
      {sizes.map((s) => (
        <label key={s.qty} className={cx('mmbb-size', v === s.qty && 'is-selected')}>
          <input type="radio" className="mmbb-sr" name={name || auto} value={s.qty} checked={v === s.qty} onChange={() => set(s.qty)} />
          {s.tag ? <Sticker size="sm" tilt className="mmbb-size__tag">{s.tag}</Sticker> : null}
          <span className="mmbb-size__qty">{s.qty}</span>
          <span className="mmbb-size__unit">{s.unit || 'items'}</span>
          {s.price != null ? <span className="mmbb-size__price">{layout === 'cards' && s.from !== false ? 'from ' : ''}{formatMoney(s.price, currency)}</span> : null}
          {s.save ? <span className="mmbb-size__save">Save {s.save}</span> : null}
          <span className="mmbb-size__check" aria-hidden="true"><Icon name="check" size={14} strokeWidth={2.75} /></span>
        </label>
      ))}
    </div>
  );
}

function BoxPanel({ title = 'Your box', size = 6, items = [], tiers = [], subtotal = 0, total = 0, currency = '$', minItems, onRemove, onCheckout, ctaHref, ctaLabel = 'Add box to cart', footnote, children }) {
  const count = items.length; const need = (minItems != null ? minItems : size) - count;
  const savings = subtotal - total;
  return (
    <aside className="mmbb-panel" aria-label={title}>
      <header className="mmbb-panel__head"><h3>{title}</h3><span className="mmbb-panel__count">{count}/{size}</span></header>
      <BoxSlots size={size} items={items} onRemove={onRemove} />
      {tiers.length ? <TierProgress count={count} tiers={tiers} size={size} /> : null}
      {children}
      <dl className="mmbb-panel__sum">
        <div><dt>Subtotal</dt><dd>{formatMoney(subtotal, currency)}</dd></div>
        {savings > 0.004 ? <div className="is-save"><dt>Box discount</dt><dd>&minus;{formatMoney(savings, currency)}</dd></div> : null}
        <div className="is-total"><dt>Total</dt><dd>{formatMoney(total, currency)}</dd></div>
      </dl>
      <Button variant="max" size="lg" fullWidth disabled={need > 0} onClick={onCheckout} href={ctaHref} iconRight={need > 0 ? undefined : 'arrowRight'}>
        {need > 0 ? 'Add ' + need + ' more to continue' : ctaLabel}
      </Button>
      {footnote ? <p className="mmbb-panel__foot">{footnote}</p> : null}
    </aside>
  );
}

function BoxSummaryBar({ size = 6, items = [], tiers = [], total = 0, compareAt, currency = '$', minItems, onOpen, openHref, onCheckout, ctaHref, ctaLabel = 'Add to cart' }) {
  const count = items.length; const need = (minItems != null ? minItems : size) - count;
  const summary = (
    <>
      <span className="mmbb-bar__thumbs" aria-hidden="true">
        {Array.from({ length: Math.min(size, 4) }, (_, i) => <span key={i} className="mmbb-bar__thumb">{items[i] ? <Media image={items[i].image} art={items[i].art} /> : null}</span>)}
      </span>
      <span className="mmbb-bar__count"><b>{count}/{size}</b>in your box</span>
      <Icon name="chevronUp" size={18} className="mmbb-bar__chev" />
    </>
  );
  const label = 'Your box, ' + count + ' of ' + size + '. Open details';
  return (
    <div className="mmbb-bar" role="region" aria-label="Your box">
      <div className="mmbb-bar__inner">
        {openHref ? <a className="mmbb-bar__summary" href={openHref} aria-label={label}>{summary}</a>
          : <button type="button" className="mmbb-bar__summary" onClick={onOpen} aria-label={label}>{summary}</button>}
        {tiers.length ? <div className="mmbb-bar__tier"><TierProgress count={count} tiers={tiers} size={size} compact inverse /></div> : <span />}
        <div className="mmbb-bar__total">
          {compareAt && compareAt > total ? <s>{formatMoney(compareAt, currency)}</s> : null}
          <b>{formatMoney(total, currency)}</b>
        </div>
        <Button variant="max" size="lg" onClick={onCheckout} href={ctaHref} disabled={need > 0}>{need > 0 ? need + ' to go' : ctaLabel}</Button>
      </div>
    </div>
  );
}

function Countdown({ seconds, endsAt, label = 'Deal ends in', tone = 'pop' }) {
  const target = useMemo(() => (endsAt ? new Date(endsAt).getTime() : Date.now() + (seconds || 0) * 1000), [endsAt, seconds]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); const sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return (
    <div className={cx('mmbb-countdown', 'mmbb-countdown--' + tone)} role="timer" aria-live="off">
      <Icon name="clock" size={16} strokeWidth={2} />
      <span className="mmbb-countdown__label">{label}</span>
      <span className="mmbb-countdown__units">
        {d > 0 ? <span><b>{d}</b>d</span> : null}<span><b>{p(h)}</b>h</span><span><b>{p(m)}</b>m</span><span><b>{p(sec)}</b>s</span>
      </span>
    </div>
  );
}

/* ---------------- export ---------------- */
const MixMax = {
  Icon, Button, Badge, Sticker,
  TextField, SelectField, Toggle, Checkbox, ChoiceCard, QuantityStepper, SegmentedControl, Chips,
  Tabs, Steps, Card, PageHeader, Notice, EmptyState, Toast, AdminShell,
  StatCard, Sparkline, DataTable, LineChart, BarList, FunnelChart, ProgressBar,
  ProductArt, ProductTile, BoxSlots, TierProgress, BoxSizePicker, BoxPanel, BoxSummaryBar, Countdown,
  utils: { cx, formatMoney, formatCompact },
};
window.MixMax = Object.assign(window.MixMax || {}, MixMax);
