import { computePosition, flip, shift } from "@floating-ui/dom";
import { posToDOMRect, ReactRenderer } from "@tiptap/react";

import { MentionList } from "./MentionList.tsx";

const updatePosition = (editor, element) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to
      ),
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
};

export default {
  items: ({ query }) => {
    return [
      "animations",
      "article",
      "assets",
      "benchmarks",
      "build",
      "design",
      "docs",
      "employment",
      "fonts",
      "guide",
      "icons",
      "inspiration",
      "models",
      "plugins",
      "portfolios",
      "react",
      "tailwind",
      "tools",
      "typography",
      "useful",
    ]
      .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5);
  },

  render: () => {
    let reactRenderer;

    return {
      onStart: (props) => {
        if (!props.clientRect) {
          return;
        }

        reactRenderer = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        reactRenderer.element.style.position = "absolute";

        document.body.appendChild(reactRenderer.element);

        updatePosition(props.editor, reactRenderer.element);
      },

      onUpdate(props) {
        reactRenderer.updateProps(props);

        if (!props.clientRect) {
          return;
        }
        updatePosition(props.editor, reactRenderer.element);
      },

      onKeyDown(props) {
        if (props.event.key === "Escape") {
          reactRenderer.destroy();
          reactRenderer.element.remove();

          return true;
        }

        return reactRenderer.ref?.onKeyDown(props);
      },

      onExit() {
        reactRenderer.destroy();
        reactRenderer.element.remove();
      },
    };
  },
};
