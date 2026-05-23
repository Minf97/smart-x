import { describe, expect, test } from "vitest";
import { normalizePayload } from "../../../backend/src/alert-normalizer";

describe("alert normalizer", () => {
  test("uses title as the default group key source", () => {
    const first = normalizePayload({
      message: "Cannot read property foo of undefined",
      stack: "TypeError\n    at UserList (src/UserList.tsx:10:1)",
      title: "TypeError in UserList",
    });
    const second = normalizePayload({
      message: "Cannot read property bar of undefined",
      stack: "TypeError\n    at OrderList (src/OrderList.tsx:20:1)",
      title: "TypeError in UserList",
    });

    expect(second.groupKey).toBe(first.groupKey);
  });

  test("keeps explicit group key", () => {
    const payload = normalizePayload({
      groupKey: "manual-group",
      title: "TypeError in UserList",
    });

    expect(payload.groupKey).toBe("manual-group");
  });

  test("separates different titles", () => {
    const first = normalizePayload({
      title: "TypeError in UserList",
    });
    const second = normalizePayload({
      title: "ReferenceError in UserList",
    });

    expect(second.groupKey).not.toBe(first.groupKey);
  });
});
