import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container nav-content">
        <div className="logo">سفینه</div>
        <nav style={{ display: 'flex', alignItems: 'center' }}>
          <a href="#why">درباره ما</a>
          <Link href="/faq">سوالات متداول</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '20px' }}>
            <ThemeToggle />
            <Link href="/login" className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '8px' }}>
              ورود
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
