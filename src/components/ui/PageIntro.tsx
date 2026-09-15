export function PageIntro({ title, body }: { title: string; body: string }) {
  return (
    <header className="page-intro">
      <h1>{title}</h1>
      <p>{body}</p>
    </header>
  );
}
