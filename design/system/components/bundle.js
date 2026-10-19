/* @ds-bundle: {"format":4,"namespace":"MixMax","components":[{"name":"Icon"},{"name":"Button"},{"name":"Badge"},{"name":"Sticker"},{"name":"TextField"},{"name":"SelectField"},{"name":"Toggle"},{"name":"Checkbox"},{"name":"ChoiceCard"},{"name":"QuantityStepper"},{"name":"SegmentedControl"},{"name":"Chips"},{"name":"Tabs"},{"name":"Steps"},{"name":"Card"},{"name":"PageHeader"},{"name":"Notice"},{"name":"EmptyState"},{"name":"Toast"},{"name":"AdminShell"},{"name":"StatCard"},{"name":"DataTable"},{"name":"LineChart"},{"name":"BarList"},{"name":"FunnelChart"},{"name":"ProgressBar"},{"name":"ProductArt"},{"name":"ProductTile"},{"name":"BoxSlots"},{"name":"TierProgress"},{"name":"BoxSizePicker"},{"name":"BoxPanel"},{"name":"BoxSummaryBar"},{"name":"Countdown"}]} */
(() => {
  // ds/project/components/src/index.jsx
  var React = window.React;
  var { useState, useEffect, useRef, useMemo, useId } = React;
  var cx = (...a) => a.filter(Boolean).join(" ");
  function formatMoney(n, currency = "$") {
    const v = Number(n || 0);
    return currency + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatCompact(n, prefix = "") {
    const v = Number(n || 0), a = Math.abs(v);
    if (a >= 1e6) return prefix + (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return prefix + (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
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
    const isCtl = value !== void 0;
    const v = isCtl ? value : inner;
    const set = (n) => {
      if (!isCtl) setInner(n);
      if (onChange) onChange(n);
    };
    return [v, set];
  }
  function useWidth(ref, fallback) {
    const [w, setW] = useState(fallback);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      if (el.clientWidth) setW(el.clientWidth);
      if (typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver((es) => {
        const cw = es[0].contentRect.width;
        if (cw > 0) setW(cw);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    return w;
  }
  var dot = (x, y) => ({ d: [x, y] });
  var circ = (x, y, r) => ({ c: [x, y, r] });
  var ICONS = {
    box: ["M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z", "M3 7.5l9 4.5 9-4.5", "M12 12v9", "M7.5 5.25l9 4.5"],
    dashboard: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 10h7v10h-7z", "M4 13h7v7H4z"],
    campaign: ["M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1z", "M18 9a4 4 0 0 1 0 6", "M7.5 15l1.5 5h2"],
    analytics: ["M4 20h16", "M6 16v-5", "M11 16V6", "M16 16v-8"],
    settings: ["M4 7h9", "M19 7h1", "M4 17h3", "M13 17h7", circ(16, 7, 2.5), circ(10, 17, 2.5)],
    plus: ["M12 5v14", "M5 12h14"],
    minus: ["M5 12h14"],
    check: ["M5 12.5l4.5 4.5L19 7.5"],
    close: ["M6 6l12 12", "M18 6L6 18"],
    gift: ["M4 11h16v9H4z", "M3 7h18v4H3z", "M12 7v13", "M12 7C10.5 4 7 3.5 7 5.5S9.5 7 12 7z", "M12 7c1.5-3 5-3.5 5-1.5S14.5 7 12 7z"],
    clock: [circ(12, 12, 9), "M12 7v5l3 2"],
    flame: ["M12 21c-3.9 0-7-2.6-7-6.4 0-2.8 1.8-4.7 3.4-6.4.3 1.6 1.2 2.6 2.4 3.1C10.9 7.6 12.4 5 14.4 3c.5 3 5.6 5.4 5.6 11.1 0 4.2-3.6 6.9-8 6.9z"],
    tag: ["M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z", circ(7.5, 7.5, 1.5)],
    truck: ["M3 6h11v10H3z", "M14 9h4l3 3v4h-7", circ(7, 18, 2), circ(17, 18, 2)],
    arrowUp: ["M12 19V5", "M6 11l6-6 6 6"],
    arrowDown: ["M12 5v14", "M6 13l6 6 6-6"],
    arrowRight: ["M5 12h14", "M13 6l6 6-6 6"],
    arrowLeft: ["M19 12H5", "M11 6l-6 6 6 6"],
    chevronDown: ["M6 9l6 6 6-6"],
    chevronUp: ["M6 15l6-6 6 6"],
    chevronRight: ["M9 6l6 6-6 6"],
    chevronLeft: ["M15 6l-6 6 6 6"],
    search: [circ(11, 11, 7), "M20 20l-4-4"],
    trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13", "M10 11v6", "M14 11v6"],
    copy: ["M8 8h12v12H8z", "M16 8V4H4v12h4"],
    eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", circ(12, 12, 3)],
    edit: ["M4 20h4L19 9l-4-4L4 16z", "M13 7l4 4"],
    grip: [dot(9, 6), dot(15, 6), dot(9, 12), dot(15, 12), dot(9, 18), dot(15, 18)],
    more: [dot(5, 12), dot(12, 12), dot(19, 12)],
    info: [circ(12, 12, 9), "M12 11v6", "M12 7.5v.5"],
    alert: ["M12 3.5l9.5 16.5h-19z", "M12 10v4.5", "M12 17.25v.25"],
    lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
    sparkle: ["M12 3l1.9 7.1L21 12l-7.1 1.9L12 21l-1.9-7.1L3 12l7.1-1.9z"],
    external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v6H4V6h6"],
    calendar: ["M4 6h16v14H4z", "M4 10h16", "M8 3v5", "M16 3v5"],
    filter: ["M4 5h16", "M7 12h10", "M10 19h4"],
    image: ["M4 5h16v14H4z", "M4 16l5-5 4 4 3-3 4 4", circ(15.5, 9, 1.5)],
    bolt: ["M13 3L5 13h6l-1 8 8-10h-6z"],
    users: [circ(9, 8, 3.5), "M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5", "M16 4.5a3.5 3.5 0 0 1 0 7", "M18.5 14.5c1.8.8 2.8 2.6 3.2 5.5"],
    cart: ["M3 4h2.5l2.2 11h10.6l2-8H6.3", circ(9, 19.5, 1.5), circ(17, 19.5, 1.5)],
    store: ["M4 9l1.5-5h13L20 9", "M5 11v9h14v-9", "M4 9a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0A2.67 2.67 0 0 0 20 9", "M10 20v-5h4v5"],
    palette: ["M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.1-1-1.4-1-2.4 0-.9.8-1.5 1.9-1.5H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3z", dot(7.5, 11.5), dot(9.5, 7.5), dot(14.5, 7.5)],
    mail: ["M3 6h18v12H3z", "M3 7l9 6 9-6"],
    key: [circ(8, 15, 4), "M11 12l9-9", "M17 6l3 3", "M14 9l2 2"],
    code: ["M8 7l-5 5 5 5", "M16 7l5 5-5 5"],
    percent: ["M19 5L5 19", circ(7, 7, 2.5), circ(17, 17, 2.5)],
    refresh: ["M20 11a8 8 0 0 0-14.9-3", "M4 4v4h4", "M4 13a8 8 0 0 0 14.9 3", "M20 20v-4h-4"],
    download: ["M12 4v11", "M7 10l5 5 5-5", "M4 20h16"],
    layers: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5"],
    help: [circ(12, 12, 9), "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7", "M12 17v.5"]
  };
  function Icon({ name, size = 20, strokeWidth = 1.75, title, className, ...rest }) {
    const parts = ICONS[name] || ICONS.box;
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: size,
        height: size,
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: cx("mmbb-icon", className),
        "aria-hidden": title ? void 0 : true,
        role: title ? "img" : void 0,
        focusable: "false",
        ...rest
      },
      title ? /* @__PURE__ */ React.createElement("title", null, title) : null,
      parts.map((p, i) => typeof p === "string" ? /* @__PURE__ */ React.createElement("path", { key: i, d: p }) : p.c ? /* @__PURE__ */ React.createElement("circle", { key: i, cx: p.c[0], cy: p.c[1], r: p.c[2] }) : /* @__PURE__ */ React.createElement("circle", { key: i, cx: p.d[0], cy: p.d[1], r: 1.4, fill: "currentColor", stroke: "none" }))
    );
  }
  Icon.names = Object.keys(ICONS);
  function Button({ variant = "secondary", size = "md", icon, iconRight, loading, fullWidth, className, children, type = "button", disabled, href, ...rest }) {
    const iconOnly = icon && !children;
    const is = size === "lg" ? 20 : size === "sm" ? 16 : 18;
    const cls = cx("mmbb-btn", "mmbb-btn--" + variant, "mmbb-btn--" + size, fullWidth && "mmbb-btn--full", iconOnly && "mmbb-btn--icon", loading && "is-loading", className);
    const inner = /* @__PURE__ */ React.createElement(React.Fragment, null, loading ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-spinner", "aria-hidden": "true" }) : icon ? /* @__PURE__ */ React.createElement(Icon, { name: icon, size: is }) : null, children ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-btn__label" }, children) : null, iconRight ? /* @__PURE__ */ React.createElement(Icon, { name: iconRight, size: is, className: "mmbb-btn__trail" }) : null);
    if (href) {
      const off = disabled || loading;
      return /* @__PURE__ */ React.createElement("a", { ...rest, href: off ? void 0 : href, "aria-disabled": off || void 0, className: cls }, inner);
    }
    return /* @__PURE__ */ React.createElement("button", { type, ...rest, disabled: disabled || loading, "aria-busy": loading || void 0, className: cls }, inner);
  }
  function Badge({ tone = "neutral", icon, dot: withDot, children, className }) {
    return /* @__PURE__ */ React.createElement("span", { className: cx("mmbb-badge", "mmbb-badge--" + tone, className) }, withDot ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-badge__dot", "aria-hidden": "true" }) : null, icon ? /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 14, strokeWidth: 2 }) : null, children);
  }
  function Sticker({ tone = "pop", size = "md", tilt, icon, children, className }) {
    return /* @__PURE__ */ React.createElement("span", { className: cx("mmbb-sticker", "mmbb-sticker--" + tone, "mmbb-sticker--" + size, tilt && "is-tilted", className) }, icon ? /* @__PURE__ */ React.createElement(Icon, { name: icon, size: size === "lg" ? 20 : size === "sm" ? 12 : 15, strokeWidth: 2.25 }) : null, children);
  }
  function TextField({ label, help, error, prefix, suffix, multiline, id, className, rows, ...rest }) {
    const auto = useId();
    const fid = id || auto;
    const descId = help || error ? fid + "-desc" : void 0;
    const Tag = multiline ? "textarea" : "input";
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-field", error && "has-error", className) }, label ? /* @__PURE__ */ React.createElement("label", { className: "mmbb-field__label", htmlFor: fid }, label) : null, /* @__PURE__ */ React.createElement("div", { className: "mmbb-input" }, prefix ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-input__affix" }, typeof prefix === "string" && ICONS[prefix] ? /* @__PURE__ */ React.createElement(Icon, { name: prefix, size: 18 }) : prefix) : null, /* @__PURE__ */ React.createElement(Tag, { id: fid, "aria-invalid": error ? true : void 0, "aria-describedby": descId, rows: multiline ? rows || 3 : void 0, ...rest }), suffix ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-input__affix" }, suffix) : null), error || help ? /* @__PURE__ */ React.createElement("p", { id: descId, className: cx("mmbb-field__help", error && "is-error") }, error ? /* @__PURE__ */ React.createElement(Icon, { name: "alert", size: 14, strokeWidth: 2 }) : null, error || help) : null);
  }
  function SelectField({ label, help, options = [], id, className, ...rest }) {
    const auto = useId();
    const fid = id || auto;
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-field", className) }, label ? /* @__PURE__ */ React.createElement("label", { className: "mmbb-field__label", htmlFor: fid }, label) : null, /* @__PURE__ */ React.createElement("div", { className: "mmbb-input mmbb-input--select" }, /* @__PURE__ */ React.createElement("select", { id: fid, "aria-describedby": help ? fid + "-desc" : void 0, ...rest }, options.map((o) => {
      const v = typeof o === "string" ? o : o.value;
      const l = typeof o === "string" ? o : o.label;
      return /* @__PURE__ */ React.createElement("option", { key: v, value: v }, l);
    })), /* @__PURE__ */ React.createElement(Icon, { name: "chevronDown", size: 16 })), help ? /* @__PURE__ */ React.createElement("p", { id: fid + "-desc", className: "mmbb-field__help" }, help) : null);
  }
  function Toggle({ checked, defaultChecked = false, onChange, label, description, disabled, id }) {
    const auto = useId();
    const fid = id || auto;
    const [on, setOn] = useControlled(checked, defaultChecked, onChange);
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-toggle", disabled && "is-disabled") }, label || description ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-toggle__text" }, label ? /* @__PURE__ */ React.createElement("label", { id: fid + "-l", htmlFor: fid, className: "mmbb-toggle__label" }, label) : null, description ? /* @__PURE__ */ React.createElement("p", { id: fid + "-d", className: "mmbb-toggle__desc" }, description) : null) : null, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "switch",
        id: fid,
        "aria-checked": !!on,
        disabled,
        "aria-labelledby": label ? fid + "-l" : void 0,
        "aria-describedby": description ? fid + "-d" : void 0,
        className: "mmbb-toggle__switch",
        onClick: () => setOn(!on)
      },
      /* @__PURE__ */ React.createElement("span", { className: "mmbb-toggle__knob" })
    ));
  }
  function Checkbox({ checked, defaultChecked, onChange, label, description, indeterminate, disabled, className, ...rest }) {
    const ref = useRef(null);
    useEffect(() => {
      if (ref.current) ref.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    return /* @__PURE__ */ React.createElement("label", { className: cx("mmbb-check", disabled && "is-disabled", className) }, /* @__PURE__ */ React.createElement(
      "input",
      {
        ref,
        type: "checkbox",
        checked,
        defaultChecked,
        disabled,
        onChange: (e) => onChange && onChange(e.target.checked, e),
        ...rest
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "mmbb-check__box", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 14, strokeWidth: 2.75 })), label || description ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-check__text" }, label, description ? /* @__PURE__ */ React.createElement("small", null, description) : null) : null);
  }
  function ChoiceCard({ selected, onSelect, title, description, meta, tag, icon, name, value, disabled, children, className }) {
    return /* @__PURE__ */ React.createElement("label", { className: cx("mmbb-choice", selected && "is-selected", disabled && "is-disabled", className) }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "radio",
        className: "mmbb-sr",
        name,
        value,
        checked: !!selected,
        disabled,
        onChange: () => onSelect && onSelect(value)
      }
    ), tag ? /* @__PURE__ */ React.createElement(Sticker, { size: "sm", tilt: true, className: "mmbb-choice__tag" }, tag) : null, icon ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-choice__icon" }, /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 22 })) : null, /* @__PURE__ */ React.createElement("span", { className: "mmbb-choice__body" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-choice__title" }, title), description ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-choice__desc" }, description) : null, children), meta ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-choice__meta" }, meta) : null, /* @__PURE__ */ React.createElement("span", { className: "mmbb-choice__radio", "aria-hidden": "true" }));
  }
  function QuantityStepper({ value, defaultValue = 0, min = 0, max = 99, onChange, size = "md", fullWidth, label = "Quantity", className }) {
    const [v, set] = useControlled(value, defaultValue, onChange);
    const clamp = (n) => set(Math.max(min, Math.min(max, n)));
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-stepper", "mmbb-stepper--" + size, fullWidth && "mmbb-stepper--full", className), role: "group", "aria-label": label }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => clamp(v - 1), disabled: v <= min, "aria-label": v === 1 && min === 0 ? "Remove" : "Decrease" }, /* @__PURE__ */ React.createElement(Icon, { name: v === 1 && min === 0 ? "trash" : "minus", size: 16, strokeWidth: 2 })), /* @__PURE__ */ React.createElement("output", { "aria-live": "polite" }, v), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => clamp(v + 1), disabled: v >= max, "aria-label": "Increase" }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16, strokeWidth: 2 })));
  }
  function SegmentedControl({ options = [], value, defaultValue, onChange, size = "md", label, fullWidth }) {
    const first = options[0] && (options[0].value !== void 0 ? options[0].value : options[0]);
    const [v, set] = useControlled(value, defaultValue !== void 0 ? defaultValue : first, onChange);
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-seg", "mmbb-seg--" + size, fullWidth && "mmbb-seg--full"), role: "radiogroup", "aria-label": label }, options.map((o) => {
      const ov = o.value !== void 0 ? o.value : o;
      const ol = o.label !== void 0 ? o.label : o;
      return /* @__PURE__ */ React.createElement("button", { key: ov, type: "button", role: "radio", "aria-checked": v === ov, onClick: () => set(ov) }, o.icon ? /* @__PURE__ */ React.createElement(Icon, { name: o.icon, size: 16 }) : null, ol);
    }));
  }
  function Chips({ options = [], value, defaultValue, onChange, label }) {
    const first = options[0] && (options[0].value !== void 0 ? options[0].value : options[0]);
    const [v, set] = useControlled(value, defaultValue !== void 0 ? defaultValue : first, onChange);
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-chips", role: "radiogroup", "aria-label": label }, options.map((o) => {
      const ov = o.value !== void 0 ? o.value : o;
      const ol = o.label !== void 0 ? o.label : o;
      return /* @__PURE__ */ React.createElement("button", { key: ov, type: "button", role: "radio", "aria-checked": v === ov, className: "mmbb-chip", onClick: () => set(ov) }, ol, o.count != null ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-chip__count" }, o.count) : null);
    }));
  }
  function Tabs({ tabs = [], value, defaultValue, onChange, label }) {
    const [v, set] = useControlled(value, defaultValue !== void 0 ? defaultValue : tabs[0] && tabs[0].id, onChange);
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-tabs", role: "tablist", "aria-label": label }, tabs.map((t) => /* @__PURE__ */ React.createElement("button", { key: t.id, type: "button", role: "tab", "aria-selected": v === t.id, className: "mmbb-tab", onClick: () => set(t.id) }, t.label, t.count != null ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-tab__count" }, t.count) : null)));
  }
  function Steps({ steps = [], current = 0, onStep, compact }) {
    return /* @__PURE__ */ React.createElement("ol", { className: cx("mmbb-steps", compact && "mmbb-steps--compact") }, steps.map((s, i) => {
      const state = i < current ? "is-done" : i === current ? "is-current" : "is-next";
      const label = s && typeof s === "object" && !React.isValidElement(s) ? s.label : s;
      const href = s && typeof s === "object" && !React.isValidElement(s) ? s.href : void 0;
      const inner = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "mmbb-step__dot" }, i < current ? /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 14, strokeWidth: 2.75 }) : i + 1), /* @__PURE__ */ React.createElement("span", { className: "mmbb-step__label" }, label));
      return /* @__PURE__ */ React.createElement("li", { key: i, className: cx("mmbb-step", state), "aria-current": i === current ? "step" : void 0 }, href ? /* @__PURE__ */ React.createElement("a", { className: "mmbb-step__btn", href }, inner) : onStep ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "mmbb-step__btn", onClick: () => onStep(i) }, inner) : inner, i < steps.length - 1 ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-step__line", "aria-hidden": "true" }) : null);
    }));
  }
  function Card({ title, subtitle, actions, footer, children, padding = "md", className, as = "section" }) {
    const T = as;
    return /* @__PURE__ */ React.createElement(T, { className: cx("mmbb-card", "mmbb-card--pad-" + padding, className) }, title || actions ? /* @__PURE__ */ React.createElement("header", { className: "mmbb-card__head" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-card__heading" }, title ? /* @__PURE__ */ React.createElement("h3", { className: "mmbb-card__title" }, title) : null, subtitle ? /* @__PURE__ */ React.createElement("p", { className: "mmbb-card__sub" }, subtitle) : null), actions ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-card__actions" }, actions) : null) : null, /* @__PURE__ */ React.createElement("div", { className: "mmbb-card__body" }, children), footer ? /* @__PURE__ */ React.createElement("footer", { className: "mmbb-card__foot" }, footer) : null);
  }
  function PageHeader({ title, subtitle, backLabel, onBack, backHref, badge, actions }) {
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-page-head" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-page-head__text" }, backLabel && backHref ? /* @__PURE__ */ React.createElement("a", { className: "mmbb-page-head__back", href: backHref }, /* @__PURE__ */ React.createElement(Icon, { name: "arrowLeft", size: 16 }), backLabel) : backLabel ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "mmbb-page-head__back", onClick: onBack }, /* @__PURE__ */ React.createElement(Icon, { name: "arrowLeft", size: 16 }), backLabel) : null, /* @__PURE__ */ React.createElement("h1", { className: "mmbb-page-head__title" }, title, badge || null), subtitle ? /* @__PURE__ */ React.createElement("p", { className: "mmbb-page-head__sub" }, subtitle) : null), actions ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-page-head__actions" }, actions) : null);
  }
  var NOTICE_ICON = { info: "info", success: "check", warning: "alert", critical: "alert" };
  function Notice({ tone = "info", title, children, action, onDismiss }) {
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-notice", "mmbb-notice--" + tone), role: tone === "critical" ? "alert" : "status" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-notice__icon" }, /* @__PURE__ */ React.createElement(Icon, { name: NOTICE_ICON[tone], size: 18, strokeWidth: 2 })), /* @__PURE__ */ React.createElement("div", { className: "mmbb-notice__body" }, title ? /* @__PURE__ */ React.createElement("p", { className: "mmbb-notice__title" }, title) : null, children ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-notice__text" }, children) : null, action ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-notice__action" }, action) : null), onDismiss ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "mmbb-notice__close", "aria-label": "Dismiss", onClick: onDismiss }, /* @__PURE__ */ React.createElement(Icon, { name: "close", size: 16 })) : null);
  }
  function EmptyState({ icon = "box", title, description, action, secondaryAction }) {
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-empty" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-empty__art", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-empty__back" }), /* @__PURE__ */ React.createElement("span", { className: "mmbb-empty__front" }, /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 32, strokeWidth: 2 }))), title ? /* @__PURE__ */ React.createElement("h3", { className: "mmbb-empty__title" }, title) : null, description ? /* @__PURE__ */ React.createElement("p", { className: "mmbb-empty__desc" }, description) : null, action || secondaryAction ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-empty__actions" }, action, secondaryAction) : null);
  }
  function Toast({ children, action, onAction, onDismiss, icon = "check" }) {
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-toast", role: "status" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-toast__icon" }, /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 14, strokeWidth: 2.75 })), /* @__PURE__ */ React.createElement("span", { className: "mmbb-toast__text" }, children), action ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "mmbb-toast__action", onClick: onAction }, action) : null, onDismiss ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "mmbb-toast__close", "aria-label": "Dismiss", onClick: onDismiss }, /* @__PURE__ */ React.createElement(Icon, { name: "close", size: 16 })) : null);
  }
  var ADMIN_NAV = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "campaigns", label: "Campaigns", icon: "campaign" },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "settings", label: "Settings", icon: "settings" }
  ];
  function AdminShell({ active = "dashboard", onNavigate, nav = ADMIN_NAV, right, children }) {
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-shell" }, /* @__PURE__ */ React.createElement("header", { className: "mmbb-shell__bar" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-shell__brand" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-logo-tile", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Icon, { name: "box", size: 18, strokeWidth: 2.25 })), /* @__PURE__ */ React.createElement("span", { className: "mmbb-shell__name" }, "Mix and Max"), /* @__PURE__ */ React.createElement("span", { className: "mmbb-shell__tag" }, "Box Builder")), /* @__PURE__ */ React.createElement("nav", { className: "mmbb-shell__nav", "aria-label": "Mix and Max Box Builder" }, nav.map((n) => /* @__PURE__ */ React.createElement(
      "a",
      {
        key: n.id,
        href: n.href || "#/" + n.id,
        "aria-current": active === n.id ? "page" : void 0,
        className: cx("mmbb-shell__link", active === n.id && "is-active"),
        onClick: (e) => {
          if (onNavigate && !n.href) {
            e.preventDefault();
            onNavigate(n.id);
          }
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: n.icon, size: 18 }),
      n.label,
      n.count != null ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-shell__count" }, n.count) : null
    ))), /* @__PURE__ */ React.createElement("div", { className: "mmbb-shell__right" }, right !== void 0 ? right : /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "sm", icon: "help" }, "Help"))), /* @__PURE__ */ React.createElement("main", { className: "mmbb-shell__main" }, children));
  }
  function Sparkline({ data = [], width = 88, height = 32 }) {
    if (data.length < 2) return null;
    const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
    const x = (i) => 2 + i * (width - 6) / (data.length - 1);
    const y = (v) => 3 + (height - 6) - (v - min) / span * (height - 6);
    const d = data.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
    const n = data.length - 1;
    const tail = "M" + x(n - 1).toFixed(1) + " " + y(data[n - 1]).toFixed(1) + " L" + x(n).toFixed(1) + " " + y(data[n]).toFixed(1);
    return /* @__PURE__ */ React.createElement("svg", { className: "mmbb-spark", width, height, viewBox: "0 0 " + width + " " + height, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d, fill: "none", style: { stroke: "var(--chart-muted)" }, strokeWidth: "2", strokeLinejoin: "round", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("path", { d: tail, fill: "none", style: { stroke: "var(--chart-1)" }, strokeWidth: "2", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("circle", { cx: x(n), cy: y(data[n]), r: "3.5", style: { fill: "var(--chart-1)", stroke: "var(--surface)" }, strokeWidth: "2" }));
  }
  function StatCard({ label, value, delta, deltaLabel = "vs previous period", upIsGood = true, trend, icon }) {
    const dir = delta == null ? 0 : delta > 0 ? 1 : delta < 0 ? -1 : 0;
    const good = dir === 0 ? null : dir > 0 === upIsGood;
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-stat" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-stat__label" }, icon ? /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 16 }) : null, label), /* @__PURE__ */ React.createElement("div", { className: "mmbb-stat__row" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-stat__value" }, value), trend ? /* @__PURE__ */ React.createElement(Sparkline, { data: trend }) : null), delta != null ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-stat__delta" }, /* @__PURE__ */ React.createElement("span", { className: cx("mmbb-delta", good === true && "is-good", good === false && "is-bad") }, /* @__PURE__ */ React.createElement(Icon, { name: dir >= 0 ? "arrowUp" : "arrowDown", size: 14, strokeWidth: 2.25 }), /* @__PURE__ */ React.createElement("span", { className: "mmbb-sr" }, dir >= 0 ? "Up " : "Down "), Math.abs(delta), "%"), /* @__PURE__ */ React.createElement("span", null, deltaLabel)) : null);
  }
  function DataTable({ columns = [], rows = [], rowKey = "id", selectable, selected, defaultSelected = [], onSelectionChange, onRowClick, bulkActions, empty, dense }) {
    const [sel, setSel] = useControlled(selected, defaultSelected, onSelectionChange);
    const all = rows.length > 0 && sel.length === rows.length;
    const some = sel.length > 0 && !all;
    const toggleAll = () => setSel(all ? [] : rows.map((r) => r[rowKey]));
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-table-wrap" }, selectable && sel.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-table__bulk" }, /* @__PURE__ */ React.createElement(Checkbox, { checked: all, indeterminate: some, onChange: toggleAll, label: sel.length + " selected" }), /* @__PURE__ */ React.createElement("div", { className: "mmbb-table__bulk-actions" }, bulkActions)) : null, /* @__PURE__ */ React.createElement("table", { className: cx("mmbb-table", dense && "is-dense") }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, selectable ? /* @__PURE__ */ React.createElement("th", { className: "mmbb-table__check" }, /* @__PURE__ */ React.createElement(Checkbox, { "aria-label": "Select all", checked: all, indeterminate: some, onChange: toggleAll })) : null, columns.map((c) => /* @__PURE__ */ React.createElement("th", { key: c.key, style: { width: c.width }, className: c.numeric ? "is-num" : void 0 }, c.label)))), /* @__PURE__ */ React.createElement("tbody", null, rows.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: columns.length + (selectable ? 1 : 0), className: "mmbb-table__empty" }, empty || "Nothing here yet.")) : rows.map((r) => {
      const k = r[rowKey];
      const isSel = sel.indexOf(k) !== -1;
      return /* @__PURE__ */ React.createElement("tr", { key: k, className: cx(isSel && "is-selected", onRowClick && "is-clickable"), onClick: onRowClick ? () => onRowClick(r) : void 0 }, selectable ? /* @__PURE__ */ React.createElement("td", { className: "mmbb-table__check", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(Checkbox, { "aria-label": "Select row " + k, checked: isSel, onChange: () => setSel(isSel ? sel.filter((x) => x !== k) : sel.concat([k])) })) : null, columns.map((c) => /* @__PURE__ */ React.createElement("td", { key: c.key, className: c.numeric ? "is-num" : void 0 }, c.render ? c.render(r) : r[c.key])));
    }))));
  }
  function LineChart({ series = [], labels = [], height = 240, formatValue = (v) => v, formatTick, yTicks = 4, ariaLabel = "Line chart", legend }) {
    const ref = useRef(null);
    const w = useWidth(ref, 640);
    const [hover, setHover] = useState(null);
    const pad = { l: 44, r: 12, t: 22, b: 28 };
    const iw = Math.max(10, w - pad.l - pad.r), ih = height - pad.t - pad.b;
    const n = labels.length;
    const scale = niceScale(Math.max(1, ...series.flatMap((s) => s.data)), yTicks);
    const x = (i) => pad.l + (n <= 1 ? 0 : i * iw / (n - 1));
    const y = (v) => pad.t + ih - v / scale.max * ih;
    const ticks = Array.from({ length: yTicks + 1 }, (_, i) => scale.step * i);
    const line = (d) => d.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
    const every = Math.max(1, Math.ceil(n / 7));
    const tickFmt = formatTick || ((v) => formatCompact(v));
    const showLegend = legend !== void 0 ? legend : series.length > 1;
    const onMove = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const i = Math.round((e.clientX - r.left - pad.l) / iw * (n - 1));
      setHover(Math.max(0, Math.min(n - 1, i)));
    };
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setHover((h) => h == null ? n - 1 : Math.min(n - 1, h + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setHover((h) => h == null ? n - 1 : Math.max(0, h - 1));
      }
      if (e.key === "Escape") setHover(null);
    };
    const hero = series.find((s) => s.label) || null;
    const tipLeft = hover == null ? 0 : x(hover) + 176 > w ? x(hover) - 172 : x(hover) + 12;
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-chart", ref }, showLegend ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-legend" }, series.map((s) => /* @__PURE__ */ React.createElement("span", { key: s.name, className: "mmbb-legend__item" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-legend__line", style: { background: "var(--" + (s.color || "chart-1") + ")" } }), s.name))) : null, /* @__PURE__ */ React.createElement(
      "svg",
      {
        width: w,
        height,
        role: "img",
        "aria-label": ariaLabel,
        tabIndex: 0,
        onPointerMove: onMove,
        onPointerLeave: () => setHover(null),
        onKeyDown: onKey,
        onBlur: () => setHover(null)
      },
      ticks.map((t, i) => /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement("line", { x1: pad.l, x2: w - pad.r, y1: y(t), y2: y(t), className: i === 0 ? "mmbb-chart__axis" : "mmbb-chart__grid" }), /* @__PURE__ */ React.createElement("text", { x: pad.l - 8, y: y(t), className: "mmbb-chart__tick", textAnchor: "end", dominantBaseline: "middle" }, tickFmt(t)))),
      labels.map((l, i) => (i % every === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < every * 0.6) ? /* @__PURE__ */ React.createElement("text", { key: i, x: x(i), y: height - 8, textAnchor: i === 0 ? "start" : i === n - 1 ? "end" : "middle", className: "mmbb-chart__tick" }, l) : null),
      series.map((s, si) => /* @__PURE__ */ React.createElement("g", { key: si }, s.area ? /* @__PURE__ */ React.createElement("path", { d: line(s.data) + " L" + x(n - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + " Z", style: { fill: "var(--" + (s.color || "chart-1") + ")" }, opacity: "0.1" }) : null, /* @__PURE__ */ React.createElement("path", { d: line(s.data), fill: "none", style: { stroke: "var(--" + (s.color || "chart-1") + ")" }, strokeWidth: "2", strokeLinejoin: "round", strokeLinecap: "round" }))),
      hover != null ? /* @__PURE__ */ React.createElement("line", { x1: x(hover), x2: x(hover), y1: pad.t, y2: pad.t + ih, className: "mmbb-chart__cross" }) : null,
      series.map((s, si) => {
        const i = hover != null ? hover : n - 1;
        if (hover == null && !s.label) return null;
        return /* @__PURE__ */ React.createElement("circle", { key: si, cx: x(i), cy: y(s.data[i]), r: "4.5", style: { fill: "var(--" + (s.color || "chart-1") + ")", stroke: "var(--surface)" }, strokeWidth: "2" });
      }),
      hero && hover == null ? /* @__PURE__ */ React.createElement("text", { x: x(n - 1), y: y(hero.data[n - 1]) - 12, textAnchor: "end", className: "mmbb-chart__end" }, formatValue(hero.data[n - 1])) : null
    ), hover != null ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-chart__tip", style: { left: tipLeft, top: pad.t + (showLegend ? 30 : 0) } }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-chart__tip-title" }, labels[hover]), series.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.name, className: "mmbb-chart__tip-row" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-chart__key", style: { background: "var(--" + (s.color || "chart-1") + ")" } }), /* @__PURE__ */ React.createElement("strong", null, formatValue(s.data[hover])), /* @__PURE__ */ React.createElement("span", null, s.name)))) : null, /* @__PURE__ */ React.createElement("div", { className: "mmbb-sr" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("caption", null, ariaLabel), /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Date"), series.map((s) => /* @__PURE__ */ React.createElement("th", { key: s.name }, s.name)))), /* @__PURE__ */ React.createElement("tbody", null, labels.map((l, i) => /* @__PURE__ */ React.createElement("tr", { key: i }, /* @__PURE__ */ React.createElement("td", null, l), series.map((s) => /* @__PURE__ */ React.createElement("td", { key: s.name }, formatValue(s.data[i])))))))));
  }
  function BarList({ items = [], formatValue = (v) => v, color = "chart-1", max }) {
    const m = max || Math.max(1, ...items.map((i) => i.value));
    return /* @__PURE__ */ React.createElement("ul", { className: "mmbb-barlist" }, items.map((it) => /* @__PURE__ */ React.createElement("li", { key: it.label, className: "mmbb-barlist__row", tabIndex: 0, title: it.label + ": " + formatValue(it.value) }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-barlist__label" }, it.label, it.meta ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-barlist__meta" }, it.meta) : null), /* @__PURE__ */ React.createElement("span", { className: "mmbb-barlist__value" }, formatValue(it.value)), /* @__PURE__ */ React.createElement("span", { className: "mmbb-barlist__bar" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-barlist__fill", style: { width: Math.max(1, it.value / m * 100) + "%", background: "var(--" + color + ")" } })))));
  }
  function FunnelChart({ steps = [], formatValue = (v) => Number(v).toLocaleString("en-US") }) {
    const first = steps[0] ? steps[0].value || 1 : 1;
    return /* @__PURE__ */ React.createElement("ol", { className: "mmbb-funnel" }, steps.map((s, i) => {
      const pct = s.value / first * 100;
      const prev = i > 0 ? steps[i - 1].value : null;
      return /* @__PURE__ */ React.createElement("li", { key: s.label, className: "mmbb-funnel__item" }, prev != null ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-funnel__drop" }, /* @__PURE__ */ React.createElement(Icon, { name: "arrowDown", size: 12, strokeWidth: 2.25 }), Math.round(s.value / prev * 100), "% continued") : null, /* @__PURE__ */ React.createElement("div", { className: "mmbb-funnel__step", tabIndex: 0, title: s.label + ": " + formatValue(s.value) }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-funnel__label" }, s.label, s.sub ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-funnel__sub" }, s.sub) : null), /* @__PURE__ */ React.createElement("span", { className: "mmbb-funnel__track" }, /* @__PURE__ */ React.createElement("span", { className: "mmbb-funnel__fill", style: { width: Math.max(0.5, pct) + "%" } })), /* @__PURE__ */ React.createElement("span", { className: "mmbb-funnel__value" }, formatValue(s.value), /* @__PURE__ */ React.createElement("span", { className: "mmbb-funnel__pct" }, pct.toFixed(pct < 10 ? 1 : 0), "% of start"))));
    }));
  }
  function ProgressBar({ value = 0, max = 100, label, valueLabel, tone = "ink", size = "md" }) {
    const pct = Math.max(0, Math.min(100, value / max * 100));
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-progress", "mmbb-progress--" + tone, "mmbb-progress--" + size) }, label || valueLabel ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-progress__head" }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { className: "mmbb-progress__value" }, valueLabel)) : null, /* @__PURE__ */ React.createElement("div", { className: "mmbb-progress__track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": value, "aria-label": typeof label === "string" ? label : "Progress" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-progress__fill", style: { width: pct + "%" } })));
  }
  var ART = {
    cookie: { bg: "#f3e3cc", el: [["circle", { cx: 50, cy: 52, r: 27, fill: "#c98a4b" }], ["circle", { cx: 41, cy: 44, r: 3.5, fill: "#5a3519" }], ["circle", { cx: 58, cy: 47, r: 3, fill: "#5a3519" }], ["circle", { cx: 47, cy: 60, r: 3.5, fill: "#5a3519" }], ["circle", { cx: 61, cy: 61, r: 2.5, fill: "#5a3519" }], ["circle", { cx: 37, cy: 56, r: 2.2, fill: "#5a3519" }]] },
    macaron: { bg: "#f6dfe6", el: [["rect", { x: 26, y: 33, width: 48, height: 16, rx: 8, fill: "#e88aa6" }], ["rect", { x: 29, y: 47, width: 42, height: 8, rx: 4, fill: "#fff3e8" }], ["rect", { x: 26, y: 53, width: 48, height: 16, rx: 8, fill: "#e88aa6" }]] },
    candle: { bg: "#e5ece4", el: [["rect", { x: 33, y: 38, width: 34, height: 36, rx: 6, fill: "#f7f3ea" }], ["rect", { x: 33, y: 52, width: 34, height: 10, fill: "#7d9a7a" }], ["rect", { x: 49, y: 30, width: 2, height: 9, fill: "#3b3b3b" }], ["path", { d: "M50 17c4 5 5 8 5 10a5 5 0 0 1-10 0c0-2 1-5 5-10z", fill: "#f2a541" }]] },
    soap: { bg: "#e4ecf2", el: [["rect", { x: 24, y: 36, width: 52, height: 30, rx: 12, fill: "#a9c6dc" }], ["rect", { x: 32, y: 42, width: 22, height: 6, rx: 3, fill: "#d6e6f1" }]] },
    tea: { bg: "#efe8d8", el: [["rect", { x: 34, y: 30, width: 32, height: 44, rx: 4, fill: "#3f6b5c" }], ["rect", { x: 32, y: 26, width: 36, height: 9, rx: 3, fill: "#2f5246" }], ["rect", { x: 34, y: 46, width: 32, height: 14, fill: "#e8d9b5" }]] },
    donut: { bg: "#fbe6d4", el: [["circle", { cx: 50, cy: 52, r: 26, fill: "#e2a86b" }], ["circle", { cx: 50, cy: 50, r: 22, fill: "#d9577a" }], ["circle", { cx: 50, cy: 50, r: 8, fill: "#fbe6d4" }], ["rect", { x: 36, y: 38, width: 7, height: 2.5, rx: 1.2, fill: "#fff3e8", transform: "rotate(-30 39 39)" }], ["rect", { x: 58, y: 40, width: 7, height: 2.5, rx: 1.2, fill: "#ffd23f", transform: "rotate(40 61 41)" }], ["rect", { x: 55, y: 60, width: 7, height: 2.5, rx: 1.2, fill: "#fff3e8", transform: "rotate(-10 58 61)" }], ["rect", { x: 37, y: 58, width: 7, height: 2.5, rx: 1.2, fill: "#ffd23f", transform: "rotate(25 40 59)" }]] },
    chocolate: { bg: "#eadcd2", el: [["rect", { x: 28, y: 28, width: 44, height: 46, rx: 4, fill: "#6b3e26" }], ["path", { d: "M28 43.3h44M28 58.6h44M42.7 28v46M57.3 28v46", stroke: "#4e2b19", strokeWidth: 2 }]] },
    honey: { bg: "#fbefd0", el: [["rect", { x: 32, y: 36, width: 36, height: 38, rx: 8, fill: "#e6a52c" }], ["rect", { x: 34, y: 28, width: 32, height: 10, rx: 3, fill: "#6b4a1f" }], ["rect", { x: 38, y: 48, width: 24, height: 14, rx: 3, fill: "#fff7e0" }]] }
  };
  function ProductArt({ kind = "cookie", label, className }) {
    const a = ART[kind] || ART.cookie;
    return /* @__PURE__ */ React.createElement("span", { className: cx("mmbb-art", className), style: { background: a.bg }, role: label ? "img" : void 0, "aria-label": label, "aria-hidden": label ? void 0 : true }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 100 100" }, a.el.map((e, i) => React.createElement(e[0], Object.assign({ key: i }, e[1])))));
  }
  ProductArt.kinds = Object.keys(ART);
  function Media({ image, art, name }) {
    return image ? /* @__PURE__ */ React.createElement("img", { src: image, alt: name || "", loading: "lazy" }) : /* @__PURE__ */ React.createElement(ProductArt, { kind: art });
  }
  function ProductTile({ name, price, compareAt, image, art, badge, badgeTone = "deal", meta, stock, qty = 0, onAdd, onChange, boxFull, currency = "$" }) {
    const inBox = qty > 0;
    const out = stock === 0;
    return /* @__PURE__ */ React.createElement("article", { className: cx("mmbb-tile", inBox && "is-in-box", out && "is-out") }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-tile__media" }, /* @__PURE__ */ React.createElement(Media, { image, art, name }), badge ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-tile__badge" }, badgeTone === "deal" ? /* @__PURE__ */ React.createElement(Sticker, { size: "sm" }, badge) : /* @__PURE__ */ React.createElement(Badge, { tone: badgeTone }, badge)) : null, inBox ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-tile__count", "aria-label": qty + " in your box" }, qty, "×") : null), /* @__PURE__ */ React.createElement("div", { className: "mmbb-tile__body" }, /* @__PURE__ */ React.createElement("h4", { className: "mmbb-tile__name" }, name), meta ? /* @__PURE__ */ React.createElement("p", { className: "mmbb-tile__meta" }, meta) : null, /* @__PURE__ */ React.createElement("div", { className: "mmbb-tile__price" }, /* @__PURE__ */ React.createElement("span", null, formatMoney(price, currency)), compareAt ? /* @__PURE__ */ React.createElement("s", { "aria-label": "Was " + formatMoney(compareAt, currency) }, formatMoney(compareAt, currency)) : null), stock != null && stock > 0 && stock <= 5 ? /* @__PURE__ */ React.createElement("p", { className: "mmbb-tile__stock" }, /* @__PURE__ */ React.createElement(Icon, { name: "flame", size: 14, strokeWidth: 2 }), "Only ", stock, " left") : null), /* @__PURE__ */ React.createElement("div", { className: "mmbb-tile__action" }, out ? /* @__PURE__ */ React.createElement(Button, { fullWidth: true, disabled: true }, "Sold out") : inBox ? /* @__PURE__ */ React.createElement(QuantityStepper, { value: qty, onChange, max: boxFull ? qty : 99, fullWidth: true, label: "Quantity of " + name }) : /* @__PURE__ */ React.createElement(Button, { variant: "primary", fullWidth: true, icon: boxFull ? void 0 : "plus", onClick: onAdd, disabled: boxFull }, boxFull ? "Box is full" : "Add to box")));
  }
  function BoxSlots({ size = 6, items = [], onRemove, columns }) {
    const cols = columns || (size <= 4 ? size : size <= 6 ? 3 : size <= 9 ? 3 : 4);
    const slots = Array.from({ length: size }, (_, i) => items[i]);
    return /* @__PURE__ */ React.createElement("ol", { className: "mmbb-slots", style: { gridTemplateColumns: "repeat(" + cols + ", minmax(0, 1fr))" }, "aria-label": "Box: " + Math.min(items.length, size) + " of " + size + " filled" }, slots.map((it, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: cx("mmbb-slot", it && "is-filled") }, it ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "mmbb-slot__media" }, /* @__PURE__ */ React.createElement(Media, { image: it.image, art: it.art, name: it.name })), onRemove ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "mmbb-slot__remove", "aria-label": "Remove " + (it.name || "item"), onClick: () => onRemove(i, it) }, /* @__PURE__ */ React.createElement(Icon, { name: "close", size: 12, strokeWidth: 2.75 })) : null) : /* @__PURE__ */ React.createElement("span", { className: "mmbb-slot__num" }, i + 1))));
  }
  function TierProgress({ count = 0, tiers = [], size, compact, inverse }) {
    const sorted = tiers.slice().sort((a, b) => a.qty - b.qty);
    const top = size || (sorted.length ? sorted[sorted.length - 1].qty : 1);
    const next = sorted.find((t) => count < t.qty);
    const reached = sorted.filter((t) => count >= t.qty);
    const best = reached[reached.length - 1];
    const pct = Math.min(100, count / top * 100);
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-tier", compact && "is-compact", inverse && "is-inverse", !next && sorted.length && "is-max") }, /* @__PURE__ */ React.createElement("p", { className: "mmbb-tier__msg", "aria-live": "polite" }, next ? /* @__PURE__ */ React.createElement(React.Fragment, null, best ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-tier__got" }, /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 14, strokeWidth: 2.75 }), best.label, " unlocked.") : null, /* @__PURE__ */ React.createElement("span", null, "Add ", /* @__PURE__ */ React.createElement("b", null, next.qty - count, " more"), " to get ", /* @__PURE__ */ React.createElement("b", { className: "mmbb-tier__hl" }, next.label))) : best ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Icon, { name: "sparkle", size: 16, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "You unlocked ", /* @__PURE__ */ React.createElement("b", { className: "mmbb-tier__hl" }, best.label), ". That’s the max deal.")) : null), /* @__PURE__ */ React.createElement("div", { className: "mmbb-tier__track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": top, "aria-valuenow": Math.min(count, top), "aria-label": "Items in box" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-tier__fill", style: { width: pct + "%" } }), sorted.map((t) => /* @__PURE__ */ React.createElement("span", { key: t.qty, className: cx("mmbb-tier__mark", count >= t.qty && "is-hit"), style: { left: t.qty / top * 100 + "%" } }))), !compact ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-tier__legend" }, sorted.map((t) => /* @__PURE__ */ React.createElement("span", { key: t.qty, className: count >= t.qty ? "is-hit" : void 0 }, count >= t.qty ? /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 12, strokeWidth: 3 }) : null, t.qty, " items · ", t.label))) : null);
  }
  function BoxSizePicker({ sizes = [], value, defaultValue, onChange, layout = "cards", currency = "$", name }) {
    const auto = useId();
    const [v, set] = useControlled(value, defaultValue !== void 0 ? defaultValue : sizes[0] && sizes[0].qty, onChange);
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-sizes", "mmbb-sizes--" + layout), role: "radiogroup", "aria-label": "Box size" }, sizes.map((s) => /* @__PURE__ */ React.createElement("label", { key: s.qty, className: cx("mmbb-size", v === s.qty && "is-selected") }, /* @__PURE__ */ React.createElement("input", { type: "radio", className: "mmbb-sr", name: name || auto, value: s.qty, checked: v === s.qty, onChange: () => set(s.qty) }), s.tag ? /* @__PURE__ */ React.createElement(Sticker, { size: "sm", tilt: true, className: "mmbb-size__tag" }, s.tag) : null, /* @__PURE__ */ React.createElement("span", { className: "mmbb-size__qty" }, s.qty), /* @__PURE__ */ React.createElement("span", { className: "mmbb-size__unit" }, s.unit || "items"), s.price != null ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-size__price" }, layout === "cards" && s.from !== false ? "from " : "", formatMoney(s.price, currency)) : null, s.save ? /* @__PURE__ */ React.createElement("span", { className: "mmbb-size__save" }, "Save ", s.save) : null, /* @__PURE__ */ React.createElement("span", { className: "mmbb-size__check", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 14, strokeWidth: 2.75 })))));
  }
  function BoxPanel({ title = "Your box", size = 6, items = [], tiers = [], subtotal = 0, total = 0, currency = "$", minItems, onRemove, onCheckout, ctaHref, ctaLabel = "Add box to cart", footnote, children }) {
    const count = items.length;
    const need = (minItems != null ? minItems : size) - count;
    const savings = subtotal - total;
    return /* @__PURE__ */ React.createElement("aside", { className: "mmbb-panel", "aria-label": title }, /* @__PURE__ */ React.createElement("header", { className: "mmbb-panel__head" }, /* @__PURE__ */ React.createElement("h3", null, title), /* @__PURE__ */ React.createElement("span", { className: "mmbb-panel__count" }, count, "/", size)), /* @__PURE__ */ React.createElement(BoxSlots, { size, items, onRemove }), tiers.length ? /* @__PURE__ */ React.createElement(TierProgress, { count, tiers, size }) : null, children, /* @__PURE__ */ React.createElement("dl", { className: "mmbb-panel__sum" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Subtotal"), /* @__PURE__ */ React.createElement("dd", null, formatMoney(subtotal, currency))), savings > 4e-3 ? /* @__PURE__ */ React.createElement("div", { className: "is-save" }, /* @__PURE__ */ React.createElement("dt", null, "Box discount"), /* @__PURE__ */ React.createElement("dd", null, "−", formatMoney(savings, currency))) : null, /* @__PURE__ */ React.createElement("div", { className: "is-total" }, /* @__PURE__ */ React.createElement("dt", null, "Total"), /* @__PURE__ */ React.createElement("dd", null, formatMoney(total, currency)))), /* @__PURE__ */ React.createElement(Button, { variant: "max", size: "lg", fullWidth: true, disabled: need > 0, onClick: onCheckout, href: ctaHref, iconRight: need > 0 ? void 0 : "arrowRight" }, need > 0 ? "Add " + need + " more to continue" : ctaLabel), footnote ? /* @__PURE__ */ React.createElement("p", { className: "mmbb-panel__foot" }, footnote) : null);
  }
  function BoxSummaryBar({ size = 6, items = [], tiers = [], total = 0, compareAt, currency = "$", minItems, onOpen, openHref, onCheckout, ctaHref, ctaLabel = "Add to cart" }) {
    const count = items.length;
    const need = (minItems != null ? minItems : size) - count;
    const summary = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "mmbb-bar__thumbs", "aria-hidden": "true" }, Array.from({ length: Math.min(size, 4) }, (_, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: "mmbb-bar__thumb" }, items[i] ? /* @__PURE__ */ React.createElement(Media, { image: items[i].image, art: items[i].art }) : null))), /* @__PURE__ */ React.createElement("span", { className: "mmbb-bar__count" }, /* @__PURE__ */ React.createElement("b", null, count, "/", size), "in your box"), /* @__PURE__ */ React.createElement(Icon, { name: "chevronUp", size: 18, className: "mmbb-bar__chev" }));
    const label = "Your box, " + count + " of " + size + ". Open details";
    return /* @__PURE__ */ React.createElement("div", { className: "mmbb-bar", role: "region", "aria-label": "Your box" }, /* @__PURE__ */ React.createElement("div", { className: "mmbb-bar__inner" }, openHref ? /* @__PURE__ */ React.createElement("a", { className: "mmbb-bar__summary", href: openHref, "aria-label": label }, summary) : /* @__PURE__ */ React.createElement("button", { type: "button", className: "mmbb-bar__summary", onClick: onOpen, "aria-label": label }, summary), tiers.length ? /* @__PURE__ */ React.createElement("div", { className: "mmbb-bar__tier" }, /* @__PURE__ */ React.createElement(TierProgress, { count, tiers, size, compact: true, inverse: true })) : /* @__PURE__ */ React.createElement("span", null), /* @__PURE__ */ React.createElement("div", { className: "mmbb-bar__total" }, compareAt && compareAt > total ? /* @__PURE__ */ React.createElement("s", null, formatMoney(compareAt, currency)) : null, /* @__PURE__ */ React.createElement("b", null, formatMoney(total, currency))), /* @__PURE__ */ React.createElement(Button, { variant: "max", size: "lg", onClick: onCheckout, href: ctaHref, disabled: need > 0 }, need > 0 ? need + " to go" : ctaLabel)));
  }
  function Countdown({ seconds, endsAt, label = "Deal ends in", tone = "pop" }) {
    const target = useMemo(() => endsAt ? new Date(endsAt).getTime() : Date.now() + (seconds || 0) * 1e3, [endsAt, seconds]);
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
      const t = setInterval(() => setNow(Date.now()), 1e3);
      return () => clearInterval(t);
    }, []);
    let s = Math.max(0, Math.floor((target - now) / 1e3));
    const d = Math.floor(s / 86400);
    s %= 86400;
    const h = Math.floor(s / 3600);
    s %= 3600;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const p = (n) => String(n).padStart(2, "0");
    return /* @__PURE__ */ React.createElement("div", { className: cx("mmbb-countdown", "mmbb-countdown--" + tone), role: "timer", "aria-live": "off" }, /* @__PURE__ */ React.createElement(Icon, { name: "clock", size: 16, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", { className: "mmbb-countdown__label" }, label), /* @__PURE__ */ React.createElement("span", { className: "mmbb-countdown__units" }, d > 0 ? /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, d), "d") : null, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, p(h)), "h"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, p(m)), "m"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, p(sec)), "s")));
  }
  var MixMax = {
    Icon,
    Button,
    Badge,
    Sticker,
    TextField,
    SelectField,
    Toggle,
    Checkbox,
    ChoiceCard,
    QuantityStepper,
    SegmentedControl,
    Chips,
    Tabs,
    Steps,
    Card,
    PageHeader,
    Notice,
    EmptyState,
    Toast,
    AdminShell,
    StatCard,
    Sparkline,
    DataTable,
    LineChart,
    BarList,
    FunnelChart,
    ProgressBar,
    ProductArt,
    ProductTile,
    BoxSlots,
    TierProgress,
    BoxSizePicker,
    BoxPanel,
    BoxSummaryBar,
    Countdown,
    utils: { cx, formatMoney, formatCompact }
  };
  window.MixMax = Object.assign(window.MixMax || {}, MixMax);
})();
