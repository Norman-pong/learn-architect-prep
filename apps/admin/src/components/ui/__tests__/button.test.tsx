import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../button";

describe("Button", () => {
  it("renders and handles click", () => {
    const handleClick = vi.fn();

    render(
      <Button variant="default" onClick={handleClick}>
        Click me
      </Button>,
    );

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes", () => {
    const { container } = render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("bg-destructive");
    expect(button?.className).toContain("h-8");
  });
});
