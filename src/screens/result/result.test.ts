// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { ResultTicket, type ResultTicketProps } from "./ResultTicket";
import { sampleAssessment, sampleRows } from "./fixtures";
import { SAFETY_TEXT } from "../../ui/SafetyLine";

afterEach(cleanup);
const props: ResultTicketProps = {
  assessment: sampleAssessment,
  rows: sampleRows,
  line: "Sample line",
  readingId: "0417",
  timestamp: "SAT 21 NOV",
  sample: true,
};
function ticket(change: Partial<ResultTicketProps> = {}) {
  return render(
    createElement(
      MemoryRouter,
      null,
      createElement(ResultTicket, { ...props, ...change }),
    ),
  );
}
it("keeps the safety line and ride instruction on a Tipsy ticket", () => {
  ticket({ assessment: { ...sampleAssessment, showSafetyLine: false } });
  expect(screen.getByText(SAFETY_TEXT)).toBeTruthy();
  expect(screen.getByText("Get a ride or ping a friend.")).toBeTruthy();
});
it("shows the safety line on Steady whenever the assessment requests it", () => {
  ticket({
    assessment: {
      ...sampleAssessment,
      verdict: "steady",
      showSafetyLine: true,
    },
  });
  expect(screen.getByText(SAFETY_TEXT)).toBeTruthy();
  expect(document.querySelector(".result-bird--flight")).toBeNull();
});
it("moves the failed flight to Wobbly and disables motion when requested", () => {
  const view = ticket({
    assessment: { ...sampleAssessment, verdict: "wobbly" },
  });
  expect(document.querySelectorAll(".result-wing").length).toBe(2);
  view.rerender(
    createElement(
      MemoryRouter,
      null,
      createElement(ResultTicket, { ...props, animate: false }),
    ),
  );
  expect(document.querySelector(".result-bird--flight")).toBeNull();
  expect(document.querySelector(".k-ticket--print")).toBeNull();
});
it("marks sample traces and renders supplied display values without converting normalized drift", () => {
  ticket();
  expect(screen.getByText("Sample data · animation preview")).toBeTruthy();
  expect(screen.getByText("+42%")).toBeTruthy();
  expect(
    screen.getByRole("img", { name: /Illustrative sample traces/ }),
  ).toBeTruthy();
});

it("gives Steady spread wings and a visual yell", () => {
  ticket({ assessment: { ...sampleAssessment, verdict: "steady" } });
  expect(document.querySelector(".result-bird--steady")).toBeTruthy();
  expect(document.querySelectorAll(".result-wing")).toHaveLength(2);
  expect(document.querySelector(".result-yell")?.textContent).toBe("AAARK!");
});
it("gives Wired its running circle without the failed flight", () => {
  ticket({ assessment: { ...sampleAssessment, verdict: "wired" } });
  expect(document.querySelector(".result-bird--wired")).toBeTruthy();
  expect(document.querySelector(".result-bird--flight")).toBeNull();
});
it("gives Tipsy the grounded sway, sitting and hiccup performance", () => {
  ticket();
  expect(document.querySelector(".result-bird--tipsy")).toBeTruthy();
  expect(document.querySelector(".result-hiccup")).toBeTruthy();
  expect(document.querySelector(".result-bird--flight")).toBeNull();
  expect(document.querySelector(".result-wings")).toBeNull();
});

it("draws the wings behind the body and uses one replacement mouth for Steady", () => {
  ticket({ assessment: { ...sampleAssessment, verdict: "steady" } });
  const bird = document.querySelector(".result-bird")!;
  expect(bird.children[0].classList.contains("result-wings")).toBe(true);
  expect(bird.children[1].classList.contains("k-ibis")).toBe(true);
  expect(bird.querySelectorAll(".result-mouth")).toHaveLength(1);
  expect(bird.querySelector(".result-lower-beak")).toBeNull();
});
