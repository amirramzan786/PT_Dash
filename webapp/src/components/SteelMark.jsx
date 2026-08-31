export default function SteelMark({ size = 27, title = 'Project Steel' }) {
  return <svg className="steel-mark" width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title} focusable="false">
    <path className="steel-mark-shield" d="M24 3.5 40 9v12.4c0 10.5-6.1 18.9-16 23.1C14.1 40.3 8 31.9 8 21.4V9L24 3.5Z" />
    <path className="steel-mark-line" d="M17 14.5h13.6l-9.8 7.1c-2.1 1.5-1.2 4.2 1.5 4.2h4.9c3.8 0 4.4 4.7.7 5.9L17 35.2" />
    <path className="steel-mark-line" d="M17 14.5v4.1M31 14.5v4.1M17 35.2v-4.1M31 35.2v-4.1" />
  </svg>
}
