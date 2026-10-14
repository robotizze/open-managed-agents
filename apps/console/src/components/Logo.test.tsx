import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { Logo } from "./Logo";
import { parseBranding, resetBrandingForTests } from "../lib/branding";

afterEach(() => resetBrandingForTests());

describe("Logo", () => {
  it("keeps the GETTER icons when deployment branding is not configured", () => {
    resetBrandingForTests();
    const markup = renderToStaticMarkup(<Logo size="lg" />);

    expect(markup).toContain('aria-label="GETTER AI"');
    expect(markup).toContain('src="/getter-icon.png"');
    expect(markup).toContain('src="/getter-icon-white.png"');
    expect(markup).toContain('width:32px;height:32px');
  });

  it("uses the semantic brand color for the deployment SVG fallback", () => {
    resetBrandingForTests(parseBranding({ product_name: "openma" }));
    const markup = renderToStaticMarkup(
      <Logo size="lg" className="mx-auto text-fg-muted" />,
    );

    expect(markup).toContain('fill="var(--brand)"');
  });

  it("follows the surrounding foreground only when explicitly requested", () => {
    resetBrandingForTests(parseBranding({ product_name: "openma" }));
    const markup = renderToStaticMarkup(<Logo tone="current" />);

    expect(markup).toContain('fill="currentColor"');
  });
});
