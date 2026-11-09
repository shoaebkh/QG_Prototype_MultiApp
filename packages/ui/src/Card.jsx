export default function Card({ children, className = '', ...rest }) {
  return (
    <div className={`ma-card ${className}`} {...rest}>
      {children}
    </div>
  );
}
