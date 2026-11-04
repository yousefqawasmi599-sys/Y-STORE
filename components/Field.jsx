export default function Field({ label, name, error, children, ...rest }) {
  return (
    <label className="fld">
      {label}
      {children || <input name={name} aria-invalid={!!error} {...rest} />}
      <small className="err">{error}</small>
    </label>
  );
}
