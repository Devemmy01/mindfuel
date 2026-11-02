import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/notify", () => ({ sendCategoryPush: vi.fn() }));
vi.mock("@/models/notification", () => ({ default: {} }));
vi.mock("@/models/user", () => ({ default: {} }));

import { groupedActor } from "./notifications";

describe("groupedActor", () => {
  it("batches repeat activity into one line", () => {
    expect(groupedActor("Ada", 0)).toBe("Ada");
    expect(groupedActor("Ada", 1)).toBe("Ada and 1 other");
    expect(groupedActor("Ada", 4)).toBe("Ada and 4 others");
  });
});
