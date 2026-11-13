import "./footer-brand.css";
import { ArrowUp } from "@/shared/ui/icons/lucide";
import type { Project, Settings } from "@/entities/site-content";
import { brandOf, companyOf, igLink, waLink } from "@/entities/site-content";

export function Footer({
  settings,
  projects,
}: {
  settings: Settings;
  projects: Project[];
}) {
  const year = new Date().getFullYear();
  const brand = brandOf(settings);
  const company = companyOf(settings);
  return (
    <footer className="foot" data-nav="dark">
      <div className="faixa" aria-hidden="true" />
      <div className="wrap row">
        <div className="brand">
          <a href="/#inicio" aria-label={`${company.commercialName} — início`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logoLight} alt={company.commercialName} />
          </a>
          <p className="slogan">
            Onde a luz vira <em>emoção</em> na sua vida.
          </p>
        </div>
        <div>
          <h4>Navegue</h4>
          <ul>
            <li>
              <a href="/#quem-somos">Quem somos</a>
            </li>
            <li>
              <a href="/#servicos">Serviços</a>
            </li>
            <li>
              <a href="/#portfolio">Portfólio</a>
            </li>
            <li>
              <a href="/loja">Loja</a>
            </li>
            <li>
              <a href="/#contato">Contato</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Projetos</h4>
          <ul>
            {projects.slice(0, 4).map((p) => (
              <li key={p.slug}>
                <a href={`/projetos/${p.slug}`}>{p.title}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Contato</h4>
          <ul>
            <li>
              <a href={waLink(settings)} target="_blank" rel="noopener">
                {settings.whatsapp}
              </a>
            </li>
            <li>
              <a href={igLink(settings)} target="_blank" rel="noopener">
                Instagram
              </a>
            </li>
            <li>
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </li>
            {company.address && <li>{company.address}</li>}
            {company.city && <li>{company.city}</li>}
            {company.serviceHours && <li>{company.serviceHours}</li>}
            {company.mapsUrl && (
              <li>
                <a
                  href={company.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver no mapa
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="wrap legal">
        <span>
          © {year} {company.legalName || company.commercialName}. Todos os
          direitos reservados.
        </span>
        <span>
          {company.city && <>{company.city} · </>}
          <a href="#inicio">
            Voltar ao topo{" "}
            <ArrowUp size={15} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </span>
      </div>
    </footer>
  );
}

export function WhatsAppButton({ settings }: { settings: Settings }) {
  return (
    <a
      className="wpp"
      href={waLink(settings)}
      target="_blank"
      rel="noopener"
      aria-label="Falar no WhatsApp"
    >
      <svg viewBox="0 0 32 32" fill="#291007" aria-hidden="true">
        <path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7a10.7 10.7 0 0 1-5.5-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.9 1 3.9.8a3.3 3.3 0 0 0 2.2-1.5 2.7 2.7 0 0 0 .2-1.6c-.1-.2-.3-.3-.6-.5z" />
      </svg>
    </a>
  );
}
