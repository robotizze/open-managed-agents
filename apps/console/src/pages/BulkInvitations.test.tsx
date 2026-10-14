import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";

import { BulkInvitations } from "./BulkInvitations";

const api = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({ useApi: () => ({ api }) }));

const pointerMethods = ["hasPointerCapture", "setPointerCapture", "releasePointerCapture", "scrollIntoView"] as const;
const originalPointerMethods = pointerMethods.map((name) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));

beforeAll(() => {
  for (const name of pointerMethods) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      value: name === "hasPointerCapture" ? () => false : () => {},
    });
  }
});

afterAll(() => {
  pointerMethods.forEach((name, index) => {
    const original = originalPointerMethods[index];
    if (original) Object.defineProperty(HTMLElement.prototype, name, original);
    else Reflect.deleteProperty(HTMLElement.prototype, name);
  });
});

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue({ email_enabled: true });
});

it("submits deduplicated invitations with the chosen role and delivery", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn(async () => {});
  api.mockImplementation(async (_path: string, init?: RequestInit) =>
    init?.method === "POST"
      ? { data: [{ email: "person@executive.com.br", status: "sent", link: "/join#token" }] }
      : { email_enabled: true },
  );
  render(<BulkInvitations base="/v1/oma/tenants/team" owner onComplete={onComplete} />);

  await user.type(screen.getByLabelText("Lista de e-mails"), "person@executive.com.br;person@executive.com.br");
  await user.click(screen.getByRole("combobox", { name: "Perfil do lote" }));
  await user.click(screen.getByRole("option", { name: "Administrador" }));
  await user.click(screen.getByRole("combobox", { name: "Entrega dos convites" }));
  await user.click(screen.getByRole("option", { name: "Enviar por e-mail" }));
  await user.click(screen.getByRole("button", { name: "Enviar 1 convites" }));

  await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  expect(api).toHaveBeenCalledWith("/v1/oma/tenants/team/invitations/bulk", {
    method: "POST",
    body: JSON.stringify({ emails: ["person@executive.com.br"], role: "admin", mode: "email" }),
  });
  expect(screen.getByLabelText("Link para person@executive.com.br")).toHaveValue("/join#token");
  expect(screen.getByLabelText("Link para person@executive.com.br")).toHaveAttribute("readonly");
});

it("keeps admin invitations unavailable for non-owners and email disabled without SMTP", async () => {
  const user = userEvent.setup();
  api.mockResolvedValue({ email_enabled: false });
  render(<BulkInvitations base="/v1/oma/tenants/team" owner={false} onComplete={async () => {}} />);

  await user.click(screen.getByRole("combobox", { name: "Perfil do lote" }));
  expect(screen.queryByRole("option", { name: "Administrador" })).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("combobox", { name: "Entrega dos convites" }));
  expect(screen.getByRole("option", { name: "Enviar por e-mail" })).toHaveAttribute("aria-disabled", "true");
});
