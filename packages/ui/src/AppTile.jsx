export default function AppTile({ icon, name, description, color = '#2563eb', onClick, compact = false }) {
  return (
    <button
      className={`ma-tile ${compact ? 'ma-tile--compact' : ''}`}
      style={{ '--tile-color': color }}
      onClick={onClick}
    >
      <span className="ma-tile__icon">{icon}</span>
      <span className="ma-tile__text">
        <span className="ma-tile__name">{name}</span>
        {!compact && description ? <span className="ma-tile__desc">{description}</span> : null}
      </span>
    </button>
  );
}
