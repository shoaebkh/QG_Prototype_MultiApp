export default function Button({ variant = 'primary', children, ...rest }) {
  return (
    <button className={`ma-btn ma-btn--${variant}`} {...rest}>
      {children}
    </button>
  );
}
