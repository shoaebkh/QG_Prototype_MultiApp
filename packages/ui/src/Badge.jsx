export default function Badge({ children, tone = 'neutral' }) {
  if (children === 0 || children === null || children === undefined) return null;
  return <span className={`ma-badge ma-badge--${tone}`}>{children}</span>;
}
