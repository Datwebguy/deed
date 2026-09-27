// The Deed mark: a wax seal with a D. Scales with font size.
export default function Seal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className} width="1em" height="1em">
      <path
        fill="var(--seal)"
        d="M20 1.5c2 0 2.6 2.2 4.4 2.7 1.9.5 3.6-1 5.2.1 1.6 1.1.9 3.3 2 4.8 1.2 1.6 3.4 1.5 4 3.4.7 1.9-1.1 3.3-1.1 5.3s1.8 3.4 1.1 5.3c-.6 1.9-2.8 1.8-4 3.4-1.1 1.5-.4 3.7-2 4.8-1.6 1.1-3.3-.4-5.2.1-1.8.5-2.4 2.7-4.4 2.7s-2.6-2.2-4.4-2.7c-1.9-.5-3.6 1-5.2-.1-1.6-1.1-.9-3.3-2-4.8-1.2-1.6-3.4-1.5-4-3.4-.7-1.9 1.1-3.3 1.1-5.3S2.7 14.4 3.4 12.5c.6-1.9 2.8-1.8 4-3.4 1.1-1.5.4-3.7 2-4.8 1.6-1.1 3.3.4 5.2-.1C16.4 3.7 18 1.5 20 1.5Z"
      />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke="#fff8f2" strokeOpacity=".35" strokeWidth="1" />
      <path fill="#fff8f2" d="M15.5 13.5h4.6c4.2 0 6.9 2.6 6.9 6.5s-2.7 6.5-6.9 6.5h-4.6v-13Zm3 2.6v7.8h1.5c2.3 0 3.8-1.5 3.8-3.9s-1.5-3.9-3.8-3.9h-1.5Z" />
    </svg>
  );
}
