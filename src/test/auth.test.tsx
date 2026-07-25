import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import Auth from "../pages/Auth";

describe("Auth screen layout", () => {
  it("uses a viewport-safe full-height wrapper", () => {
    const { container } = render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("h-dvh");
    expect(wrapper.className).toContain("overflow-hidden");
  });
});
