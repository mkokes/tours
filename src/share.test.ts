import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText, shareButton, shareUrl } from "./share";

describe("shareUrl", () => {
  it("links to an album", () => {
    expect(shareUrl("https://tours.martykokes.com", "nepal")).toBe(
      "https://tours.martykokes.com/albums/nepal/",
    );
  });

  it("links to one photo with ?p=", () => {
    expect(shareUrl("http://localhost:5173", "qatar", "IMG_0042")).toBe(
      "http://localhost:5173/albums/qatar/?p=IMG_0042",
    );
  });

  it("encodes photo ids", () => {
    expect(shareUrl("https://tours.martykokes.com", "nepal", "a b&c")).toBe(
      "https://tours.martykokes.com/albums/nepal/?p=a+b%26c",
    );
  });
});

describe("shareButton", () => {
  it("escapes the label and carries the url", () => {
    const html = shareButton(
      "https://x.test/albums/a/",
      'Copy link to "A & B"',
      "share-button-icon",
    );
    expect(html).toContain('data-share-url="https://x.test/albums/a/"');
    expect(html).toContain("Copy link to &quot;A &amp; B&quot;");
    expect(html).toContain('class="share-button share-button-icon"');
  });
});

describe("copyText", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the Clipboard API when it works", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when the Clipboard API is refused", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
    });
    const ta = { value: "", style: {}, setAttribute: vi.fn(), select: vi.fn(), remove: vi.fn() };
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal("document", {
      createElement: () => ta,
      body: { append: vi.fn() },
      execCommand,
    });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(ta.value).toBe("hello");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(ta.remove).toHaveBeenCalled();
  });

  it("resolves false when nothing can copy", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", undefined);
    await expect(copyText("hello")).resolves.toBe(false);
  });
});
