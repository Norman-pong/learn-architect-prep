import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function Hello() {
  return <div>hello smoke</div>;
}

describe("button smoke", () => {
  it("renders a simple react element", () => {
    render(<Hello />);
    expect(screen.getByText("hello smoke")).toBeInTheDocument();
  });
});
