import { forwardRef, useImperativeHandle } from "react";
import { Extension } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Mention from "@tiptap/extension-mention";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { CharacterCount } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";

import suggestion from "./suggestion.js";

interface EditorProps {
  className?: string;
  onSubmit?: (data: { tags: string[]; text: string; comment: string }) => void;
}

export default forwardRef<unknown, EditorProps>(
  ({ className = "", onSubmit }, ref) => {
    const limit = 280;

    const SubmitExtension = Extension.create({
      name: "submitExtension",
      addKeyboardShortcuts() {
        return {
          "Mod-Enter": () => {
            const { state } = this.editor;
            const { doc } = state;

            // Collect all content items in document order
            const items: { type: "text" | "mention"; content: string }[] = [];

            doc.descendants((node) => {
              if (node.type.name === "mention") {
                items.push({ type: "mention", content: node.attrs.id });
              } else if (node.isText && node.text) {
                items.push({ type: "text", content: node.text });
              }
            });

            // Find first and last mention positions
            const firstMentionIdx = items.findIndex(
              (item) => item.type === "mention"
            );
            const lastMentionIdx = items.findLastIndex(
              (item) => item.type === "mention"
            );

            const tags: string[] = [];
            let text = "";
            let comment = "";

            items.forEach((item, idx) => {
              if (item.type === "mention") {
                tags.push(item.content);
              } else if (item.type === "text") {
                if (firstMentionIdx === -1 || idx < firstMentionIdx) {
                  // Text before any mentions
                  text += item.content;
                } else if (idx > lastMentionIdx) {
                  // Text after all mentions
                  comment += item.content;
                }
              }
            });

            onSubmit?.({ tags, text: text.trim(), comment: comment.trim() });
            return true;
          },
        };
      },
    });

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        Document,
        Paragraph,
        Text,

        CharacterCount.configure({
          limit,
        }),
        Mention.configure({
          HTMLAttributes: {
            class:
              "bg-[rgba(88,5,255,0.05)] rounded-[0.4rem] text-[#6a00f5] px-[0.3rem] py-[0.125rem] text-[15.5px] box-decoration-clone motion-opacity-in-0 motion-blur-in-[0.5px] capitalize",
          },
          suggestion,
        }),
        SubmitExtension,
      ],
      autofocus: true,
      editorProps: {
        attributes: {
          class: "focus:outline-none rounded-md w-full",
        },
      },
      content: "",
    });

    useImperativeHandle(ref, () => editor);

    return (
      <div className={className}>
        <EditorContent editor={editor} />
      </div>
    );
  }
);
