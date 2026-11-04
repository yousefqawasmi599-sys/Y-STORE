import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap view lost">
      <span className="lost-num serif" aria-hidden="true">404</span>
      <h1 className="serif vh">Page not found</h1>
      <p className="ar" lang="ar">الصفحة غير موجودة</p>
      <p>This page does not exist or has moved.</p>
      <div className="btns">
        <Link className="btn" href="/shop">Browse the shop</Link>
        <Link className="link" href="/">Go back home</Link>
      </div>
    </div>
  );
}
