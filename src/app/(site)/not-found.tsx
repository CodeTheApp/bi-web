export default function NotFound() {
  return (
    <main>
      <section className="p-hero" data-nav="dark" style={{ minHeight: "80svh", paddingBottom: 120 }}>
        <div className="wrap">
          <span className="label">Erro 404</span>
          <h1 className="h-xl" style={{ margin: "32px 0" }}>
            Essa luz <span className="amber">se apagou.</span>
          </h1>
          <a className="btn" href="/">
            Voltar ao início <span className="ar">→</span>
          </a>
        </div>
      </section>
    </main>
  );
}
